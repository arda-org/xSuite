import { spawnSync } from "node:child_process";
import readline from "node:readline";
import chalk from "chalk";

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
