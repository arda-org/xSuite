import fs from "node:fs";
import path from "node:path";
import { UserSecretKey } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { http } from "msw";
import { setupServer } from "msw/node";
import { test, expect, beforeAll, afterAll } from "vitest";
import { Context } from "../context";
import { getAddressShard } from "../data/utils";
import { Keystore } from "../world/signer";
import { getCli } from "./cli";
import { defaultRustToolchain, rustTarget, rustKey } from "./helpers";
import { getBinaryOs } from "./testScenCmd";

const pemPath = path.resolve("wallets", "wallet.pem");
const keyKeystorePath = path.resolve("wallets", "keystore_key.json");
const mneKeystorePath = path.resolve("wallets", "keystore_mnemonic.json");

const server = setupServer();
beforeAll(() => server.listen());
afterAll(() => server.close());

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

    await server.boundary(async () => {
      server.use(
        http.get("https://devnet-api.multiversx.com/blocks", () =>
          Response.json([{ hash: "" }]),
        ),
        http.get("https://devnet-api.multiversx.com/blocks/latest", () =>
          Response.json({ hash: "" }),
        ),
        http.get(
          `https://devnet-gateway.multiversx.com/address/${signer}/balance`,
          () => {
            const balance = `${BigInt(balances.shift() ?? 0) * 10n ** 18n}`;
            return Response.json({ code: "successful", data: { balance } });
          },
        ),
      );

      c.input("1234", "1234");
      balances = [0, 1];
      await c.cmd(`request-xegld --wallet ${walletPath}`);
      balances = [0, 10];
      await c.cmd(`request-xegld --wallet ${walletPath} --password 1234`);
    })();

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
      `Installing Rust: toolchain ${defaultRustToolchain} & target ${rustTarget}...`,
    ),
    chalk.cyan(
      `$ curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain ${defaultRustToolchain} -t ${rustTarget} -y`,
    ),
    "",
  ]);
});

test.concurrent(
  "new contract && build --locked && build -r && test-rust && test-scen",
  async () => {
    using c = newContext();

    const dir = "contract";
    await c.cmd(`new ${dir}`);
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

    const binaryName = `scenexec-v1.5.22-${getBinaryOs()}`;
    const extractPath = path.resolve(__dirname, "..", "..", "bin", binaryName);
    const binaryPath = path.resolve(extractPath, "scenexec");
    fs.rmSync(extractPath, { recursive: true, force: true });
    await c.cmd("test-scen");
    expect(c.flushStdout().split("\n")).toEqual([
      chalk.blue("Testing contract with scenarios..."),
      `Downloading ${binaryName}...`,
      chalk.cyan(`$ ${binaryPath} .`),
      "",
    ]);
  },
  180_000,
);

test.concurrent(
  "new contract --starter vested-transfers --no-git --no-install",
  async () => {
    using c = newContext();
    const starter = "vested-transfers";
    const dir = "contract";
    await c.cmd(`new ${dir} --starter ${starter} --no-git --no-install`);
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
  180_000,
);

test.concurrent("new contract | error: already exists", async () => {
  using c = newContext();
  const absDirPath = path.resolve(c.cwd(), "contract");
  fs.mkdirSync(absDirPath);
  await c.cmd("new contract");
  expect(c.flushStdout()).toEqual(
    chalk.red(`Directory already exists at "${absDirPath}".`) + "\n",
  );
});

test.concurrent(
  "build-reproducible",
  async () => {
    using c = newContext();
    const tmpDir = c.cwd();

    const sourceCode = path.resolve("./contracts/data");
    await c.cmd(
      `build-reproducible ${sourceCode} --image multiversx/sdk-rust-contract-builder:v8.0.0 --output-dir ${tmpDir}/output -r`,
    );

    const userId = process.getuid?.();
    const groupId = process.getgid?.();
    const userArg = userId && groupId ? `--user ${userId}:${groupId} ` : "";

    expect(c.flushStdout().split("\n")).toEqual([
      `Building contract(s) in "${sourceCode}"...`,
      chalk.cyan(
        `$ docker run ${userArg}--rm --volume ${tmpDir}/output:/output --volume ${sourceCode}:/project --volume /tmp/multiversx_sdk_rust_contract_builder/rust-cargo-target-dir:/rust/cargo-target-dir --volume /tmp/multiversx_sdk_rust_contract_builder/rust-registry:/rust/registry --volume /tmp/multiversx_sdk_rust_contract_builder/rust-git:/rust/git multiversx/sdk-rust-contract-builder:v8.0.0 --project project`,
      ),
      "",
    ]);
  },
  180_000,
);

test.concurrent("verify-reproducible", async () => {
  using c = newContext();
  let hasBeenQueued = false;
  let hasBeenStarted = false;

  const sourceCode = path.resolve("./contracts/output-reproducible/data");
  const tmpDir = c.cwd();
  fs.cpSync(sourceCode, tmpDir, { recursive: true });

  using server = setupServerAndListen();
  await server.boundary(async () => {
    server.use(
      http.post("https://devnet-play-api.multiversx.com/verifier", () => {
        return Response.json({ taskId: "12345" });
      }),
      http.get("https://devnet-play-api.multiversx.com/tasks/12345", () => {
        console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL");
        if (!hasBeenQueued) {
          hasBeenQueued = true;
          return Response.json({
            status: "queued",
          });
        }
        if (!hasBeenStarted) {
          hasBeenStarted = true;
          return Response.json({
            status: "started",
          });
        }
        return Response.json({
          status: "finished",
          result: { status: "success" },
        });
      }),
    );
    await c.cmd(
      "verify-reproducible --sc erd1qqqqqqqqqqqqqpgqttw0lt0plk7zyq27jss5ntgkvrkn8vx3v5ys9e7l6n",
    );
  })();

  expect(c.flushStdout().split("\n")).toEqual([
    `Source file found: "${tmpDir}/data-0.0.0.source.json".`,
    "Image used for the reproducible build: multiversx/sdk-rust-contract-builder:v8.0.0.",
    "Requesting a verification...",
    "Verifying (task 12345)... It may take a while.",
    "Task status: queued",
    '{"status":"queued"}',
    "Task status: started",
    '{"status":"started"}',
    expect.stringMatching(/^Verification finished in \d+(\.\d+)? seconds!$/),
    "",
  ]);
});

test.concurrent("verify-reproducible | error: verification fails", async () => {
  using c = newContext();
  const sourceCode = path.resolve("./contracts/output-reproducible/data");
  const tmpDir = c.cwd();
  fs.cpSync(sourceCode, tmpDir, { recursive: true });

  using server = setupServerAndListen();
  await server.boundary(async () => {
    server.use(
      http.post("https://devnet-play-api.multiversx.com/verifier", () => {
        return Response.json({ taskId: "12345" });
      }),
      http.get("https://devnet-play-api.multiversx.com/tasks/12345", () => {
        return Response.json({
          status: "finished",
          result: { status: "error", message: "message from proxy" },
        });
      }),
    );

    await c.cmd(
      "verify-reproducible --sc erd1qqqqqqqqqqqqqpgqttw0lt0plk7zyq27jss5ntgkvrkn8vx3v5ys9e7l6n",
    );
  })();

  expect(c.flushStdout().split("\n")).toEqual([
    `Source file found: "${tmpDir}/data-0.0.0.source.json".`,
    "Image used for the reproducible build: multiversx/sdk-rust-contract-builder:v8.0.0.",
    "Requesting a verification...",
    "Verifying (task 12345)... It may take a while.",
    chalk.red(
      "An error occured during verification. Message: message from proxy",
    ),
    "",
  ]);
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

const setupServerAndListen = () => {
  const server = setupServer();
  server.listen();
  return Object.assign(server, {
    [Symbol.dispose]() {
      server.close();
    },
  });
};
