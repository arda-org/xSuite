import fs from "fs";
import { test, beforeEach, afterEach, expect } from "@jest/globals";
import tmp from "tmp-promise";
import { newWalletAction } from "./index";

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

test("new-wallet --path wallet.json", async () => {
  process.nextTick(() => {
    process.stdin.push("1234\n");
    process.nextTick(() => {
      process.stdin.push("1234\n");
    });
  });
  await newWalletAction({ path: "wallet.json" });
  expect(fs.existsSync("wallet.json")).toEqual(true);
});

test("new-wallet --path wallet.json --password 1234", async () => {
  await newWalletAction({ path: "wallet.json", password: "1234" });
  expect(fs.existsSync("wallet.json")).toEqual(true);
});
