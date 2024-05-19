import { test, beforeEach, afterEach } from "vitest";
import { assertAccount, LSWorld, LSWallet, LSContract } from "xsuite";

let world: LSWorld;
let deployer: LSWallet;
let contract: LSContract;

beforeEach(async () => {
  world = await LSWorld.start();
  deployer = await world.createWallet();
  ({ contract } = await deployer.deployContract({
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 10_000_000,
  }));
});

afterEach(async () => {
  world.terminate();
});

test("Test", async () => {
  assertAccount(await contract.getAccount(), {
    balance: 0n,
    kvs: [],
  });
});
