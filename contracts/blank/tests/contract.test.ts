import { test, beforeEach, afterEach } from "node:test";
import { readFileHex, FWorld } from "xsuite/world";

let fworld: FWorld;

beforeEach(async () => {
  fworld = await FWorld.start();
});

afterEach(() => {
  fworld.terminate();
});

test("Test", async () => {
  await fworld.createWallet({ balance: 10_000_000_000n });
  await fworld.createContract({
    code: readFileHex("output/contract.wasm"),
  });
});
