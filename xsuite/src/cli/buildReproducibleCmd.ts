import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { cwd, log } from "../context";
import { logAndRunCommand, logError } from "./helpers";

export const addBuildReproducibleCmd = (cmd: Command) => {
  cmd
    .command("build-reproducible")
    .description("Build contract in a reproducible way.")
    .argument(
      "[DIR]",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .option(
      "--image <IMAGE_TAG>",
      `Docker image used to build the contract (e.g. ${defaultReproducibleDockerImage})`,
    )
    .option("--contract <CONTRACT>", "Contract to be built")
    .option("-r, --recursive", "Build all contracts under the directory")
    .option(
      "-d, --delete",
      "Delete the output directory in case it already exists.",
    )
    .option(
      "--output-dir <OUTPUT_DIR>",
      "Directory where the build artifacts will be saved (default: [DIR]/output-reproducible)",
    )
    .action(action);
};

const action = async (
  dirArgument: string | undefined,
  {
    image,
    contract,
    recursive,
    delete: deleteOutputDir,
    outputDir,
  }: {
    image?: string;
    contract?: string;
    recursive?: boolean;
    delete?: boolean;
    outputDir?: string;
  },
) => {
  let sourceDir: string;
  if (dirArgument !== undefined) {
    sourceDir = path.resolve(dirArgument);
  } else {
    sourceDir = cwd();
  }
  outputDir = outputDir ?? path.join(sourceDir, "output-reproducible");

  if (!image) {
    logError("You did not provide '--image <IMAGE>'.");
    logError(
      `A build needs to be done inside a Docker image in order to be reproducible. (e.g. ${defaultReproducibleDockerImage})`,
    );
    return;
  }

  if (!recursive && !contract) {
    logError("Either --recursive or --contract has to be provided");
    return;
  }

  ensureEmptyOutputDir(outputDir, deleteOutputDir);

  log(`Building... (${sourceDir})`);

  // Prepare general docker arguments
  const dockerGeneralArgs: string[] = ["run"];

  const userId = process.getuid?.();
  const groupId = process.getgid?.();
  if (userId && groupId) {
    dockerGeneralArgs.push("--user", `${userId}:${groupId}`);
  }
  dockerGeneralArgs.push("--rm");

  // Prepare docker arguments related to mounting volumes
  const dockerMountArgs: string[] = ["--volume", `${outputDir}:/output`];

  if (sourceDir) {
    dockerMountArgs.push("--volume", `${sourceDir}:/project`);
  }

  const mountedTemporaryRoot = "/tmp/multiversx_sdk_rust_contract_builder";
  const mountedCargoTargetDir = `${mountedTemporaryRoot}/cargo-target-dir`;
  const mountedCargoRegistry = `${mountedTemporaryRoot}/cargo-registry`;
  const mountedCargoGit = `${mountedTemporaryRoot}/cargo-git`;

  // permission fix. does not work, when we let docker create these volumes.
  if (!fs.existsSync(mountedTemporaryRoot)) {
    fs.mkdirSync(mountedCargoTargetDir, { recursive: true });
    fs.mkdirSync(mountedCargoRegistry, { recursive: true });
    fs.mkdirSync(mountedCargoGit, { recursive: true });
  }

  dockerMountArgs.push(
    "--volume",
    `${mountedCargoTargetDir}:/rust/cargo-target-dir`,
  );
  dockerMountArgs.push("--volume", `${mountedCargoRegistry}:/rust/registry`);
  dockerMountArgs.push("--volume", `${mountedCargoGit}:/rust/git`);

  // Prepare entrypoint arguments
  const entrypointArgs: string[] = [];
  entrypointArgs.push("--project", "project");
  if (contract) {
    entrypointArgs.push("--contract", contract);
  }

  const args = [
    ...dockerGeneralArgs,
    ...dockerMountArgs,
    image,
    ...entrypointArgs,
  ];

  logAndRunCommand("docker", args);
};

const ensureEmptyOutputDir = (
  outputDir: fs.PathLike,
  deleteOutputDir: boolean | undefined,
) => {
  if (deleteOutputDir) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  fs.mkdirSync(outputDir, { recursive: true });
};

const defaultReproducibleDockerImage =
  "multiversx/sdk-rust-contract-builder:v8.0.0";
