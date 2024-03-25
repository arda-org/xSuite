import { Command } from "commander";
import { log } from "../_stdio";
import { Proxy } from "../proxy/proxy";
import {
  delay,
  findFileRecursive,
  logError,
  promptUserWithRetry,
  readJsonFile,
  regExpSmartContractAddress,
} from "./helpers";

export const registerVerifyReproducibleCmd = (cmd: Command) => {
  cmd
    .command("verify-reproducible")
    .description(
      "Verifies a contract, that has been built in a reproducible way.",
    )
    .option(
      "--dir <DIR>",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .option("--sc <SC>", "The smart contract to be verified")
    .option(
      "--verifier-url <VERIFIIER_URL>",
      `Verifier Url (Default: ${defaultVerifierUrl}`,
    )
    .action(publishReproducible);
};

export const publishReproducible = async ({
  dir,
  sc,
  verifierUrl,
}: {
  dir?: string;
  sc?: string;
  verifierUrl?: string;
}) => {
  dir = dir ?? process.cwd();
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
  await verifyAndWait(verifierUrl, request);
};

const verifyAndWait = async (baseUrl: string, request: any) => {
  const verifierUrl = `${baseUrl}/verifier`;
  log(`Request verification at ${verifierUrl}...`);

  const startTime = new Date().getTime();
  const response = await Proxy.fetchRaw(verifierUrl, request, {
    "Content-Type": "application/json",
  });

  const taskId = response.taskId;
  if (!taskId) {
    throw Error(`Verification failed. Response: ${JSON.stringify(response)}`);
  }

  log(`Verification in process (taskId: ${taskId})...`);
  log("Please wait while we verify your contract. This may take a while.");

  const url = `${baseUrl}/tasks/${taskId}`;
  let oldStatus = "";
  let status = "";

  while (status != "finished") {
    const response = await Proxy.fetchRaw(url);
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

    await delay(5000);
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
