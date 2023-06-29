import { afterEach, beforeEach, expect, test } from "@jest/globals";
import mockStdin from "mock-stdin";
import tmp from "tmp-promise";
import { KeystoreSigner } from "./signer";

beforeEach(async () => {
  const dir = await tmp.dir({ unsafeCleanup: true });
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
  const stdin = mockStdin.stdin();
  setTimeout(() => {
    stdin.send("1234\n");
    setTimeout(() => {
      stdin.send("1234\n");
    }, 0);
  }, 0);
  await KeystoreSigner.createFileInteractive("wallet.json");
  setTimeout(() => {
    stdin.send("1234\n");
  }, 0);
  const signer = await KeystoreSigner.fromFileInteractive("wallet.json");
  const signature = await signer.sign(Buffer.from(""));
  expect(signature.byteLength).toBeGreaterThan(0);
});
