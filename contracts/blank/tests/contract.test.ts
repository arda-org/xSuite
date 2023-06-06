import { afterEach, beforeEach, test } from "@jest/globals";
import { readFileHex, FWorld } from "xsuite/world";

let fworld: FWorld;

beforeEach(async () => {
  fworld = await FWorld.start();
});

afterEach(() => {
  fworld.terminate();
});

test("Test", async () => {
  await fworld.newWallet({ balance: 10_000_000_000n });
  await fworld.newContract({
    code: readFileHex("output", "contract.wasm"),
  });
});
