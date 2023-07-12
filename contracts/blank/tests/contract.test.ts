import { test, beforeEach, afterEach } from "vitest";
import { assertAccount } from "xsuite/assert";
import { FWorld, FWorldWallet, FWorldContract } from "xsuite/world";

let world: FWorld;
let deployer: FWorldWallet;
let contract: FWorldContract;

beforeEach(async () => {
  world = await FWorld.start();
  deployer = await world.createWallet();
  ({ contract } = await deployer.deployContract({
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 10_000_000,
  }));
});

afterEach(async () => {
  await world.terminate();
});

test("Test", async () => {
  assertAccount(await contract.getAccountWithPairs(), {
    balance: 0n,
    hasPairs: [],
  });
});
