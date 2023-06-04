import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { cwd, downloadAndExtractContract } from "./helpers";

export const contractNewAction = async ({ dir }: { dir: string }) => {
  console.log("Creating a new blank contract...");
  const contract = "blank";
  const dirPath = path.resolve(cwd, dir);
  if (fs.existsSync(dirPath)) {
    console.log(chalk.red(`Contract already exists at ${dirPath}`));
    return;
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  await downloadAndExtractContract(dirPath, contract);
  console.log(chalk.green(`Contract created at ${dirPath}`));
};
