import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import * as tar from "tar";
import { cwd, log } from "../context";
import {
  logTitle,
  logAndRunCommand,
  logCommand,
  logError,
  downloadArchive,
  logWarning,
} from "./helpers";

export const addNewCmd = (cmd: Command) => {
  cmd
    .command("new")
    .description("Create a new blank contract.")
    .argument("[DIR]", "Contract dir")
    .option("--dir <DIR>", "[DEPRECATED] Contract dir")
    .option("--starter <STARTER>", "Contract to start from")
    .option("--no-install", "Skip package installation")
    .option("--no-git", "Skip git initialization")
    .action(action);
};

const action = async (
  dirArgument: string | undefined,
  {
    dir: dirOption,
    starter = "blank",
    install,
    git,
  }: {
    dir?: string;
    starter?: string;
    install?: boolean;
    git?: boolean;
  },
) => {
  let dirPath: string;
  if (dirArgument !== undefined) {
    if (dirOption !== undefined) {
      logError(
        "Cannot use both the DIR argument and the --dir option. You should use only the DIR argument as the --dir option is deprecated.",
      );
      return;
    }
    dirPath = dirArgument;
  } else if (dirOption !== undefined) {
    logWarning(
      "The --dir option is deprecated, you should use the DIR argument instead.",
    );
    dirPath = dirOption;
  } else {
    logError("The DIR argument is required.");
    return;
  }
  const absDirPath = path.resolve(cwd(), dirPath);
  if (fs.existsSync(absDirPath)) {
    logError(`Directory already exists at "${absDirPath}".`);
    return;
  } else {
    fs.mkdirSync(absDirPath, { recursive: true });
  }
  logTitle(
    `Downloading contract ${chalk.magenta(starter)} in "${absDirPath}"...`,
  );
  await downloadAndExtractContract(starter, absDirPath);
  if (install) {
    log();
    logTitle("Installing packages...");
    logAndRunCommand("npm", ["install"], { cwd: absDirPath });
  }
  if (git && tryGitInit(absDirPath)) {
    log();
    logTitle("Initialized a git repository.");
  }
  log();
  log(
    chalk.green(
      `Successfully created ${chalk.magenta(starter)} in "${absDirPath}".`,
    ),
  );
  log();
  log("Inside that directory, you can run several commands:");
  log();
  logCommand("  npm run build");
  log("    Builds the contract.");
  log();
  logCommand("  npm run test");
  log("    Tests the contract.");
  log();
  logCommand("  npm run deploy");
  log("    Deploys the contract to devnet.");
  log();
  log("We suggest that you begin by typing:");
  log();
  logCommand(`  cd ${dirPath}`);
  logCommand("  npm run build");
};

const downloadAndExtractContract = async (contract: string, cwd: string) => {
  const archivePath = await downloadArchive(
    "https://codeload.github.com/arda-org/xSuite/tar.gz/main",
  );
  const xsuiteVersion = await new Promise<string>((r) => {
    tar.t({
      file: archivePath,
      filter: (p) => p.includes("/xsuite/package.json"),
      onentry: async (e) => {
        const f = (await e.concat()).toString();
        r(JSON.parse(f)["version"]);
      },
    });
  });
  await tar.x({
    file: archivePath,
    strip: 2 + contract.split("/").length,
    filter: (p) => p.includes(`/contracts/${contract}/`),
    cwd,
  });
  fs.unlinkSync(archivePath);
  const pkgjsonPath = path.join(cwd, "package.json");
  let pkgjson = fs.readFileSync(pkgjsonPath, "utf-8");
  pkgjson = pkgjson.replace(
    '"xsuite": "workspace:*"',
    `"xsuite": "${xsuiteVersion}"`,
  );
  fs.writeFileSync(pkgjsonPath, pkgjson);
};

const tryGitInit = (cwd: string): boolean => {
  try {
    execSync("git --version", { stdio: "ignore", cwd });
    execSync("git init", { stdio: "ignore", cwd });
    execSync("git checkout -b main", { stdio: "ignore", cwd });
    execSync("git add -A", { stdio: "ignore", cwd });
    execSync('git commit -m "Initial commit from xSuite CLI"', {
      stdio: "ignore",
      cwd,
    });
    return true;
  } catch (_) {
    fs.rmSync(path.resolve(cwd, ".git"), { recursive: true, force: true });
    return false;
  }
};
