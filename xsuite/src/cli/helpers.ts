import {
  SpawnSyncOptionsWithBufferEncoding,
  spawnSync,
} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import chalk from "chalk";
import { log } from "../_stdio";

export const logTitle = (title: string) => log(chalk.blue(title));

export const logCommand = (command: string) => log(chalk.cyan(command));

export const logSuccess = (text: string) => log(chalk.green(text));

export const logError = (text: string) => log(chalk.red(text));

export const logAndRunCommand = (
  command: string,
  args: string[],
  options?: SpawnSyncOptionsWithBufferEncoding,
) => {
  logCommand(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
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

export const rustToolchain = "nightly-2023-12-11";

export const rustTarget = "wasm32-unknown-unknown";

export const rustKey = `${rustToolchain}-${rustTarget}`;

export const regExpSmartContractAddress = /^erd[a-zA-Z0-9]{59}$/;

export const getUid = () => {
  return process.getuid ? process.getuid() : undefined;
};

export const getGid = () => {
  return process.getgid ? process.getgid() : undefined;
};

export const promptUserWithRetry = async (
  question: string,
  defaultAnswer: string | undefined,
  regex: RegExp,
  invalidInputText?: string,
): Promise<string> => {
  invalidInputText ??= "Invalid input! Please try again.";

  let isValid = false;
  while (!isValid) {
    const userInput = await promptUser(question, defaultAnswer);
    isValid = regex.test(userInput ?? "");
    if (!isValid) {
      logError(invalidInputText);
    } else {
      return userInput ?? "";
    }
  }

  throw Error();
};

export const promptUser = (
  question: string,
  defaultAnswer?: string,
): Promise<string | undefined> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      rl.close();
      let response = answer.length === 0 ? defaultAnswer : answer;
      response = response?.trim();
      resolve(response);
    });
  });
};

export const readJsonFile = (filename: string | path.ParsedPath): any => {
  const filePath =
    typeof filename === "string" ? filename : path.format(filename);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

export const findFileRecursive = (
  directoryPath: string,
  filePattern: RegExp,
): string | null => {
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      const foundFilePath = findFileRecursive(filePath, filePattern);
      if (foundFilePath) {
        return foundFilePath;
      }
    } else if (filePattern.test(file)) {
      return filePath;
    }
  }

  return null;
};

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
