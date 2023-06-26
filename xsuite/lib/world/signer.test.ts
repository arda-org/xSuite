import { afterEach, beforeEach, expect, test } from "@jest/globals";
import mockFs from "mock-fs";
import mockStdin from "mock-stdin";
import { KeystoreSigner } from "./signer";

beforeEach(() => {
  mockFs();
});

afterEach(() => {
  mockFs.restore();
});

test("KeystoreSigner non interactive", async () => {
  KeystoreSigner.createFile("wallet.json", "1234");
  const signer = KeystoreSigner.fromFile("wallet.json", "1234");
  const signature = await signer.sign(Buffer.from(""));
  expect(signature.byteLength).toBeGreaterThan(0);
});

test("KeystoreSigner interactive", async () => {
  const stdin = mockStdin.stdin();
  setTimeout(() => {
    stdin.send("1234\n");
    setTimeout(() => {
      stdin.send("1234\n");
    }, 0);
  }, 0);
  await KeystoreSigner.createFile("wallet.json");
  setTimeout(() => {
    stdin.send("1234\n");
  }, 0);
  const signer = await KeystoreSigner.fromFile("wallet.json");
  const signature = await signer.sign(Buffer.from(""));
  expect(signature.byteLength).toBeGreaterThan(0);
});
