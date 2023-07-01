import { execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import stream from "node:stream";
import util from "node:util";
import chalk from "chalk";
import tar from "tar";
import { log } from "xsuite/_stdio";
import { logTitle, logAndRunCommand, logCommand, logError } from "./helpers";

export const newAction = async ({ dir: dirPath }: { dir: string }) => {
  dirPath = path.resolve(dirPath);
  if (fs.existsSync(dirPath)) {
    logError(`Directory already exists at "${dirPath}".`);
    return;
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const contract = "blank";
  logTitle(
    `Downloading contract ${chalk.magenta(contract)} in "${dirPath}"...`
  );
  await downloadAndExtractContract(contract, dirPath);
  log();
  logTitle("Installing packages...");
  logAndRunCommand("npm", ["install"], { cwd: dirPath });
  if (tryGitInit(dirPath)) {
    log();
    logTitle("Initialized a git repository.");
  }
  log();
  log(
    chalk.green(
      `Successfully created ${chalk.magenta(contract)} in "${dirPath}".`
    )
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
  logCommand(`  cd ${dirPath}`);
  logCommand("  npm run build");
};

const downloadAndExtractContract = async (contract: string, cwd: string) => {
  const file = await downloadTar(
    "https://codeload.github.com/arda-org/xSuite.js/tar.gz/main"
  );
  await tar.x({
    file,
    strip: 2 + contract.split("/").length,
    filter: (p) => p.includes(`xSuite.js-main/contracts/${contract}/`),
    cwd,
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
