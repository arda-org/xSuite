import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { globSync } from "glob";
import { cwd, log } from "../context";
import { pause, logError } from "./helpers";

export const addVerifyReproducibleCmd = (cmd: Command) => {
  cmd
    .command("verify-reproducible")
    .description("Verify a contract built in a reproducible way.")
    .argument(
      "[DIR]",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .requiredOption(
      "--address <ADDRESS>",
      "Address of the smart contract to be verified",
    )
    .requiredOption(
      "--chain <CHAIN>",
      `Chain of the smart contract to be verified (${chainsStr})`,
    )
    .action(action);
};

const action = async (
  dirArgument: string | undefined,
  { address, chain }: { address: string; chain: string },
) => {
  let dir: string;
  if (dirArgument !== undefined) {
    dir = path.resolve(dirArgument);
  } else {
    dir = cwd();
  }

  if (!isValidChain(chain)) {
    logError("Unknown chain.");
    return;
  }
  const verifierUrl = verifierUrls[chain];

  const sourceFiles = globSync(`${dir}/**/*.source.json`);
  if (sourceFiles.length == 0) {
    logError(`No file of type *.source.json found in "${dir}".`);
    return;
  }
  if (sourceFiles.length !== 1) {
    logError(
      `More than one file of type *.source.json found in "${dir}": ${sourceFiles.map(
        (f) => `\n- ${f}`,
      )}`,
    );
    return;
  }

  const sourceFile = sourceFiles[0];
  log(`Source file found: "${sourceFile}".`);

  const sourceCode = JSON.parse(fs.readFileSync(sourceFile, "utf-8"));
  const image = sourceCode?.metadata?.buildMetadata?.builderName;
  console.log(sourceCode, image);
  if (!image) {
    logError(`No image name found in "${sourceFile}".`);
    return;
  }

  log(`Image used for the reproducible build: ${image}.`);
  const startTime = new Date().getTime();

  log("Requesting a verification...");
  const requestRes = await fetch(`${verifierUrl}/verifier`, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signature: "",
      payload: {
        contract: address,
        dockerImage: image,
        sourceCode,
        contractVariant: null,
      },
    }),
  }).then((r) => r.json());

  const taskId = requestRes.taskId;
  if (!taskId) {
    logError(
      `Verification request failed. Response: ${JSON.stringify(requestRes)}`,
    );
    return;
  }

  log(`Verification (task ${taskId})... It may take a while.`);

  let verifRes: any = {};
  let oldStatus = "";

  while (verifRes.status !== "finished") {
    await pause(pollInterval);
    verifRes = await fetch(`${verifierUrl}/tasks/${taskId}`).then((r) =>
      r.json(),
    );
    if (verifRes.status !== oldStatus) {
      log(JSON.stringify(verifRes));
    }
    oldStatus = verifRes.status;
  }

  const timeElapsed = (new Date().getTime() - startTime) / 1000;
  if (verifRes.result.status === "error") {
    logError(
      `An error occured during verification. Message: ${verifRes.result.message}`,
    );
  } else {
    log(`Verification finished in ${timeElapsed} seconds!`);
  }
};

const isValidChain = (chain: string): chain is keyof typeof verifierUrls =>
  chain in verifierUrls;

const verifierUrls = {
  devnet: "https://devnet-play-api.multiversx.com",
  testnet: "https://testnet-play-api.multiversx.com",
  mainnet: "https://play-api.multiversx.com",
} as const;

const chainsStr = Object.keys(verifierUrls)
  .map((c) => `"${c}"`)
  .join(", ");

const pollInterval = process.env.VITEST_WORKER_ID ? 1 : 5000;
