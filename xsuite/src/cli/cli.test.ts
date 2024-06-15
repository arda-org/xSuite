import fs from "node:fs";
import path from "node:path";
import { UserSecretKey } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { http } from "msw";
import { setupServer } from "msw/node";
import { test, expect } from "vitest";
import { Context } from "../context";
import { getAddressShard } from "../data/utils";
import { Keystore } from "../world/signer";
import { getCli } from "./cli";
import { rustToolchain, rustTarget, rustKey } from "./helpers";

const pemPath = path.resolve("wallets", "wallet.pem");
const keyKeystorePath = path.resolve("wallets", "keystore_key.json");
const mneKeystorePath = path.resolve("wallets", "keystore_mnemonic.json");

test.concurrent("new-wallet --wallet wallet.json", async () => {
  using c = newContext();
  c.input("1234", "1234");
  await c.cmd("new-wallet --wallet wallet.json");
  const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
  const keystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
  const keystoreSigner = keystore.newSigner();
  expect(fs.existsSync(walletAbsPath)).toEqual(true);
  expect(c.flushStdout().split("\n")).toEqual([
    `Creating keystore wallet at "${walletAbsPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    "",
    chalk.green(`Wallet created at "${walletAbsPath}".`),
    "",
    chalk.bold.blue("Address:") + ` ${keystoreSigner}`,
    "",
    chalk.bold.blue("Shard:") + ` ${getAddressShard(keystoreSigner)}`,
    "",
    chalk.bold.blue("Mnemonic phrase:"),
    ...keystore.getMnemonicWords().map((w, i) => `  ${i + 1}. ${w}`),
    "",
    chalk.bold.yellow("Please backup the mnemonic phrase in a secure place."),
    "",
  ]);
});

for (const shard of [0, 1, 2]) {
  test.concurrent(
    `new-wallet --wallet wallet.json --shard ${shard}`,
    async () => {
      using c = newContext();
      c.input("1234", "1234");
      await c.cmd(`new-wallet --wallet wallet.json --shard ${shard}`);
      const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
      const keystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
      expect(fs.existsSync(walletAbsPath)).toEqual(true);
      expect(c.flushStdout().split("\n")).toEqual([
        `Creating keystore wallet at "${walletAbsPath}"...`,
        "Enter password: ",
        "Re-enter password: ",
        "",
        chalk.green(`Wallet created at "${walletAbsPath}".`),
        "",
        chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`,
        "",
        chalk.bold.blue("Shard:") + ` ${shard}`,
        "",
        chalk.bold.blue("Mnemonic phrase:"),
        ...keystore.getMnemonicWords().map((w, i) => `  ${i + 1}. ${w}`),
        "",
        chalk.bold.yellow(
          "Please backup the mnemonic phrase in a secure place.",
        ),
        "",
      ]);
    },
  );
}

for (const shard of [-1, 3]) {
  test.concurrent(
    `new-wallet --wallet wallet.json --shard ${shard} | error: The shard you entered does not exist`,
    async () => {
      using c = newContext();
      c.input("1234", "1234");
      await c.cmd(`new-wallet --wallet wallet.json --shard ${shard}`);
      const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
      expect(fs.existsSync(walletAbsPath)).toEqual(false);
      expect(c.flushStdout().split("\n")).toEqual([
        `Creating keystore wallet at "${walletAbsPath}"...`,
        "Enter password: ",
        "Re-enter password: ",
        "",
        chalk.red("The shard you entered does not exist."),
        "",
      ]);
    },
  );
}

test.concurrent(
  "new-wallet --wallet wallet.json | error: passwords don't match",
  async () => {
    using c = newContext();
    c.input("1234", "1235");
    await c.cmd("new-wallet --wallet wallet.json");
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    expect(c.flushStdout().split("\n")).toEqual([
      `Creating keystore wallet at "${walletAbsPath}"...`,
      "Enter password: ",
      "Re-enter password: ",
      chalk.red("Passwords do not match."),
      "",
    ]);
  },
);

test.concurrent(
  "new-wallet --wallet wallet.json | error: already exists",
  async () => {
    using c = newContext();
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    fs.writeFileSync(walletAbsPath, "");
    await c.cmd("new-wallet --wallet wallet.json");
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.red(`Wallet already exists at "${walletAbsPath}".`),
      "",
    ]);
  },
);

test.concurrent("new-wallet --wallet wallet.json --password 1234", async () => {
  using c = newContext();
  await c.cmd("new-wallet --wallet wallet.json --password 1234");
  const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
  const keystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
  const keystoreSigner = keystore.newSigner();
  expect(fs.existsSync(walletAbsPath)).toEqual(true);
  expect(c.flushStdout().split("\n")).toEqual([
    chalk.green(`Wallet created at "${walletAbsPath}".`),
    "",
    chalk.bold.blue("Address:") + ` ${keystoreSigner}`,
    "",
    chalk.bold.blue("Shard:") + ` ${getAddressShard(keystoreSigner)}`,
    "",
    chalk.bold.blue("Mnemonic phrase:"),
    ...keystore.getMnemonicWords().map((w, i) => `  ${i + 1}. ${w}`),
    "",
    chalk.bold.yellow("Please backup the mnemonic phrase in a secure place."),
    "",
  ]);
});

test.concurrent(
  "new-wallet --wallet wallet.json --from-pem wallet.pem",
  async () => {
    using c = newContext();
    c.input("1234", "1234");
    await c.cmd(`new-wallet --wallet wallet.json --from-pem ${pemPath}`);
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    const keystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
    const keystoreSigner = keystore.newSigner();
    const secretKey = UserSecretKey.fromPem(
      fs.readFileSync(pemPath, "utf8"),
    ).hex();
    expect(keystore.getSecretKey()).toEqual(secretKey);
    expect(c.flushStdout().split("\n")).toEqual([
      `Creating keystore wallet at "${walletAbsPath}"...`,
      "Enter password: ",
      "Re-enter password: ",
      "",
      chalk.green(`Wallet created at "${walletAbsPath}".`),
      "",
      chalk.bold.blue("Address:") + ` ${keystoreSigner}`,
      "",
      chalk.bold.blue("Shard:") + ` ${getAddressShard(keystoreSigner)}`,
      "",
    ]);
  },
);

test.concurrent(
  "new-wallet --wallet wallet.json --password 1234 --from-pem wallet.pem",
  async () => {
    using c = newContext();
    await c.cmd(
      `new-wallet --wallet wallet.json --password 1234 --from-pem ${pemPath}`,
    );
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    const keystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
    const keystoreSigner = keystore.newSigner();
    const secretKey = UserSecretKey.fromPem(
      fs.readFileSync(pemPath, "utf8"),
    ).hex();
    expect(keystore.getSecretKey()).toEqual(secretKey);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.green(`Wallet created at "${walletAbsPath}".`),
      "",
      chalk.bold.blue("Address:") + ` ${keystoreSigner}`,
      "",
      chalk.bold.blue("Shard:") + ` ${getAddressShard(keystoreSigner)}`,
      "",
    ]);
  },
);

test.concurrent(
  "new-wallet --wallet wallet.json --password 1234 --from-wallet keystore_key.json",
  async () => {
    using c = newContext();
    c.input("qpGjv7ZJ9gcPXWSN");
    await c.cmd(
      `new-wallet --wallet wallet.json --password 1234 --from-wallet ${keyKeystorePath}`,
    );
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    const newKeystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
    const oldKeystore = Keystore.fromFile_unsafe(
      keyKeystorePath,
      "qpGjv7ZJ9gcPXWSN",
    );
    const newKeystoreSigner = newKeystore.newSigner();
    const [newSignature, oldSignature] = await Promise.all([
      newKeystore.newSigner().sign(Buffer.from("hello")),
      oldKeystore.newSigner().sign(Buffer.from("hello")),
    ]);
    expect(newSignature).toEqual(oldSignature);
    expect(c.flushStdout().split("\n")).toEqual([
      `Loading keystore wallet at "${keyKeystorePath}"...`,
      "Enter password: ",
      chalk.green(`Wallet created at "${walletAbsPath}".`),
      "",
      chalk.bold.blue("Address:") + ` ${newKeystoreSigner}`,
      "",
      chalk.bold.blue("Shard:") + ` ${getAddressShard(newKeystoreSigner)}`,
      "",
    ]);
  },
);

test.concurrent(
  "new-wallet --wallet wallet.json --password 1234 --from-wallet keystore_mnemonic.json",
  async () => {
    using c = newContext();
    c.input("1234");
    await c.cmd(
      `new-wallet --wallet wallet.json --password 1234 --from-wallet ${mneKeystorePath}`,
    );
    const walletAbsPath = path.resolve(c.cwd(), "wallet.json");
    const newKeystore = Keystore.fromFile_unsafe(walletAbsPath, "1234");
    const oldKeystore = Keystore.fromFile_unsafe(mneKeystorePath, "1234");
    const [newSignature, oldSignature] = await Promise.all([
      newKeystore.newSigner().sign(Buffer.from("hello")),
      oldKeystore.newSigner().sign(Buffer.from("hello")),
    ]);
    const newKeystoreSigner = newKeystore.newSigner();
    expect(newSignature).toEqual(oldSignature);
    expect(c.flushStdout().split("\n")).toEqual([
      `Loading keystore wallet at "${mneKeystorePath}"...`,
      "Enter password: ",
      chalk.green(`Wallet created at "${walletAbsPath}".`),
      "",
      chalk.bold.blue("Address:") + ` ${newKeystoreSigner}`,
      "",
      chalk.bold.blue("Shard:") + ` ${getAddressShard(newKeystoreSigner)}`,
      "",
      chalk.bold.blue("Mnemonic phrase:"),
      ...newKeystore.getMnemonicWords().map((w, i) => `  ${i + 1}. ${w}`),
      "",
      chalk.bold.yellow("Please backup the mnemonic phrase in a secure place."),
      "",
    ]);
  },
);

test.concurrent(
  "request-xegld --wallet wallet.json",
  async () => {
    using c = newContext();
    const walletPath = mneKeystorePath;
    const signer = Keystore.fromFile_unsafe(walletPath, "1234").newSigner();
    let balances: number[] = [];
    const server = setupServer(
      http.get("https://devnet-api.multiversx.com/blocks/latest", () =>
        Response.json({ hash: "" }),
      ),
      http.get("https://devnet-api.multiversx.com/blocks", () =>
        Response.json([{ hash: "" }]),
      ),
      http.get(
        `https://devnet-gateway.multiversx.com/address/${signer}/balance`,
        () => {
          const balance = `${BigInt(balances.shift() ?? 0) * 10n ** 18n}`;
          return Response.json({ code: "successful", data: { balance } });
        },
      ),
    );
    server.listen();
    c.input("1234", "1234");
    balances = [0, 1];
    await c.cmd(`request-xegld --wallet ${walletPath}`);
    balances = [0, 10];
    await c.cmd(`request-xegld --wallet ${walletPath} --password 1234`);
    server.close();
    const splittedStdoutData = c.flushStdout().split("\n");
    expect(splittedStdoutData).toEqual([
      `Loading keystore wallet at "${walletPath}"...`,
      "Enter password: ",
      "",
      `Claiming xEGLD for address "${signer}"...`,
      "",
      "Open the URL and request tokens:",
      splittedStdoutData.at(6),
      "",
      chalk.green("Wallet well received 1 xEGLD."),
      `Claiming xEGLD for address "${signer}"...`,
      "",
      "Open the URL and request tokens:",
      splittedStdoutData.at(12),
      "",
      chalk.green("Wallet well received 10 xEGLD."),
      "",
    ]);
  },
  100_000,
);

test.concurrent("install-rust-key", async () => {
  using c = newContext();
  await c.cmd("install-rust-key");
  expect(c.flushStdout().split("\n")).toEqual([rustKey, ""]);
});

test.concurrent("install-rust", async () => {
  using c = newContext();
  await c.cmd("install-rust");
  expect(c.flushStdout().split("\n")).toEqual([
    chalk.blue(
      `Installing Rust: toolchain ${rustToolchain} & target ${rustTarget}...`,
    ),
    chalk.cyan(
      `$ curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain ${rustToolchain} -t ${rustTarget} -y`,
    ),
    "",
  ]);
});

test.concurrent(
  "new --dir contract && build --locked && build -r && test-rust && test-scen",
  async () => {
    using c = newContext();

    const dir = "contract";
    await c.cmd(`new --dir ${dir}`);
    expect(fs.readdirSync(c.cwd()).length).toEqual(1);
    const starterChalk = chalk.magenta("blank");
    const absDirPath = path.resolve(c.cwd(), dir);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue(`Downloading contract ${starterChalk} in "${absDirPath}"...`),
      "",
      chalk.blue("Installing packages..."),
      chalk.cyan("$ npm install"),
      "",
      chalk.blue("Initialized a git repository."),
      "",
      chalk.green(`Successfully created ${starterChalk} in "${absDirPath}".`),
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
      chalk.cyan(`  cd ${dir}`),
      chalk.cyan("  npm run build"),
      "",
    ]);

    const targetDir = path.join(__dirname, "..", "..", "..", "target");
    c.setCwd(absDirPath);

    await c.cmd(`build --locked --target-dir ${targetDir}`);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue("Building contract..."),
      `(1/1) Building "${absDirPath}"...`,
      chalk.cyan(
        `$ cargo run --target-dir ${targetDir} build --locked --target-dir ${targetDir}`,
      ),
      "",
    ]);

    await c.cmd(`build -r --target-dir ${targetDir}`);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue("Building contract..."),
      `(1/1) Building "${absDirPath}"...`,
      chalk.cyan(
        `$ cargo run --target-dir ${targetDir} build --target-dir ${targetDir}`,
      ),
      "",
    ]);

    await c.cmd(`test-rust --target-dir ${targetDir}`);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue("Testing contract with Rust tests..."),
      chalk.cyan(`$ cargo test --target-dir ${targetDir}`),
      "",
    ]);

    const extractPath = path.resolve(
      __dirname,
      "..",
      "..",
      "bin",
      "scenexec-v1.5.22-ubuntu-20.04",
    );
    const binaryPath = path.resolve(extractPath, "scenexec");
    fs.rmSync(extractPath, { recursive: true, force: true });
    await c.cmd("test-scen");
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue("Testing contract with scenarios..."),
      "Downloading scenexec-v1.5.22-ubuntu-20.04...",
      chalk.cyan(`$ ${binaryPath} .`),
      "",
    ]);
  },
  100_000,
);

test.concurrent(
  "new --starter vested-transfers --dir contract --no-git --no-install",
  async () => {
    using c = newContext();
    const starter = "vested-transfers";
    const dir = "contract";
    await c.cmd(`new --starter ${starter} --dir ${dir} --no-git --no-install`);
    expect(fs.readdirSync(c.cwd()).length).toEqual(1);
    const starterChalk = chalk.magenta(starter);
    const absDirPath = path.resolve(c.cwd(), dir);
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue(`Downloading contract ${starterChalk} in "${absDirPath}"...`),
      "",
      chalk.green(`Successfully created ${starterChalk} in "${absDirPath}".`),
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
      chalk.cyan(`  cd ${dir}`),
      chalk.cyan("  npm run build"),
      "",
    ]);
  },
  100_000,
);

test.concurrent("new --dir contract | error: already exists", async () => {
  using c = newContext();
  const absDirPath = path.resolve(c.cwd(), "contract");
  fs.mkdirSync(absDirPath);
  await c.cmd("new --dir contract");
  expect(c.flushStdout()).toEqual(
    chalk.red(`Directory already exists at "${absDirPath}".`) + "\n",
  );
});

const newContext = () => {
  const ctx = new Context({ cwd: fs.mkdtempSync("/tmp/xsuite-tests-") });
  return Object.assign(ctx, {
    cmd: (c: string) =>
      ctx.run(() => getCli().parseAsync(c.split(" "), { from: "user" })),
    [Symbol.dispose]() {
      fs.rmSync(ctx.cwd(), { recursive: true, force: true });
    },
  });
};
