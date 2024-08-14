import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import * as toml from "toml";
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
    recursive,
    delete: deleteOutputDir,
    outputDir,
  }: {
    image?: string;
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

  let contract;
  if (recursive) {
    log(`Building contract(s) in "${sourceDir}"...`);
  } else {
    contract = findContract(sourceDir);
    if (!contract) {
      logError("No contract was found to build.");
      return;
    }

    log(`Building contract "${contract}"...`);
  }

  ensureEmptyOutputDir(outputDir, deleteOutputDir);

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
  dockerMountArgs.push("--volume", `${sourceDir}:/project`);

  const mountedTemporaryRoot = "/tmp/multiversx_sdk_rust_contract_builder";
  const mountedRustCargoTargetDir = `${mountedTemporaryRoot}/rust-cargo-target-dir`;
  const mountedRustRegistry = `${mountedTemporaryRoot}/rust-registry`;
  const mountedRustGit = `${mountedTemporaryRoot}/rust-git`;

  // permission fix. does not work, when we let docker create these volumes.
  fs.mkdirSync(mountedRustCargoTargetDir, { recursive: true });
  fs.mkdirSync(mountedRustRegistry, { recursive: true });
  fs.mkdirSync(mountedRustGit, { recursive: true });

  dockerMountArgs.push(
    "--volume",
    `${mountedRustCargoTargetDir}:/rust/cargo-target-dir`,
  );
  dockerMountArgs.push("--volume", `${mountedRustRegistry}:/rust/registry`);
  dockerMountArgs.push("--volume", `${mountedRustGit}:/rust/git`);

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

const findContract = (sourceDir: string) => {
  if (!fs.existsSync(`${sourceDir}/Cargo.toml`)) {
    return undefined;
  }

  const cargoToml = toml.parse(
    fs.readFileSync(`${sourceDir}/Cargo.toml`, "utf-8"),
  );
  return cargoToml.package.name;
};

const defaultReproducibleDockerImage =
  "multiversx/sdk-rust-contract-builder:v8.0.0";
