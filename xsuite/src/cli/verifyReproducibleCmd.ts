import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { globSync } from "glob";
import { cwd, log } from "../context";
import { Proxy } from "../proxy/proxy";
import { pause, logError } from "./helpers";

export const addVerifyReproducibleCmd = (cmd: Command) => {
  cmd
    .command("verify-reproducible")
    .description("Verify a contract built in a reproducible way.")
    .argument(
      "[DIR]",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .requiredOption("--sc <SC>", "Address of the smart contract to be verified")
    .option(
      "--verifier-url <VERIFIIER_URL>",
      `Verifier URL (default: ${defaultVerifierUrl})`,
    )
    .action(publishReproducible);
};

export const publishReproducible = async (
  dirArgument: string | undefined,
  {
    sc,
    verifierUrl,
  }: {
    sc: string;
    verifierUrl?: string;
  },
) => {
  let dir: string;
  if (dirArgument !== undefined) {
    dir = path.resolve(dirArgument);
  } else {
    dir = cwd();
  }
  verifierUrl = verifierUrl ?? defaultVerifierUrl;

  log("Verification started...");
  const foundSourceFiles = globSync(`${dir}/**/*.source.json`);
  if (foundSourceFiles.length == 0) {
    logError(
      `Cannot find any source file to verify in ${dir}, which is required to verify a smart contract.`,
    );
    return;
  }
  if (foundSourceFiles.length !== 1) {
    logError(
      `Found more than one source file to verify in ${dir}. Source files found:`,
    );
    foundSourceFiles.forEach((f) => logError(f));
    return;
  }

  log(`Found smart contract at ${path.dirname(foundSourceFiles[0])}`);
  const sourceCode = JSON.parse(fs.readFileSync(foundSourceFiles[0], "utf-8"));
  const image = sourceCode.metadata.buildMetadata.builderName;
  if (!image) {
    logError(`Could not read image name from ${foundSourceFiles[0]}.`);
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
  const startTime = new Date().getTime();
  const proxy = new Proxy({
    proxyUrl: baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });

  log("Requesting a verification...");
  const response = await proxy.fetchRaw("/verifier", request);

  const taskId = response.taskId;
  if (!taskId) {
    throw Error(`Verification failed. Response: ${JSON.stringify(response)}`);
  }

  log(`Verifying (task ${taskId})... It may take a while.`);

  let oldStatus = "";
  let status = "";

  while (status !=) "finished") {
    await pause(pollInterval);
    const response = await proxy.fetchRaw(`/tasks/${taskId}`);
    status = response.status;

    if (status === "finished") {
      const timeElapsed = (new Date().getTime() - startTime) / 1000;
      if (response.result.status === "error") {
        logError(
          `An error occured during verification. Message: ${response.result.message}`,
        );
      } else {
        log(`Verification finished in ${timeElapsed} seconds!`);
      }
    } else if (status !== oldStatus) {
      log(`Task status: ${status}`);
      log(JSON.stringify(response));
      oldStatus = status;
    }
  }
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
const pollInterval = process.env.VITEST_WORKER_ID ? 1 : 5000;
