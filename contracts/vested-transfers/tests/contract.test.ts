import { test, beforeEach, afterEach } from "vitest";
import {
  assertAccount,
  assertHexList,
  e,
  SWorld,
  SWallet,
  SContract,
} from "xsuite";

let world: SWorld;
let deployer: SWallet;
let contract: SContract;
let sender1: SWallet;
let sender2: SWallet;
let receiver1: SWallet;
let receiver2: SWallet;
let executor: SWallet;
const egldId = "EGLD";
const sftId = "SFT-abcdef";

beforeEach(async () => {
  world = await SWorld.start();
  deployer = await world.createWallet();
  ({ contract } = await deployer.deployContract({
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 10_000_000,
  }));
  sender1 = await world.createWallet({
    balance: 100_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 100_000 }] },
  });
  receiver1 = await world.createWallet();
  sender2 = await world.createWallet({
    balance: 100_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 100_000 }] },
  });
  receiver2 = await world.createWallet();
  executor = await world.createWallet();
});

afterEach(async () => {
  world.terminate();
});

test("EGLD transfer vested over epochs 5, 10, 15. Execute at epochs 4, 5, 15. Claim.", async () => {
  // Create transfer at epoch 0
  const result1 = await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(
        e.Tuple(e.U64(5), e.U(2000)),
        e.Tuple(e.U64(10), e.U(3000)),
        e.Tuple(e.U64(15), e.U(5000)),
      ),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  assertHexList(result1.returnData, [e.U64(1)]);
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(egldId),
                e.U64(0),
                e.List(
                  e.Tuple(e.U64(5), e.U(2000)),
                  e.Tuple(e.U64(10), e.U(3000)),
                  e.Tuple(e.U64(15), e.U(5000)),
                ),
              ),
            ],
          ],
        },
      ],
    },
  });

  // Execute transfer at epoch 4
  await world.setCurrentBlockInfo({ epoch: 4 });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(egldId),
                e.U64(0),
                e.List(
                  e.Tuple(e.U64(5), e.U(2000)),
                  e.Tuple(e.U64(10), e.U(3000)),
                  e.Tuple(e.U64(15), e.U(5000)),
                ),
              ),
            ],
          ],
        },
      ],
    },
  });

  // Execute transfer at epoch 5
  await world.setCurrentBlockInfo({ epoch: 5 });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(egldId),
                e.U64(0),
                e.List(
                  e.Tuple(e.U64(10), e.U(3000)),
                  e.Tuple(e.U64(15), e.U(5000)),
                ),
              ),
            ],
          ],
        },
        {
          key: ["balances", receiver1],
          map: [[1, e.Tuple(e.Str(egldId), e.U64(0)), e.U(2_000)]],
        },
      ],
    },
  });

  // Execute transfer at epoch 15
  await world.setCurrentBlockInfo({ epoch: 15 });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: ["balances", receiver1],
          map: [[1, e.Tuple(e.Str(egldId), e.U64(0)), e.U(10_000)]],
        },
      ],
    },
  });

  // Claim balances
  await receiver1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(egldId), e.U64(0))],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 10_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 0,
    kvs: { mappers: [{ key: "max_transfer_index", value: e.U64(1) }] },
  });
});

test("SFT transfer vested over epochs 5, 10, 15. Execute at epoch 20. Claim.", async () => {
  // Create transfer at epoch 0
  const result1 = await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(
        e.Tuple(e.U64(5), e.U(2000)),
        e.Tuple(e.U64(10), e.U(3000)),
        e.Tuple(e.U64(15), e.U(5000)),
      ),
    ],
    esdts: [{ id: sftId, nonce: 1, amount: 10_000 }],
    gasLimit: 10_000_000,
  });
  assertHexList(result1.returnData, [e.U64(1)]);
  assertAccount(await sender1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 90_000 }] },
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 0 }] },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    kvs: {
      esdts: [{ id: sftId, nonce: 1, amount: 10_000 }],
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(sftId),
                e.U64(1),
                e.List(
                  e.Tuple(e.U64(5), e.U(2000)),
                  e.Tuple(e.U64(10), e.U(3000)),
                  e.Tuple(e.U64(15), e.U(5000)),
                ),
              ),
            ],
          ],
        },
      ],
    },
  });

  // Execute transfer at epoch 20
  await world.setCurrentBlockInfo({ epoch: 20 });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 90_000 }] },
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 0 }] },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    kvs: {
      esdts: [{ id: sftId, nonce: 1, amount: 10_000 }],
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: ["balances", receiver1],
          map: [[1, e.Tuple(e.Str(sftId), e.U64(1)), e.U(10_000)]],
        },
      ],
    },
  });

  // Claim balances
  await receiver1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(sftId), e.U64(1))],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 90_000 }] },
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: sftId, nonce: 1, amount: 10_000 }] },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 0,
    kvs: { mappers: [{ key: "max_transfer_index", value: e.U64(1) }] },
  });
});

test("EGLD transfer vested over epochs 5, 10. Cancelled at epoch 7. Claim.", async () => {
  // Create transfer at epoch 0
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(egldId),
                e.U64(0),
                e.List(
                  e.Tuple(e.U64(5), e.U(3000)),
                  e.Tuple(e.U64(10), e.U(7000)),
                ),
              ),
            ],
          ],
        },
      ],
    },
  });

  // Cancel transfer at epoch 7
  await world.setCurrentBlockInfo({ epoch: 7 });
  await sender1.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 0,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: ["balances", sender1],
          map: [[1, e.Tuple(e.Str(egldId), e.U64(0)), e.U(7_000)]],
        },
        {
          key: ["balances", receiver1],
          map: [[1, e.Tuple(e.Str(egldId), e.U64(0)), e.U(3_000)]],
        },
      ],
    },
  });

  // Claim balances
  await sender1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(egldId), e.U64(0))],
    gasLimit: 10_000_000,
  });
  await receiver1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(egldId), e.U64(0))],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 97_000,
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 3_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 0,
    kvs: { mappers: [{ key: "max_transfer_index", value: e.U64(1) }] },
  });
});

test("EGLD transfer to oneself over epochs 5, 10. Cancelled at epoch 7. Claim.", async () => {
  // Create transfer at epoch 0
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      sender1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                sender1,
                e.Str(egldId),
                e.U64(0),
                e.List(
                  e.Tuple(e.U64(5), e.U(3000)),
                  e.Tuple(e.U64(10), e.U(7000)),
                ),
              ),
            ],
          ],
        },
      ],
    },
  });

  // Cancel transfer at epoch 7
  await world.setCurrentBlockInfo({ epoch: 7 });
  await sender1.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 90_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10_000,
    kvs: {
      mappers: [
        { key: "max_transfer_index", value: e.U64(1) },
        {
          key: ["balances", sender1],
          map: [[1, e.Tuple(e.Str(egldId), e.U64(0)), e.U(10_000)]],
        },
      ],
    },
  });

  // Claim balances
  await sender1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(egldId), e.U64(0))],
    gasLimit: 10_000_000,
  });
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 100_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 0,
    kvs: { mappers: [{ key: "max_transfer_index", value: e.U64(1) }] },
  });
});

test("Multiple transfers.", async () => {
  // Create transfers at epoch 0
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver2,
      e.List(e.Tuple(e.U64(5), e.U(6000)), e.Tuple(e.U64(10), e.U(9000))),
    ],
    esdts: [{ id: sftId, nonce: 1, amount: 15_000 }],
    gasLimit: 10_000_000,
  });
  await sender2.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(4000)), e.Tuple(e.U64(10), e.U(6000))),
    ],
    esdts: [{ id: sftId, nonce: 1, amount: 10_000 }],
    gasLimit: 10_000_000,
  });
  await sender2.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver2,
      e.List(e.Tuple(e.U64(5), e.U(1000)), e.Tuple(e.U64(10), e.U(14000))),
    ],
    value: 15_000,
    gasLimit: 10_000_000,
  });

  // Cancel half transfers at epoch 6
  await world.setCurrentBlockInfo({ epoch: 6 });
  await sender1.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  await sender2.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(3)],
    gasLimit: 10_000_000,
  });

  // Execute half transfers at epoch 10
  await world.setCurrentBlockInfo({ epoch: 10 });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  await executor.callContract({
    callee: contract,
    funcName: "executeTransfer",
    funcArgs: [e.U64(4)],
    gasLimit: 10_000_000,
  });

  // Claim balances
  await sender1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(egldId), e.U64(0))],
    gasLimit: 10_000_000,
  });
  await sender2.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [e.Tuple(e.Str(sftId), e.U64(1))],
    gasLimit: 10_000_000,
  });
  await receiver1.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [
      e.Tuple(e.Str(egldId), e.U64(0)),
      e.Tuple(e.Str(sftId), e.U64(1)),
    ],
    gasLimit: 10_000_000,
  });
  await receiver2.callContract({
    callee: contract,
    funcName: "claimBalances",
    funcArgs: [
      e.Tuple(e.Str(egldId), e.U64(0)),
      e.Tuple(e.Str(sftId), e.U64(1)),
    ],
    gasLimit: 10_000_000,
  });

  // Asserts
  assertAccount(await sender1.getAccountWithKvs(), {
    balance: 97_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 85_000 }] },
  });
  assertAccount(await sender2.getAccountWithKvs(), {
    balance: 85_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 96_000 }] },
  });
  assertAccount(await receiver1.getAccountWithKvs(), {
    balance: 3_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 4_000 }] },
  });
  assertAccount(await receiver2.getAccountWithKvs(), {
    balance: 15_000,
    kvs: { esdts: [{ id: sftId, nonce: 1, amount: 15_000 }] },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 0,
    kvs: { mappers: [{ key: "max_transfer_index", value: e.U64(4) }] },
  });
});

test("getTransfers", async () => {
  // Create transfers at epoch 0
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    esdts: [{ id: sftId, nonce: 1, amount: 10000 }],
    value: 10_000,
    gasLimit: 10_000_000,
  });

  // Query getTransfers
  const result = await world.query({
    callee: contract,
    funcName: "getTransfers",
  });
  assertHexList(result.returnData, [
    e.Tuple(
      e.U64(1),
      e.Tuple(
        sender1,
        receiver1,
        e.Str(egldId),
        e.U64(0),
        e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
      ),
    ),
    e.Tuple(
      e.U64(2),
      e.Tuple(
        sender1,
        receiver1,
        e.Str(sftId),
        e.U64(1),
        e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
      ),
    ),
  ]);
});

test("getAddressBalances", async () => {
  // Create transfers at epoch 0 and cancel transfers at epoch 7
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    esdts: [{ id: sftId, nonce: 1, amount: 10000 }],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  await world.setCurrentBlockInfo({ epoch: 7 });
  await sender1.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  await sender1.callContract({
    callee: contract,
    funcName: "cancelTransfer",
    funcArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });

  // Query getAddressBalances
  const result1 = await world.query({
    callee: contract,
    funcName: "getAddressBalances",
    funcArgs: [sender1],
  });
  assertHexList(result1.returnData, [
    e.Tuple(e.Str(egldId), e.U64(0), e.U(7_000)),
    e.Tuple(e.Str(sftId), e.U64(1), e.U(7_000)),
  ]);
  const result2 = await world.query({
    callee: contract,
    funcName: "getAddressBalances",
    funcArgs: [receiver1],
  });
  assertHexList(result2.returnData, [
    e.Tuple(e.Str(egldId), e.U64(0), e.U(3_000)),
    e.Tuple(e.Str(sftId), e.U64(1), e.U(3_000)),
  ]);
});

test("Invalid canceller.", async () => {
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [
      receiver1,
      e.List(e.Tuple(e.U64(5), e.U(3000)), e.Tuple(e.U64(10), e.U(7000))),
    ],
    value: 10_000,
    gasLimit: 10_000_000,
  });
  await receiver1
    .callContract({
      callee: contract,
      funcName: "cancelTransfer",
      funcArgs: [e.U64(1)],
      gasLimit: 10_000_000,
    })
    .assertFail({
      code: 4,
      message: "Caller is not the sender of the transfer.",
    });
});

test("Too many milestones.", async () => {
  const limit = 20;
  const milestones = Array.from({ length: limit + 1 }, (_, i) =>
    e.Tuple(e.U64(i + 1), e.U(1_000)),
  );
  await sender1
    .callContract({
      callee: contract,
      funcName: "createTransfer",
      funcArgs: [receiver1, e.List(...milestones)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "Too many milestones." });
  milestones.pop();
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [receiver1, e.List(...milestones)],
    value: limit * 1_000,
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: limit * 1_000,
    hasKvs: {
      mappers: [
        {
          key: "transfers",
          map: [
            [
              1,
              e.U64(1),
              e.Tuple(
                sender1,
                receiver1,
                e.Str(egldId),
                e.U64(0),
                e.List(...milestones),
              ),
            ],
          ],
        },
      ],
    },
  });
});

test("Milestone not in future.", async () => {
  await sender1
    .callContract({
      callee: contract,
      funcName: "createTransfer",
      funcArgs: [receiver1, e.List(e.Tuple(e.U64(0), e.U(1000)))],
      gasLimit: 10_000_000,
    })
    .assertFail({
      code: 4,
      message:
        "Milestones epochs are not in strictly increasing order from current epoch.",
    });
});

test("Mis-ordered milestones.", async () => {
  await sender1
    .callContract({
      callee: contract,
      funcName: "createTransfer",
      funcArgs: [
        receiver1,
        e.List(e.Tuple(e.U64(2), e.U(1000)), e.Tuple(e.U64(1), e.U(1000))),
      ],
      gasLimit: 10_000_000,
    })
    .assertFail({
      code: 4,
      message:
        "Milestones epochs are not in strictly increasing order from current epoch.",
    });
});

test("Wrong milestones amounts.", async () => {
  await sender1
    .callContract({
      callee: contract,
      funcName: "createTransfer",
      funcArgs: [
        receiver1,
        e.List(e.Tuple(e.U64(1), e.U(1000)), e.Tuple(e.U64(2), e.U(1000))),
      ],
      value: 2_500,
      gasLimit: 10_000_000,
    })
    .assertFail({
      code: 4,
      message: "Release schedule amounts don't sum up to total amount.",
    });
});

test("Wrong transfer index.", async () => {
  await sender1.callContract({
    callee: contract,
    funcName: "createTransfer",
    funcArgs: [receiver1, e.List(e.Tuple(e.U64(1), e.U(1000)))],
    value: 1_000,
    gasLimit: 10_000_000,
  });
  await executor
    .callContract({
      callee: contract,
      funcName: "executeTransfer",
      funcArgs: [e.U64(2)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "No transfer with this index." });
});
