import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import tar from "tar";
import { pkgPath } from "../_pkg";
import { log } from "../context";
import { logTitle, logAndRunCommand, downloadArchive } from "./helpers";

export const addTestScenCmd = (cmd: Command) => {
  cmd
    .command("test-scen")
    .description("Test contract with scenarios.")
    .action(action);
};

const repoUrl = "https://github.com/arda-org/xSuite";
const TAG = "v1.5.22";
const BINARY_NAME = "scenexec";

const action = async () => {
  logTitle("Testing contract with scenarios...");
  const binaryOs = getBinaryOs();
  const localBinaryName = `${BINARY_NAME}-${TAG}-${binaryOs}`;
  const extractPath = path.join(pkgPath, "bin", localBinaryName);
  const binaryPath = path.join(extractPath, BINARY_NAME);
  if (!fs.existsSync(binaryPath)) {
    log(`Downloading ${localBinaryName}...`);
    fs.mkdirSync(extractPath);
    const url = `${repoUrl}/releases/download/${BINARY_NAME}-${TAG}/${localBinaryName}.tar.gz`;
    const archivePath = await downloadArchive(url);
    await tar.x({ file: archivePath, strip: 1, cwd: extractPath });
    fs.unlinkSync(archivePath);
    fs.chmodSync(binaryPath, "755");
  }
  logAndRunCommand(binaryPath, ["."]);
};

function getBinaryOs() {
  switch (process.platform) {
    case "linux":
      return "ubuntu-20.04";
    /* istanbul ignore next */
    case "darwin":
      return "macos-12";
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
