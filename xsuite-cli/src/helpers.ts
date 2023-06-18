import { spawnSync } from "node:child_process";
import chalk from "chalk";

export const logTitle = (title: string) => console.log(chalk.green(title));

export const runCommand = (command: string, args: string[]) => {
  console.log(chalk.blue(`> ${command} ${args.join(" ")}`));
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.error) {
    throw result.error;
  }
};
