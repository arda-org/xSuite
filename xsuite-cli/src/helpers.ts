import { spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import stream from "node:stream";
import util from "node:util";
import chalk from "chalk";
import tar from "tar";

export const cwd = process.env["INIT_CWD"] ?? process.cwd();

export const downloadAndExtractContract = async (
  cwd: string,
  contract: string
) => {
  const file = await downloadTar(
    "https://codeload.github.com/arda-org/xSuite.js/tar.gz/main"
  );
  await tar.x({
    file,
    cwd,
    strip: 2 + contract.split("/").length,
    filter: (p) => p.includes(`xSuite.js-main/contracts/${contract}/`),
  });
  fs.unlinkSync(file);
};

const pipeline = util.promisify(stream.Stream.pipeline);

const downloadTar = (url: string) => {
  const file = path.join(os.tmpdir(), `xSuite.js-contract-${Date.now()}`);
  return new Promise<string>((resolve, reject) => {
    https
      .get(url, (response) => {
        pipeline(response, fs.createWriteStream(file))
          .then(() => resolve(file))
          .catch(reject);
      })
      .on("error", reject);
  });
};

export const inputHidden = async (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    const onData = (char: string | Buffer) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdin.off("data", onData);
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(query + Array(rl.line.length + 1).join("*"));
          break;
      }
    };

    process.stdin.on("data", onData);

    rl.question(query, resolve);
  });
  rl.close();
  return answer;
};

export const runCommand = (command: string, args: string[], title: string) => {
  console.log(chalk.green(`\n${title}`));
  console.log(chalk.blue(`> ${command} ${args.join(" ")}`));
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    cwd,
  });
  if (result.error) {
    throw result.error;
  }
};
