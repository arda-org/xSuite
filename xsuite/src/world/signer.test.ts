import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { input, stdoutInt } from "../_stdio";
import { u8aToHex } from "../data/utils";
import { KeystoreSigner } from "./signer";

let tmpDir: string;
let walletPath: string;
const keyKeystorePath = path.resolve("wallets", "keystore_key.json");
const mneKeystorePath = path.resolve("wallets", "keystore_mnemonic.json");

beforeEach(() => {
  tmpDir = fs.mkdtempSync("/tmp/xsuite-tests-");
  walletPath = path.resolve(tmpDir, "wallet.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("KeystoreSigner.fromFile_unsafe - keystore key", async () => {
  const signer = KeystoreSigner.fromFile_unsafe(
    keyKeystorePath,
    "qpGjv7ZJ9gcPXWSN",
  );
  expect(signer.toString()).toEqual(
    "erd143cjn0e95e0wp8e4qt0m55pewrmdrcry4sf3uh5vuz8k75d34u9sarlv8d",
  );
  const signature = await signer.sign(new TextEncoder().encode("message"));
  expect(u8aToHex(signature)).toEqual(
    "690088fdb51a17cb2a0da327c89835c0ecd928e4e5c1eae7811453ab88dd3c629446675752bcc0acbc8a0d84c9655996f0b7bbb3b3155a594770b7b3b6540f0f",
  );
});

test("KeystoreSigner.fromFile_unsafe - keystore mnemonic", async () => {
  const signer = KeystoreSigner.fromFile_unsafe(mneKeystorePath, "1234");
  expect(signer.toString()).toEqual(
    "erd1jdf0xwqrx9y47mlp6n5q29wlk7jh2p63j3raekknhky3f2f6668qzjwmee",
  );
  const signature = await signer.sign(new TextEncoder().encode("message"));
  expect(u8aToHex(signature)).toEqual(
    "316411a3656c30780c1f8317d568b8e6c48802fcbb54578ccee01a7e0de59782cc5ebe374cec313efd390797b426ba2e325b8c20c47cce9a4bb2467f1d999d0f",
  );
});

test("KeystoreSigner.fromFile", async () => {
  stdoutInt.start();
  input.inject("1234");
  const signer = await KeystoreSigner.fromFile(mneKeystorePath);
  expect(signer.toString()).toEqual(
    "erd1jdf0xwqrx9y47mlp6n5q29wlk7jh2p63j3raekknhky3f2f6668qzjwmee",
  );
  const signature = await signer.sign(new TextEncoder().encode("message"));
  expect(u8aToHex(signature)).toEqual(
    "316411a3656c30780c1f8317d568b8e6c48802fcbb54578ccee01a7e0de59782cc5ebe374cec313efd390797b426ba2e325b8c20c47cce9a4bb2467f1d999d0f",
  );
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Loading keystore wallet at "${mneKeystorePath}"...`,
    "Enter password: ",
    "",
  ]);
});

test("KeystoreSigner.fromFile - ENOENT", async () => {
  stdoutInt.start();
  await expect(KeystoreSigner.fromFile(walletPath)).rejects.toThrow(
    `ENOENT: no such file or directory, open '${walletPath}'`,
  );
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Loading keystore wallet at "${walletPath}"...`,
    "",
  ]);
});
