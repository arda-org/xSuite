import {
  SpawnSyncOptionsWithBufferEncoding,
  spawnSync,
} from "node:child_process";
import chalk from "chalk";
import { log } from "xsuite/_stdio";

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
  if (result.error) {
    throw result.error;
  }
};

export const rustToolchain = "nightly-2023-06-15";

export const rustTarget = "wasm32-unknown-unknown";

export const rustCrate = "multiversx-sc-meta";
