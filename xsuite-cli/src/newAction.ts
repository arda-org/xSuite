import { execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import stream from "node:stream";
import util from "node:util";
import chalk from "chalk";
import tar from "tar";
import { logTitle, runCommand } from "./helpers";

export const newAction = async ({ dir: dirPath }: { dir: string }) => {
  dirPath = path.resolve(dirPath);
  const contract = "blank";
  logTitle(
    `Downloading contract ${chalk.cyan(contract)} in ${chalk.cyan(dirPath)}...`
  );
  if (fs.existsSync(dirPath)) {
    console.log(chalk.red(`Directory already exists at ${dirPath}.`));
    return;
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  process.chdir(dirPath);
  await downloadAndExtractContract(contract);
  console.log();
  logTitle("Installing packages...");
  runCommand("npm", ["install"]);
  if (tryGitInit()) {
    console.log();
    logTitle("Initialized a git repository.");
  }
  console.log();
  logTitle(
    `Successfully created ${chalk.cyan(contract)} in ${chalk.cyan(dirPath)}.`
  );
  console.log();
  console.log("Inside that directory, you can run several commands:");
  console.log();
  console.log(chalk.cyan(`  npm run build`));
  console.log("    Builds the contract.");
  console.log();
  console.log(chalk.cyan(`  npm run test`));
  console.log("    Tests the contract.");
  console.log();
  console.log(chalk.cyan(`  npm run deploy`));
  console.log("    Deploys the contract to devnet.");
  console.log();
  console.log("We suggest that you begin by typing:");
  console.log();
  console.log(chalk.cyan("  cd"), dirPath);
  console.log(chalk.cyan("  npm run build"));
  console.log();
};

const downloadAndExtractContract = async (contract: string) => {
  const file = await downloadTar(
    "https://codeload.github.com/arda-org/xSuite.js/tar.gz/main"
  );
  await tar.x({
    file,
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

const tryGitInit = (): boolean => {
  let didInit = false;
  try {
    execSync("git --version", { stdio: "ignore" });
    execSync("git init", { stdio: "ignore" });
    didInit = true;
    execSync("git checkout -b main", { stdio: "ignore" });
    execSync("git add -A", { stdio: "ignore" });
    execSync('git commit -m "Initial commit from xSuite CLI"', {
      stdio: "ignore",
    });
    return true;
  } catch (_) {
    if (didInit) {
      try {
        fs.rmSync(".git", { recursive: true, force: true });
      } catch (_) {
        // Nothing
      }
    }
    return false;
  }
};
