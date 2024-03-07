import { assert, beforeAll, test, afterAll } from 'vitest';
import { assertAccount, d, e, Proxy, CSContract, CSWallet, CSWorld } from 'xsuite';

let world: CSWorld;
let deployerA: CSWallet;
let deployerB: CSWallet;

let contractA: CSContract;
let contractB: CSContract;

beforeAll(async () => {
  world = await CSWorld.start({
    // verbose: true,
    // debug: true,
  });

  // Wallets always need EGLD balance to pay for fees
  deployerA = await world.createWallet({
    balance: '1000000000000000000', // 1 EGLD
  }); // shard 0
  deployerB = await world.createWallet({
    balance: '1000000000000000000', // 1 EGLD
  }); // shard 1
  const resultA = await deployerA.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: ['payable'],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  contractA = resultA.contract;
  const resultB = await deployerB.deployContract({
    code: "file:output/world.wasm",
    codeMetadata: ['payable'],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  contractB = resultB.contract;
}, 30_000);

afterAll(async () => {
  await world.terminate();
}, 30_000);

test('Test', async () => {
  await deployerA.callContract({
    callee: contractA,
    funcName: 'set_n_to_another',
    funcArgs: [e.U64(100), contractB],
    gasLimit: 10_000_000,
  });
  // This works if on same shard with normal sync or async call, not with promises
  assertAccount(await contractB.getAccountWithKvs(), {
    kvs: [
      e.kvs.Mapper('n').Value(e.U64(100)),
    ],
  });
});
