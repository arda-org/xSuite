import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { pkgPath } from "../_pkgPath";
import { log } from "../_stdio";
import { logTitle, logAndRunCommand } from "./helpers";

const repoUrl = "https://github.com/arda-org/xSuite";
const TAG = "v1.4.77";
const BINARY_NAME = "scenexec";

export const testScenAction = async () => {
  logTitle("Testing contract with scenarios...");
  const binaryOs = getBinaryOs();
  const localBinaryName = `${BINARY_NAME}-${binaryOs}-${TAG}`;
  const binaryPath = path.join(pkgPath, "bin", localBinaryName);
  if (!fs.existsSync(binaryPath)) {
    log(`Downloading ${localBinaryName}...`);
    const url = `${repoUrl}/releases/download/${BINARY_NAME}-${TAG}/${BINARY_NAME}-${binaryOs}`;
    await downloadFile(url, binaryPath);
    fs.chmodSync(binaryPath, "755");
  }
  logAndRunCommand(binaryPath, ["."]);
};

const downloadFile = async (url: string, dest: string) => {
  const res = await fetch(url);
  /* istanbul ignore next */
  if (!res.body) throw new Error("No request body.");
  const stream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body as any).pipe(stream));
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
