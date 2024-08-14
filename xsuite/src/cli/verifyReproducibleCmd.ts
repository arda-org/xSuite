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
    .requiredOption("--sc <SC>", "Address of the smart contract to be verified")
    .option(
      "--verifier-url <VERIFIIER_URL>",
      `Verifier URL (default: ${defaultVerifierUrl})`,
    )
    .action(action);
};

const action = async (
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

  const foundSourceFiles = globSync(`${dir}/**/*.source.json`);
  if (foundSourceFiles.length == 0) {
    logError(`No file of type *.source.json found in "${dir}".`);
    return;
  }
  if (foundSourceFiles.length !== 1) {
    logError(
      `More than one file of type *.source.json found in "${dir}": ${foundSourceFiles.map(
        (f) => `\n- ${f}`,
      )}`,
    );
    return;
  }

  const sourceFile = foundSourceFiles[0];
  log(`Source file found: "${sourceFile}".`);

  const sourceCode = JSON.parse(fs.readFileSync(sourceFile, "utf-8"));
  const image = sourceCode?.metadata?.buildMetadata?.builderName;
  if (!image) {
    logError(`No image name found in "${sourceFile}".`);
    return;
  }

  log(`Image used for the reproducible build: ${image}.`);
  const startTime = new Date().getTime();

  log("Requesting a verification...");
  const response = await fetch(`${verifierUrl}/verifier`, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signature: "",
      payload: {
        contract: sc,
        dockerImage: image,
        sourceCode,
        contractVariant: null,
      },
    }),
  }).then((r) => r.json());

  const taskId = response.taskId;
  if (!taskId) {
    logError(`Verification failed. Response: ${JSON.stringify(response)}`);
    return;
  }

  log(`Verifying (task ${taskId})... It may take a while.`);

  let oldStatus = "";
  let status = "";

  while (status !== "finished") {
    await pause(pollInterval);
    const response = await fetch(`${verifierUrl}/tasks/${taskId}`, {
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());

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

const defaultVerifierUrl = "https://devnet-play-api.multiversx.com";
const pollInterval = process.env.VITEST_WORKER_ID ? 1 : 5000;
