import fs from "node:fs";
import path from "node:path";
import { test, beforeEach, afterEach, expect } from "@jest/globals";
import chalk from "chalk";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { stdoutInt, input } from "xsuite/_stdio";
import { KeystoreSigner } from "xsuite/world";
import {
  buildAction,
  newAction,
  newWalletAction,
  requestXegldAction,
  setupRustAction,
  testRustAction,
} from "./actions";

const tmpDir = "/tmp/xsuite-cli-tests";

beforeEach(() => {
  fs.mkdirSync(tmpDir);
  process.chdir(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("new-wallet --wallet wallet.json", async () => {
  stdoutInt.start();
  input.injected.push("1234", "1234");
  await newWalletAction({ wallet: "wallet.json" });
  stdoutInt.stop();
  expect(fs.existsSync("wallet.json")).toEqual(true);
  const walletPath = path.resolve("wallet.json");
  expect(stdoutInt.data.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    chalk.green(`Wallet created at "${walletPath}".`),
    "",
  ]);
});

test("new-wallet --wallet wallet.json | error: passwords don't match", async () => {
  stdoutInt.start();
  input.injected.push("1234", "1235");
  await newWalletAction({ wallet: "wallet.json" });
  stdoutInt.stop();
  const walletPath = path.resolve("wallet.json");
  expect(stdoutInt.data.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    chalk.red(`Passwords do not match.`),
    "",
  ]);
});

test("new-wallet --wallet wallet.json --password 1234", async () => {
  stdoutInt.start();
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  stdoutInt.stop();
  expect(fs.existsSync("wallet.json")).toEqual(true);
  const walletPath = path.resolve("wallet.json");
  expect(stdoutInt.data).toEqual(
    chalk.green(`Wallet created at "${walletPath}".`) + "\n",
  );
});

test("new-wallet --wallet wallet.json --password 1234 | error: already exists", async () => {
  stdoutInt.start();
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  await newWalletAction({ wallet: "wallet.json", password: "1234" });
  stdoutInt.stop();
  const walletPath = path.resolve("wallet.json");
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.green(`Wallet created at "${walletPath}".`),
    chalk.red(`Wallet already exists at "${walletPath}".`),
    "",
  ]);
});

test("request-xegld --wallet wallet.json", async () => {
  KeystoreSigner.createFile_unsafe("wallet.json", "1234");
  const signer = KeystoreSigner.fromFile_unsafe("wallet.json", "1234");
  const address = signer.toString();
  let numFaucetReqs = 0;
  let numBalanceReqs = 0;
  const server = setupServer(
    rest.get(
      "https://devnet-api.multiversx.com/blocks/latest",
      (_req, res, ctx) => {
        return res(
          ctx.json({
            hash: "103b656af4fa9625962c5978e8cf69aca6918eb146a495bcf474f1c6a922be93",
          }),
        );
      },
    ),
    rest.get("https://devnet-api.multiversx.com/blocks", (_req, res, ctx) => {
      return res(
        ctx.json([
          {
            hash: "103b656af4fa9625962c5978e8cf69aca6918eb146a495bcf474f1c6a922be93",
          },
        ]),
      );
    }),
    rest.post(
      "https://devnet-extras-api.multiversx.com/faucet",
      (_req, res, ctx) => {
        numFaucetReqs += 1;
        if (numFaucetReqs === 1) {
          return res(ctx.json({ status: "success" }));
        } else {
          return res(
            ctx.json({ status: "error", message: "Already claimed today." }),
          );
        }
      },
    ),
    rest.get(
      `https://devnet-gateway.multiversx.com/address/${address}/balance`,
      (_req, res, ctx) => {
        numBalanceReqs += 1;
        const balance = `${30n * 10n ** 18n * BigInt(numBalanceReqs)}`;
        return res(ctx.json({ code: "successful", data: { balance } }));
      },
    ),
  );
  server.listen();
  stdoutInt.start();
  await requestXegldAction({ wallet: "wallet.json", password: "1234" });
  await requestXegldAction({ wallet: "wallet.json", password: "1234" });
  stdoutInt.stop();
  server.close();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.green("Wallet well received 30 xEGLD."),
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.red("Error: Already claimed today."),
    "",
  ]);
});

test("new --dir contract && setup-rust && build && test-rust", async () => {
  stdoutInt.start();
  await newAction({ dir: "contract" });
  stdoutInt.stop();
  expect(fs.readdirSync(process.cwd()).length).toEqual(1);
  const dirPath = path.resolve("contract");
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue(
      `Downloading contract ${chalk.magenta("blank")} in "${dirPath}"...`,
    ),
    "",
    chalk.blue("Installing packages..."),
    chalk.cyan("$ npm install"),
    "",
    chalk.blue("Initialized a git repository."),
    "",
    chalk.green(
      `Successfully created ${chalk.magenta("blank")} in "${dirPath}".`,
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

  stdoutInt.start();
  setupRustAction();
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Installing Rust nightly..."),
    chalk.cyan(
      "$ curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain nightly-2023-06-15 -y",
    ),
    "",
    chalk.blue("Installing wasm32-unknown-unknown target..."),
    chalk.cyan("$ rustup target add wasm32-unknown-unknown"),
    "",
    chalk.blue("Installing multiversx-sc-meta crate..."),
    chalk.cyan("$ cargo install multiversx-sc-meta --version 0.41.0"),
    "",
  ]);

  stdoutInt.start();
  const targetDir = path.join(__dirname, "..", "..", "..", "target");
  buildAction(["--target-dir", targetDir], {
    env: { ...process.env, CARGO_TARGET_DIR: targetDir },
  });
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Building contract..."),
    chalk.cyan(`$ sc-meta all build --target-dir ${targetDir}`),
    "",
  ]);

  stdoutInt.start();
  testRustAction();
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Testing contract with Rust tests..."),
    chalk.cyan("$ cargo test"),
    "",
  ]);
});

test(`new --contract vested-transfers --dir contract --no-git --no-install`, async () => {
  stdoutInt.start();
  await newAction({
    contract: "vested-transfers",
    dir: "contract",
    noGit: true,
    noInstall: true,
  });
  stdoutInt.stop();
  expect(fs.readdirSync(process.cwd()).length).toEqual(1);
  const contractChalk = chalk.magenta("vested-transfers");
  const dirPath = path.resolve("contract");
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue(`Downloading contract ${contractChalk} in "${dirPath}"...`),
    "",
    chalk.green(`Successfully created ${contractChalk} in "${dirPath}".`),
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
  stdoutInt.start();
  await newAction({ dir: "contract" });
  stdoutInt.stop();
  const dirPath = path.resolve("contract");
  expect(stdoutInt.data).toEqual(
    chalk.red(`Directory already exists at "${dirPath}".`) + "\n",
  );
});
