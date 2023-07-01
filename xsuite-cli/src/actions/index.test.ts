import fs from "node:fs";
import path from "node:path";
import { test, beforeEach, afterEach, expect } from "@jest/globals";
import chalk from "chalk";
import { rest } from "msw";
import { setupServer } from "msw/node";
import tmp from "tmp-promise";
import { stdout } from "xsuite/dist/stdio";
import { KeystoreSigner } from "xsuite/world";
import { newAction, newWalletAction, requestXegldAction } from "./index";

let dir: tmp.DirectoryResult;
const originalCwd = process.cwd();

beforeEach(async () => {
  dir = await tmp.dir({ unsafeCleanup: true });
  process.chdir(dir.path);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await tmp.setGracefulCleanup();
});

test("new-wallet --wallet wallet.json", async () => {
  process.nextTick(() => {
    process.stdin.push("1234\n");
    process.nextTick(() => {
      process.stdin.push("1234\n");
    });
  });
  stdout.start();
  await newWalletAction({ wallet: "wallet.json" });
  stdout.stop();
  expect(fs.existsSync("wallet.json")).toEqual(true);
  const walletPath = path.resolve("wallet.json");
  expect(stdout.output.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    chalk.green(`Wallet created at "${walletPath}".`),
    "",
  ]);
});

test("new-wallet --wallet wallet.json | error: passwords don't match", async () => {
  process.nextTick(() => {
    process.stdin.push("1234\n");
    process.nextTick(() => {
      process.stdin.push("1235\n");
    });
  });
  stdout.start();
  await newWalletAction({ wallet: "wallet.json" });
  stdout.stop();
  const walletPath = path.resolve("wallet.json");
  expect(stdout.output.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    chalk.red(`Passwords do not match.`),
    "",
  ]);
});

test("new-wallet --wallet wallet.json --password 1234", async () => {
  stdout.start();
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  stdout.stop();
  expect(fs.existsSync("wallet.json")).toEqual(true);
  const walletPath = path.resolve("wallet.json");
  expect(stdout.output).toEqual(
    chalk.green(`Wallet created at "${walletPath}".`) + "\n"
  );
});

test("new-wallet --wallet wallet.json --password 1234 | error: already exists", async () => {
  stdout.start();
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  stdout.stop();
  const walletPath = path.resolve("wallet.json");
  expect(stdout.output.split("\n")).toEqual([
    chalk.green(`Wallet created at "${walletPath}".`),
    chalk.red(`Wallet already exists at "${walletPath}".`),
    "",
  ]);
});

test("request-xegld --wallet wallet.json", async () => {
  KeystoreSigner.createFile("wallet.json", "1234");
  const address = KeystoreSigner.fromFile("wallet.json", "1234").toString();
  let numFaucetReqs = 0;
  let numBalanceReqs = 0;
  const server = setupServer(
    rest.get("https://devnet-api.multiversx.com/blocks/latest", (req) =>
      req.passthrough()
    ),
    rest.get("https://devnet-api.multiversx.com/blocks", (req) =>
      req.passthrough()
    ),
    rest.post(
      "https://devnet-extras-api.multiversx.com/faucet",
      (_req, res, ctx) => {
        numFaucetReqs += 1;
        if (numFaucetReqs === 1) {
          return res(ctx.json({ status: "success" }));
        } else {
          return res(
            ctx.json({ status: "error", message: "Already claimed today." })
          );
        }
      }
    ),
    rest.get(
      `https://devnet-gateway.multiversx.com/address/${address}/balance`,
      (_req, res, ctx) => {
        numBalanceReqs += 1;
        const balance = `${30n * 10n ** 18n * BigInt(numBalanceReqs)}`;
        return res(ctx.json({ code: "successful", data: { balance } }));
      }
    )
  );
  server.listen();
  stdout.start();
  await requestXegldAction({ wallet: "wallet.json", password: "1234" });
  await requestXegldAction({ wallet: "wallet.json", password: "1234" });
  stdout.stop();
  server.close();
  expect(stdout.output.split("\n")).toEqual([
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.green("Wallet well received 30 xEGLD."),
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.red("Error: Already claimed today."),
    "",
  ]);
});

test("new --dir contract", async () => {
  stdout.start();
  await newAction({ dir: "contract" });
  stdout.stop();
  expect(fs.readdirSync(process.cwd()).length).toEqual(1);
  const dirPath = path.resolve("contract");
  expect(stdout.output.split("\n")).toEqual([
    chalk.blue(
      `Downloading contract ${chalk.magenta("blank")} in "${dirPath}"...`
    ),
    "",
    chalk.blue("Installing packages..."),
    chalk.cyan("$ npm install"),
    "",
    chalk.blue("Initialized a git repository."),
    "",
    chalk.green(
      `Successfully created ${chalk.magenta("blank")} in "${dirPath}".`
    ),
    "",
    "Inside that directory, you can run several commands:",
    "",
    chalk.cyan("  npm run build"),
    "    Builds the contract.",
    "",
    chalk.cyan("  npm run test"),
    "    Tests the contract.",
    "",
    chalk.cyan("  npm run deploy"),
    "    Deploys the contract to devnet.",
    "",
    "We suggest that you begin by typing:",
    "",
    chalk.cyan(`  cd ${dirPath}`),
    chalk.cyan("  npm run build"),
    "",
  ]);
});

test("new --dir contract | error: already exists", async () => {
  fs.mkdirSync("contract");
  stdout.start();
  await newAction({ dir: "contract" });
  stdout.stop();
  const dirPath = path.resolve("contract");
  expect(stdout.output).toEqual(
    chalk.red(`Directory already exists at "${dirPath}".`) + "\n"
  );
});
