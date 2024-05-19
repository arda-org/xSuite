import { afterAll, beforeAll, test } from "vitest";
import { assertAccount, CSWorld, e } from "xsuite";
import { egldUnit } from "./helpers";

let world: CSWorld;

beforeAll(async () => {
  world = await CSWorld.start();
});

afterAll(async () => {
  world.terminate();
});

test("Test", async () => {
  const deployerA = await world.createWallet({
    address: { shard: 0 },
    balance: egldUnit,
  });
  const deployerB = await world.createWallet({
    address: { shard: 1 },
    balance: egldUnit,
  });

  const { contract: contractA } = await deployerA.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: [],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  const { contract: contractB } = await deployerB.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: [],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });

  await deployerA.callContract({
    callee: contractA,
    funcName: "set_n_to_another",
    funcArgs: [e.U64(100), contractB],
    gasLimit: 10_000_000,
  });
  assertAccount(await contractB.getAccount(), {
    kvs: [e.kvs.Mapper("n").Value(e.U64(100))],
  });
});
