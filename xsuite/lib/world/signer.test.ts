import path from "node:path";
import { afterEach, beforeEach, expect, test } from "@jest/globals";
import chalk from "chalk";
import tmp from "tmp-promise";
import { stdout } from "../stdio";
import { KeystoreSigner } from "./signer";

let dir: tmp.DirectoryResult;

beforeEach(async () => {
  dir = await tmp.dir({ unsafeCleanup: true });
  process.chdir(dir.path);
});

afterEach(async () => {
  await tmp.setGracefulCleanup();
});

test("KeystoreSigner non-interactive", async () => {
  KeystoreSigner.createFile("wallet.json", "1234");
  const signer = KeystoreSigner.fromFile("wallet.json", "1234");
  const signature = await signer.sign(Buffer.from(""));
  expect(signature.byteLength).toBeGreaterThan(0);
});

test("KeystoreSigner interactive", async () => {
  stdout.start();
  process.nextTick(() => {
    process.stdin.push("1234\n");
    process.nextTick(() => {
      process.stdin.push("1234\n");
    });
  });
  await KeystoreSigner.createFileInteractive("wallet.json");
  process.nextTick(() => {
    process.stdin.push("1234\n");
  });
  const signer = await KeystoreSigner.fromFileInteractive("wallet.json");
  const signature = await signer.sign(Buffer.from(""));
  stdout.stop();
  const walletPath = path.resolve(dir.path, "wallet.json");
  expect(stdout.output).toEqual(
    `Creating new keystore wallet at "${walletPath}"...\n` +
      "Enter password: \n" +
      "Re-enter password: \n" +
      chalk.green("Wallet successfully created.") +
      "\n" +
      `Loading keystore wallet at "${walletPath}"...\n` +
      "Enter password: \n"
  );
  expect(signature.byteLength).toBeGreaterThan(0);
});
