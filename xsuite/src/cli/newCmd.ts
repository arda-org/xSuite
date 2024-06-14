import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import tar from "tar";
import { log } from "../_stdio";
import {
  logTitle,
  logAndRunCommand,
  logCommand,
  logError,
  downloadArchive,
} from "./helpers";

export const addNewCmd = (cmd: Command) => {
  cmd
    .command("new")
    .description("Create a new blank contract.")
    .requiredOption("--dir <DIR>", "Contract dir")
    .option("--starter <STARTER>", "Contract to start from")
    .option("--no-install", "Skip package installation")
    .option("--no-git", "Skip git initialization")
    .action(action);
};

const action = async ({
  dir,
  starter = "blank",
  install,
  git,
}: {
  dir: string;
  starter?: string;
  install?: boolean;
  git?: boolean;
}) => {
  const absDir = path.resolve(dir);
  if (fs.existsSync(dir)) {
    logError(`Directory already exists at "${absDir}".`);
    return;
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
  logTitle(`Downloading contract ${chalk.magenta(starter)} in "${absDir}"...`);
  await downloadAndExtractContract(starter, dir);
  if (install) {
    log();
    logTitle("Installing packages...");
    logAndRunCommand("npm", ["install"], { cwd: dir });
  }
  if (git && tryGitInit(dir)) {
    log();
    logTitle("Initialized a git repository.");
  }
  log();
  log(
    chalk.green(
      `Successfully created ${chalk.magenta(starter)} in "${absDir}".`,
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
  logCommand(`  cd ${dir}`);
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
