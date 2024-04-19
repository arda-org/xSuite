import { afterAll, beforeAll, test } from "vitest";
import { assertAccount, CSContract, CSWallet, CSWorld, e } from "xsuite";

let world: CSWorld;
let deployerA: CSWallet;
let deployerB: CSWallet;

let contractA: CSContract;
let contractB: CSContract;

beforeAll(async () => {
  world = await CSWorld.start({
    // debug: true,
  });

  // Wallets always need EGLD balance to pay for fees
  await world.setAccount({
    address: "erd1p58fu6j78glh3aj7vgmaklneypyvj4f9kjrg7a49x68ftnq8vuqq2aalk3",
    balance: "1000000000000000000", // 1 EGLD
  }); // shard 0
  deployerA = world.newWallet(
    "erd1p58fu6j78glh3aj7vgmaklneypyvj4f9kjrg7a49x68ftnq8vuqq2aalk3",
  );
  await world.createWallet({
    address: "erd1vyhn62vj0lxpsmkdjuzple6qc3nnag4zwu733f0863fh87hgwltskca22m",
    balance: "1000000000000000000", // 1 EGLD
  }); // shard 1
  deployerB = world.newWallet(
    "erd1vyhn62vj0lxpsmkdjuzple6qc3nnag4zwu733f0863fh87hgwltskca22m",
  );

  // generate 20 blocks to pass an epoch so system smart contracts are enabled
  await world.generateBlocksUntilEpochReached(1);

  const resultA = await deployerA.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: ["payable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  contractA = resultA.contract;
  const resultB = await deployerB.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: ["payable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  contractB = resultB.contract;
}, 30_000);

afterAll(async () => {
  await world.terminate();
}, 30_000);

test("Test", async () => {
  await deployerA.callContract({
    callee: contractA,
    funcName: "set_n_to_another",
    funcArgs: [e.U64(100), contractB],
    gasLimit: 10_000_000,
  });
  // This works if on same shard with normal sync or async call, not with promises
  assertAccount(await contractB.getAccountWithKvs(), {
    kvs: [e.kvs.Mapper("n").Value(e.U64(100))],
  });
});
