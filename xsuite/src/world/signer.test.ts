import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "@jest/globals";
import { input, stdoutInt } from "../_stdio";
import { KeystoreSigner } from "./signer";

const tmpDir = "/tmp/xsuite-cli-tests";
const walletPath = path.resolve(tmpDir, "wallet.json");

beforeEach(() => {
  fs.mkdirSync(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("KeystoreSigner safe", async () => {
  stdoutInt.start();
  input.injected.push("1234", "1234");
  await KeystoreSigner.createFile(walletPath);
  input.injected.push("1234");
  const signer = await KeystoreSigner.fromFile(walletPath);
  const signature = await signer.sign(Buffer.from(""));
  stdoutInt.stop();
  expect(stdoutInt.data.split("\n")).toEqual([
    `Creating keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "Re-enter password: ",
    `Loading keystore wallet at "${walletPath}"...`,
    "Enter password: ",
    "",
  ]);
  expect(signature.byteLength).toBeGreaterThan(0);
});

test("KeystoreSigner unsafe", async () => {
  KeystoreSigner.createFile_unsafe(walletPath, "1234");
  const signer = KeystoreSigner.fromFile_unsafe(walletPath, "1234");
  const signature = await signer.sign(Buffer.from(""));
  expect(signature.byteLength).toBeGreaterThan(0);
});
