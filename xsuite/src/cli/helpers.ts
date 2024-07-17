import {
  SpawnSyncOptionsWithBufferEncoding,
  spawnSync,
} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import chalk from "chalk";
import { cwd, log } from "../context";

export const logTitle = (title: string) => log(chalk.blue(title));

export const logCommand = (command: string) => log(chalk.cyan(command));

export const logSuccess = (text: string) => log(chalk.green(text));

export const logError = (text: string) => log(chalk.red(text));

export const logWarning = (text: string) => log(chalk.yellow(text));

export const logAndRunCommand = (
  command: string,
  args: string[],
  options?: SpawnSyncOptionsWithBufferEncoding,
) => {
  logCommand(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    cwd: cwd(),
    ...options,
  });
  /* istanbul ignore next */
  if (result.status !== 0) {
    logError(`Command failed with exit code ${result.status}.`);
    process.exit(1);
  }
};

export const downloadArchive = async (url: string) => {
  const archivePath = path.join(os.tmpdir(), `xSuite-archive-${Date.now()}`);
  const stream = fs.createWriteStream(archivePath);
  const { body } = await fetch(url);
  if (!body) {
    throw new Error("No body.");
  }
  await finished(Readable.fromWeb(body as any).pipe(stream));
  return archivePath;
};

export const defaultRustToolchain = "1.79.0";

export const rustTarget = "wasm32-unknown-unknown";

export const rustKey = `${defaultRustToolchain}-${rustTarget}`;
