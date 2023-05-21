import { afterEach, beforeEach, test } from "@jest/globals";
import { readFileHex, FWorld } from "xsuite/test";

let fworld: FWorld;

beforeEach(async () => {
  fworld = await FWorld.start();
});

afterEach(() => {
  fworld.terminate();
});

test("Test", async () => {
  await fworld.newWallet({ value: 10_000_000_000n });
  await fworld.newContract({
    code: readFileHex("output", "contract.wasm"),
  });
});
