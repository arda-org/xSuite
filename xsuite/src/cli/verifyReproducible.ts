import path from "node:path";
import { Command } from "commander";
import { cwd, log } from "../context";
import { Proxy } from "../proxy/proxy";
import {
  delay,
  findFileRecursive,
  logError,
  promptUserWithRetry,
  readJsonFile,
  regExpSmartContractAddress,
} from "./helpers";

export const addVerifyReproducibleCmd = (cmd: Command) => {
  cmd
    .command("verify-reproducible")
    .description(
      "Verifies a contract, that has been built in a reproducible way.",
    )
    .argument(
      "[DIR]",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .option("--sc <SC>", "The smart contract to be verified")
    .option(
      "--verifier-url <VERIFIIER_URL>",
      `Verifier Url (Default: ${defaultVerifierUrl}`,
    )
    .option<number>(
      "--poll-delay <POLL_DELAY>",
      "Delay between each poll request, that goes to the mvx api (default: 5000)",
      parseInt,
      5000,
    )
    .action(publishReproducible);
};

export const publishReproducible = async (
  dirArgument: string | undefined,
  {
    sc,
    verifierUrl,
    pollDelay,
  }: {
    sc?: string;
    verifierUrl?: string;
    pollDelay: number;
  },
) => {
  let dir: string;
  if (dirArgument !== undefined) {
    dir = dirArgument;
  } else {
    dir = cwd();
  }
  verifierUrl = verifierUrl ?? defaultVerifierUrl;

  if (sc && !regExpSmartContractAddress.test(sc)) {
    logError("The smart contract address you passed is invalid. Aborting...");
    return;
  }

  if (!sc) {
    const promptResult = await askForSmartContract();
    sc = promptResult;
  }

  log("Verification started...");
  const sourceCodePath = findFileRecursive(dir, /^.+\.source\.json$/);
  if (!sourceCodePath) {
    logError(
      `Cannot find sourcecode file to verify in ${dir}, which is required to verify a smart contract.`,
    );
    return;
  }

  log(`Found smart contract at ${path.dirname(sourceCodePath)}`);
  const sourceCode = readJsonFile(sourceCodePath);
  const image = sourceCode.metadata.buildMetadata.builderName;
  if (!image) {
    logError(`Could not read image name from ${sourceCodePath}.`);
    return;
  }

  log(`Smart contract was built with image: ${image}.`);
  const request = new ContractVerificationRequest(
    sc,
    sourceCode,
    "",
    image,
  ).toDictionary();
  await verifyAndWait(verifierUrl, request, pollDelay);
};

const verifyAndWait = async (
  baseUrl: string,
  request: any,
  pollDelay: number,
) => {
  const startTime = new Date().getTime();
  const proxy = new Proxy({
    proxyUrl: baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });

  log("Requesting verification...");
  const response = await proxy.fetchRaw("/verifier", request);

  const taskId = response.taskId;
  if (!taskId) {
    throw Error(`Verification failed. Response: ${JSON.stringify(response)}`);
  }

  log(`Verification in process (taskId: ${taskId})...`);
  log("Please wait while we verify your contract. This may take a while.");

  let oldStatus = "";
  let status = "";

  while (status != "finished") {
    const response = await proxy.fetchRaw(`/tasks/${taskId}`);
    status = response.status;

    if (status == "finished") {
      const timeElapsed = (new Date().getTime() - startTime) / 1000;
      if (response.result.status === "error") {
        logError(
          `An error occured during verification. Message: ${response.result.message}`,
        );
      } else {
        log(`Verification finished in ${timeElapsed} seconds!`);
      }
      return;
    } else if (status != oldStatus) {
      log(`Task status: ${status}`);
      log(JSON.stringify(response));
      oldStatus = status;
    }

    await delay(pollDelay);
  }
};

const askForSmartContract = () => {
  log(
    "You are trying to verify a smart contract, but did't provide a smart contract using '--sc <SC>.",
  );

  return promptUserWithRetry(
    "Please enter a smart contract address:",
    undefined,
    regExpSmartContractAddress,
    "Invalid smart contract address",
  );
};

class ContractVerificationRequest {
  contractAddress: string;
  sourceCode: any;
  signature: string;
  dockerImage: string;
  contractVariant?: string | null;

  constructor(
    contractAddress: string,
    sourceCode: any,
    signature: string,
    dockerImage: string,
    contractVariant?: string | null,
  ) {
    this.contractAddress = contractAddress;
    this.sourceCode = sourceCode;
    this.signature = signature;
    this.dockerImage = dockerImage;
    this.contractVariant = contractVariant;
  }

  toDictionary(): any {
    return {
      signature: this.signature,
      payload: {
        contract: this.contractAddress,
        dockerImage: this.dockerImage,
        sourceCode: this.sourceCode,
        contractVariant: this.contractVariant,
      },
    };
  }
}

const defaultVerifierUrl = "https://devnet-play-api.multiversx.com";
