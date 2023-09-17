import { execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import stream from "node:stream";
import util from "node:util";
import chalk from "chalk";
import { Command } from "commander";
import tar from "tar";
import { pkgPath } from "../_pkgPath";
import { log } from "../_stdio";
import { logTitle, logAndRunCommand, logCommand, logError } from "./helpers";

export const registerNewCmd = (cmd: Command) => {
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
  dir = path.resolve(dir);
  if (fs.existsSync(dir)) {
    logError(`Directory already exists at "${dir}".`);
    return;
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
  logTitle(`Downloading contract ${chalk.magenta(starter)} in "${dir}"...`);
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
    chalk.green(`Successfully created ${chalk.magenta(starter)} in "${dir}".`),
  );
  log();
  log("Inside that directory, you can run several commands:");
  log();
  logCommand(`  npm run build`);
  log("    Builds the contract.");
  log();
  logCommand(`  npm run test`);
  log("    Tests the contract.");
  log();
  logCommand(`  npm run deploy`);
  log("    Deploys the contract to devnet.");
  log();
  log("We suggest that you begin by typing:");
  log();
  logCommand(`  cd ${dir}`);
  logCommand("  npm run build");
};

const downloadAndExtractContract = async (contract: string, cwd: string) => {
  const [archive, xsuiteVersion] = process.env["GITHUB_SHA"]
    ? await Promise.all([
        downloadXsuiteRepoArchive(process.env["GITHUB_SHA"]),
        `file:${pkgPath}`,
      ])
    : await Promise.all([
        downloadXsuiteRepoArchive("main"),
        getXsuitePkgLatestVersion(),
      ]);
  await tar.x({
    file: archive,
    strip: 2 + contract.split("/").length,
    filter: (p) => p.includes(`/contracts/${contract}/`),
    cwd,
  });
  fs.unlinkSync(archive);
  const pkgjsonPath = path.join(cwd, "package.json");
  let pkgjson = fs.readFileSync(pkgjsonPath, "utf-8");
  pkgjson = pkgjson.replace(
    '"xsuite": "workspace:*"',
    `"xsuite": "${xsuiteVersion}"`,
  );
  fs.writeFileSync(pkgjsonPath, pkgjson);
};

const pipeline = util.promisify(stream.Stream.pipeline);

const downloadXsuiteRepoArchive = (sha: string) =>
  downloadArchive(`https://codeload.github.com/arda-org/xSuite/tar.gz/${sha}`);

const downloadArchive = (url: string) => {
  const file = path.join(os.tmpdir(), `xSuite-contract-${Date.now()}`);
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

const getXsuitePkgLatestVersion = () =>
  fetch("https://registry.npmjs.org/xsuite/latest")
    .then((r) => r.json())
    .then((r) => r.version);

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
