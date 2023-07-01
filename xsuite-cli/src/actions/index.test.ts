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
  expect(stdout.output).toEqual(
    `Creating keystore wallet at "${walletPath}"...\n` +
      "Enter password: \n" +
      "Re-enter password: \n" +
      chalk.green(`Wallet created at "${walletPath}".`) +
      "\n"
  );
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
  expect(stdout.output).toEqual(
    `Creating keystore wallet at "${walletPath}"...\n` +
      "Enter password: \n" +
      "Re-enter password: \n" +
      chalk.red(`Passwords do not match.`) +
      "\n"
  );
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
  expect(stdout.output).toEqual(
    chalk.green(`Wallet created at "${walletPath}".`) +
      "\n" +
      chalk.red(`Wallet already exists at "${walletPath}".`) +
      "\n"
  );
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
  expect(stdout.output).toEqual(
    `Claiming 30 xEGLD for address "${address}"...\n` +
      chalk.green("Wallet well received 30 xEGLD.") +
      "\n" +
      `Claiming 30 xEGLD for address "${address}"...\n` +
      chalk.red("Error: Already claimed today.") +
      "\n"
  );
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
