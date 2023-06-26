import { test, beforeEach, afterEach } from "node:test";
import { assertAccount } from "xsuite/test";
import {
  readFileHex,
  FWorld,
  FWorldWallet,
  FWorldContract,
} from "xsuite/world";

let fworld: FWorld;
let deployer: FWorldWallet;
let contract: FWorldContract;

beforeEach(async () => {
  fworld = await FWorld.start();
});

afterEach(() => {
  fworld.terminate();
});

test("Test", async () => {
  deployer = await fworld.createWallet({ balance: 10_000_000_000n });
  ({ contract } = await deployer.deployContract({
    code: readFileHex("output/contract.wasm"),
    codeMetadata: [],
    gasLimit: 10_000_000,
  }));
  assertAccount(await contract.getAccountWithPairs(), {
    balance: 0n,
    containsEsdts: [],
    containsStorage: [],
  });
});
