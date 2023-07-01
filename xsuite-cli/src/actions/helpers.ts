import { spawnSync } from "node:child_process";
import chalk from "chalk";
import { log } from "xsuite/dist/stdio";

export const logTitle = (title: string) => log(chalk.green(title));

export const runCommand = (command: string, args: string[]) => {
  log(chalk.blue(`> ${command} ${args.join(" ")}`));
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.error) {
    throw result.error;
  }
};
