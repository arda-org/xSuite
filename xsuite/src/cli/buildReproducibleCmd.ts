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
    .action(action);
};

const action = (
  dirArgument: string | undefined,
  {
    image,
    recursive,
    delete: deleteOutputDir,
  }: {
    image?: string;
    recursive?: boolean;
    delete?: boolean;
  },
) => {
  let dir: string;
  if (dirArgument !== undefined) {
    dir = path.resolve(dirArgument);
  } else {
    dir = cwd();
  }

  if (!image) {
    logError("You did not provide '--image <IMAGE>'.");
    logError(
      `A build needs to be done inside a Docker image in order to be reproducible. (e.g. ${defaultReproducibleDockerImage})`,
    );
    return;
  }

  let contract: string | undefined;
  if (recursive) {
    log(`Building contract(s) in "${dir}"...`);
  } else {
    contract = findContractName(dir);
    if (!contract) {
      logError("No contract to build.");
      return;
    }
    log(`Building contract "${contract}"...`);
  }

  if (process.getuid === undefined) {
    logError("getuid is not defined.");
    return;
  }
  if (process.getgid === undefined) {
    logError("getgid is not defined.");
    return;
  }

  const mountedOutputDir = path.join(dir, "output-reproducible");
  const mountedTemporaryRoot = "/tmp/multiversx_sdk_rust_contract_builder";
  const mountedRustCargoTargetDir = `${mountedTemporaryRoot}/rust-cargo-target-dir`;
  const mountedRustRegistry = `${mountedTemporaryRoot}/rust-registry`;
  const mountedRustGit = `${mountedTemporaryRoot}/rust-git`;

  if (deleteOutputDir) {
    fs.rmSync(mountedOutputDir, { recursive: true, force: true });
  }
  // Create dirs ourselves because Docker fails to create them
  fs.mkdirSync(mountedOutputDir, { recursive: true });
  fs.mkdirSync(mountedRustCargoTargetDir, { recursive: true });
  fs.mkdirSync(mountedRustRegistry, { recursive: true });
  fs.mkdirSync(mountedRustGit, { recursive: true });

  // Prepare general Docker arguments
  const dockerArgs = [
    "run",
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--rm",
  ];

  // Prepare Docker arguments related to mounting volumes
  dockerArgs.push(
    "--volume",
    `${mountedOutputDir}:/output`,
    "--volume",
    `${dir}:/project`,
    "--volume",
    `${mountedRustCargoTargetDir}:/rust/cargo-target-dir`,
    "--volume",
    `${mountedRustRegistry}:/rust/registry`,
    "--volume",
    `${mountedRustGit}:/rust/git`,
  );

  dockerArgs.push(image);

  // Prepare image entrypoint arguments
  dockerArgs.push("--project", "project");
  if (contract) {
    dockerArgs.push("--contract", contract);
  }

  logAndRunCommand("docker", dockerArgs);
};

const findContractName = (sourceDir: string) => {
  let content: string | undefined;
  try {
    content = fs.readFileSync(`${sourceDir}/Cargo.toml`, "utf8");
  } catch {
    return;
  }
  return toml.parse(content)?.package?.name;
};

const defaultReproducibleDockerImage =
  "multiversx/sdk-rust-contract-builder:v8.0.0";
