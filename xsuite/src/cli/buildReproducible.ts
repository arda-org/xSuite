import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { cwd, log } from "../context";
import { isDirBuildable } from "./buildCmd";
import {
  getGid,
  getUid,
  logAndRunCommand,
  logError,
  promptUserWithRetry,
} from "./helpers";

const defaultReproducibleDockerImage =
  "multiversx/sdk-rust-contract-builder:v8.0.0";

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
      `Specify the tag of the docker image, that is used to build the contract (e. g. ${defaultReproducibleDockerImage})`,
    )
    .option(
      "--output-dir <OUTPUT_DIR>",
      "Specify the directory where the built artifacts will be saved",
    )
    .option("-r, --recursive", "Build all contracts under the directory")
    .action(buildReproducible);
};

export const buildReproducible = async (
  dirArgument: string | undefined,
  {
    image,
    outputDir,
    recursive,
  }: {
    image?: string;
    outputDir?: string;
    recursive?: boolean;
  },
) => {
  let sourceDir: string;
  if (dirArgument !== undefined) {
    sourceDir = dirArgument;
  } else {
    sourceDir = cwd();
  }
  outputDir = outputDir ?? path.join(cwd(), "output-reproducible");

  if (!image) {
    const promptResult = await askForImage();
    image = promptResult;
  }

  buildContract(image, sourceDir, outputDir, recursive);
};

const buildContract = (
  image: string,
  sourcePath: string,
  outputDir: string,
  recursive?: boolean,
) => {
  log(`Building project ${sourcePath}...`);

  ensureDockerInstalled();
  ensureOutputDirIsEmpty(outputDir);

  if (!recursive) {
    if (!isDirBuildable(sourcePath)) {
      logError("No valid contract found.");
      return;
    }
  }

  // Prepare general docker arguments
  const dockerGeneralArgs: string[] = ["run"];

  const userId = getUid();
  const groupId = getGid();
  if (userId && groupId) {
    dockerGeneralArgs.push("--user", `${userId}:${groupId}`);
  }
  dockerGeneralArgs.push("--rm");

  // Prepare docker arguments related to mounting volumes
  const dockerMountArgs: string[] = ["--volume", `${outputDir}:/output`];

  if (sourcePath) {
    dockerMountArgs.push("--volume", `${sourcePath}:/project`);
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

  const args = [
    ...dockerGeneralArgs,
    ...dockerMountArgs,
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

const ensureOutputDirIsEmpty = (parentOutputDir: fs.PathLike) => {
  if (!fs.existsSync(parentOutputDir)) {
    fs.mkdirSync(parentOutputDir, { recursive: true });
    return;
  }

  const is_empty = fs.readdirSync(parentOutputDir).length === 0;
  if (!is_empty) {
    logError(`output-dir must be empty: ${parentOutputDir}`);
    throw new Error(`output-dir must be empty: ${parentOutputDir}`);
  }
};

const askForImage = () => {
  log("You did not provide '--image <IMAGE>'.");
  log(
    "A build needs to be done inside a Docker image in order to be reproducible.",
  );

  return promptUserWithRetry(
    `Please enter the image to be used (default: ${defaultReproducibleDockerImage}):`,
    defaultReproducibleDockerImage,
    /^\S+:\S+$/,
    "The image needs to have the following format: 'imagename:tag'",
  );
};
