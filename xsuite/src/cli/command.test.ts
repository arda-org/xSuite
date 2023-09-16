import fs from "node:fs";
import path from "node:path";
import { test, beforeEach, afterEach, expect } from "@jest/globals";
import chalk from "chalk";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { stdoutInt, input } from "../_stdio";
import { Keystore } from "../world";
import { command } from "./command";
import { rustToolchain, rustTarget, scmetaCrate } from "./rustSettings";

const cwd = process.cwd();
const tmpDir = "/tmp/xsuite-tests";

beforeEach(() => {
  fs.mkdirSync(tmpDir);
  process.chdir(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.chdir(cwd);
});

test("new-wallet --wallet wallet.json", async () => {
  const walletPath = path.resolve("wallet.json");
  stdoutInt.start();
  input.injected.push("1234", "1234");
  await run(`new-wallet --wallet ${walletPath}`);
  const keystore = Keystore.fromFile_unsafe(walletPath, "1234");
  stdoutInt.stop();
  expect(fs.existsSync(walletPath)).toEqual(true);
  expect(stdoutInt.data.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    "",
    chalk.green(`Wallet created at "${walletPath}".`),
    "",
    chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`,
    "",
    chalk.bold.blue("Private key:"),
    ...keystore.mnemonicWords.map((w, i) => `  ${i + 1}. ${w}`),
    "",
    chalk.bold.yellow(
      "Don't forget to backup the private key in a secure place.",
    ),
    "",
  ]);
});

test("new-wallet --wallet wallet.json | error: passwords don't match", async () => {
  const walletPath = path.resolve("wallet.json");
  stdoutInt.start();
  input.injected.push("1234", "1235");
  await run(`new-wallet --wallet ${walletPath}`);
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    chalk.red(`Passwords do not match.`),
    "",
  ]);
});

test("new-wallet --wallet wallet.json --password 1234", async () => {
  const walletPath = path.resolve("wallet.json");
  stdoutInt.start();
  await run(`new-wallet --wallet ${walletPath} --password 1234`);
  const keystore = Keystore.fromFile_unsafe(walletPath, "1234");
  stdoutInt.stop();
  expect(fs.existsSync(walletPath)).toEqual(true);
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.green(`Wallet created at "${walletPath}".`),
    "",
    chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`,
    "",
    chalk.bold.blue("Private key:"),
    ...keystore.mnemonicWords.map((w, i) => `  ${i + 1}. ${w}`),
    "",
    chalk.bold.yellow(
      "Don't forget to backup the private key in a secure place.",
    ),
    "",
  ]);
});

test("new-wallet --wallet wallet.json --password 1234 | error: already exists", async () => {
  const walletPath = path.resolve("wallet.json");
  fs.writeFileSync(walletPath, "");
  stdoutInt.start();
  await run(`new-wallet --wallet ${walletPath} --password 1234`);
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.red(`Wallet already exists at "${walletPath}".`),
    "",
  ]);
});

test("request-xegld --wallet wallet.json", async () => {
  const walletPath = path.resolve("wallet.json");
  const signer = Keystore.createFile_unsafe(walletPath, "1234").newSigner();
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
  input.injected.push("1234", "1234");
  await run(`request-xegld --wallet ${walletPath}`);
  await run(`request-xegld --wallet ${walletPath} --password 1234`);
  stdoutInt.stop();
  server.close();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Loading keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "",
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.green("Wallet well received 30 xEGLD."),
    `Claiming 30 xEGLD for address "${address}"...`,
    chalk.red("Error: Already claimed today."),
    "",
  ]);
});

test("install-rust", async () => {
  stdoutInt.start();
  await run("install-rust");
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue(
      `Installing Rust: toolchain ${rustToolchain}, target ${rustTarget}, crate ${scmetaCrate.name}...`,
    ),
    chalk.cyan(
      `$ sh -c 'curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain ${rustToolchain} -y \\`,
    ),
    chalk.cyan('    && . "$HOME/.cargo/env" \\'),
    chalk.cyan(`    && rustup target add ${rustTarget} \\`),
    chalk.cyan(
      `    && cargo install ${scmetaCrate.name} --version ${scmetaCrate.version}'`,
    ),
    "",
  ]);
});

test("new --dir contract && build --locked && test-rust && test-scen", async () => {
  stdoutInt.start();
  await run("new --dir contract");
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

  const targetDir = path.join(__dirname, "..", "..", "..", "target");
  process.chdir(dirPath);

  stdoutInt.start();
  await run(`build --locked --target-dir ${targetDir}`);
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Building contract..."),
    chalk.cyan(
      `$ cargo run --target-dir ${targetDir} build --locked --target-dir ${targetDir}`,
    ),
    "",
  ]);

  stdoutInt.start();
  await run(`test-rust --target-dir ${targetDir}`);
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Testing contract with Rust tests..."),
    chalk.cyan(`$ cargo test --target-dir ${targetDir}`),
    "",
  ]);

  const scenexecName = "scenexec-ubuntu-20.04-v1.4.77";
  const scenexecPath = path.join(__dirname, "..", "..", "bin", scenexecName);
  fs.rmSync(scenexecPath, { force: true });
  stdoutInt.start();
  await run("test-scen");
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    chalk.blue("Testing contract with scenarios..."),
    "Downloading scenexec-ubuntu-20.04-v1.4.77...",
    chalk.cyan(`$ ${scenexecPath} .`),
    "",
  ]);
}, 600_000);

test(`new --starter vested-transfers --dir contract --no-git --no-install`, async () => {
  const contract = "vested-transfers";
  stdoutInt.start();
  await run(`new --starter ${contract} --dir contract --no-git --no-install`);
  stdoutInt.stop();
  expect(fs.readdirSync(process.cwd()).length).toEqual(1);
  const contractChalk = chalk.magenta(contract);
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
  await run("new --dir contract");
  stdoutInt.stop();
  const dirPath = path.resolve("contract");
  expect(stdoutInt.data).toEqual(
    chalk.red(`Directory already exists at "${dirPath}".`) + "\n",
  );
});

const run = (c: string) => command.parseAsync(c.split(" "), { from: "user" });
