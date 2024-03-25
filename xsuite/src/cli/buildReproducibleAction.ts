import { PathLike, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { log } from "../_stdio";
import {
  getGid,
  getUid,
  logAndRunCommand,
  logError,
  promptUserWithRetry,
} from "./helpers";

const defaultReproducibleDockerImage =
  "multiversx/sdk-rust-contract-builder:v6.1.1";

export const registerBuildReproducibleCmd = (cmd: Command) => {
  cmd
    .command("build-reproducible")
    .description("Build contract in a reproducible way.")
    .option(
      "--image <IMAGE_TAG>",
      "Specify the tag of the docker image, that is used to build the contract (e. g. multiversx/sdk-rust-contract-builder:v6.1.0)",
    )
    .option(
      "--dir <DIR>",
      "Directory in which the command is executed (default: $(PWD))",
    )
    .option(
      "--output-dir <OUTPUT_DIR>",
      "Specify the directory where the built artifacts will be saved",
    )
    .option(
      "--no-docker-interactive",
      "Do not use interactive mode for Docker",
      true,
    )
    .option("--no-docker-tty", "Do not allocate a pseudo-TTY for Docker", true)
    .option("--no-wasm-opt", "Do not optimize wasm files after the build", true)
    .option(
      "--cargo-verbose",
      "Set 'CARGO_TERM_VERBOSE' environment variable",
      false,
    )
    .action(buildReproducible);
};

export const buildReproducible = async ({
  image,
  dir,
  outputDir,
  dockerInteractive,
  dockerTty,
  wasmOpt,
  cargoVerbose,
}: {
  image?: string;
  dir?: string;
  outputDir?: string;
  dockerInteractive: boolean;
  dockerTty: boolean;
  wasmOpt: boolean;
  cargoVerbose: boolean;
}) => {
  const sourceDir = dir ?? process.cwd();
  outputDir = outputDir ?? path.join(process.cwd(), "target");

  if (!image) {
    const promptResult = await askForImage();
    image = promptResult;
  }

  buildContract(
    image,
    sourceDir,
    outputDir,
    dockerInteractive,
    dockerTty,
    wasmOpt,
    cargoVerbose,
  );
};

const buildContract = (
  image: string,
  sourcePath: string,
  targetPath: string,
  dockerInteractive: boolean,
  dockerTty: boolean,
  wasmOpt: boolean,
  cargoVerbose: boolean,
) => {
  log(`Building project ${sourcePath}...`);

  ensureDockerInstalled();
  ensureOutputDirIsEmpty(targetPath);

  // Prepare general docker arguments
  const dockerGeneralArgs: string[] = ["run"];
  if (dockerInteractive) {
    dockerGeneralArgs.push("--interactive");
  }
  if (dockerTty) {
    dockerGeneralArgs.push("--tty");
  }

  const userId = getUid();
  const groupId = getGid();
  if (userId && groupId) {
    dockerGeneralArgs.push("--user", `${userId}:${groupId}`);
  }
  dockerGeneralArgs.push("--rm");

  // Prepare docker arguments related to mounting volumes
  const dockerMountArgs: string[] = ["--volume", `${targetPath}:/output`];

  if (sourcePath) {
    dockerMountArgs.push("--volume", `${sourcePath}:/project`);
  }

  const mountedTemporaryRoot = "/tmp/multiversx_sdk_rust_contract_builder";
  const mountedCargoTargetDir = `${mountedTemporaryRoot}/cargo-target-dir`;
  const mountedCargoRegistry = `${mountedTemporaryRoot}/cargo-registry`;
  const mountedCargoGit = `${mountedTemporaryRoot}/cargo-git`;

  // permission fix. does not work, when we let docker create these volumes.
  if (!existsSync(mountedTemporaryRoot)) {
    mkdirSync(mountedCargoTargetDir, { recursive: true });
    mkdirSync(mountedCargoRegistry, { recursive: true });
    mkdirSync(mountedCargoGit, { recursive: true });
  }

  dockerMountArgs.push(
    "--volume",
    `${mountedCargoTargetDir}:/rust/cargo-target-dir`,
  );
  dockerMountArgs.push("--volume", `${mountedCargoRegistry}:/rust/registry`);
  dockerMountArgs.push("--volume", `${mountedCargoGit}:/rust/git`);

  const dockerEnvArgs: string[] = [
    "--env",
    `CARGO_TERM_VERBOSE=${cargoVerbose.toString().toLowerCase()}`,
  ];

  // Prepare entrypoint arguments
  const entrypointArgs: string[] = [];
  entrypointArgs.push("--project", "project");

  if (!wasmOpt) {
    entrypointArgs.push("--no-wasm-opt");
  }

  const args = [
    ...dockerGeneralArgs,
    ...dockerMountArgs,
    ...dockerEnvArgs,
    `${image}`,
    ...entrypointArgs,
  ];

  log("Running docker...");
  logAndRunCommand("docker", args);
  log(`Reproducible build succeeded for ${sourcePath}...`);
};

const ensureDockerInstalled = () => {
  logAndRunCommand("command", ["-v", "docker"]);
};

const ensureOutputDirIsEmpty = (parentOutputDir: PathLike) => {
  if (!existsSync(parentOutputDir)) {
    mkdirSync(parentOutputDir, { recursive: true });
    return;
  }

  const is_empty = readdirSync(parentOutputDir).length === 0;
  if (!is_empty) {
    logError(`output-dir must be empty: ${parentOutputDir}`);
    throw new Error(`output-dir must be empty: ${parentOutputDir}`);
  }
};

const askForImage = () => {
  log(`You did't provide '--image <IMAGE>
  
  When building smart contracts in a reproducible mann1er, we rely on frozen Docker images.
  
  MultiversX offers a default image for this purpose (multiversx/sdk-rust-contract-builder), but you can also build and use your own images.
  `);

  return promptUserWithRetry(
    `Please enter the image (default: ${defaultReproducibleDockerImage}):`,
    defaultReproducibleDockerImage,
    /^\S+:\S+$/,
    "The image needs to have the following format: 'imagename:tag'",
  );
};
