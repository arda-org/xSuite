import { expect, test } from "vitest";
import { assertAccount, assertVs } from "../assert";
import { e } from "../data";
import {
  zeroBechAddress,
  zeroHexAddress,
  zeroU8AAddress,
} from "../data/address";
import { getAddressShard, getAddressType } from "../data/utils";
import { LSWorld } from "./lsworld";
import { createAddressLike } from "./utils";
import { expandCode } from "./world";

const fftId = "FFT-abcdef";
const sftId = "SFT-abcdef";
const worldCode = "file:contracts/world/output/world.wasm";
const emptyAccount = {
  nonce: 0,
  balance: 0,
  code: "",
  codeHash: "",
  codeMetadata: "",
  owner: "",
  kvs: {},
};
const baseExplorerUrl = "http://explorer.local";

test.concurrent("LSWorld.start - port 3000", async () => {
  using world = await LSWorld.start({ binaryPort: 3000 });
  expect(world.proxy.proxyUrl).toEqual("http://127.0.0.1:3000");
});

test.concurrent(
  "LSWorld.proxy.getAccountNonce on empty bech address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountNonce(zeroBechAddress)).toEqual(0);
  },
);

test.concurrent(
  "LSWorld.proxy.getAccountNonce on empty hex address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountNonce(zeroHexAddress)).toEqual(0);
  },
);

test.concurrent(
  "LSWorld.proxy.getAccountNonce on empty U8A address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountNonce(zeroU8AAddress)).toEqual(0);
  },
);

test.concurrent(
  "LSWorld.proxy.getAccountBalance on empty bech address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountBalance(zeroBechAddress)).toEqual(0n);
  },
);

test.concurrent(
  "LSWorld.proxy.getAccountBalance on empty hex address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountBalance(zeroHexAddress)).toEqual(0n);
  },
);

test.concurrent(
  "LSWorld.proxy.getAccountBalance on empty U8A address",
  async () => {
    using world = await LSWorld.start();
    expect(await world.proxy.getAccountBalance(zeroU8AAddress)).toEqual(0n);
  },
);

test.concurrent("LSWorld.proxy.getAccount on empty bech address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.proxy.getAccount(zeroBechAddress), emptyAccount);
});

test.concurrent("LSWorld.proxy.getAccount on empty hex address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.proxy.getAccount(zeroHexAddress), emptyAccount);
});

test.concurrent("LSWorld.proxy.getAccount on empty U8A address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.proxy.getAccount(zeroU8AAddress), emptyAccount);
});

test.concurrent("LSWorld.new with defined chainId", () => {
  expect(() => LSWorld.new({ chainId: "D" })).toThrow(
    "chainId is not undefined.",
  );
});

test.concurrent("LSWorld.newDevnet", () => {
  expect(() => LSWorld.newDevnet()).toThrow("newDevnet is not implemented.");
});

test.concurrent("LSWorld.newTestnet", () => {
  expect(() => LSWorld.newTestnet()).toThrow("newTestnet is not implemented.");
});

test.concurrent("LSWorld.newMainnet", () => {
  expect(() => LSWorld.newMainnet()).toThrow("newMainnet is not implemented.");
});

test.concurrent("LSWorld.newWallet", async () => {
  using world = await LSWorld.start();
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test.concurrent("LSWorld.newContract", async () => {
  using world = await LSWorld.start();
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test.concurrent("LSWorld.createWallet - empty wallet", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const wallet = await world.createWallet();
  expect(wallet.explorerUrl).toEqual(`${baseExplorerUrl}/accounts/${wallet}`);
  expect(getAddressType(wallet)).toEqual("wallet");
  assertAccount(await wallet.getAccount(), {});
});

test.concurrent("LSWorld.createWallet - with balance", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 10n });
  assertAccount(await wallet.getAccount(), { balance: 10n });
});

test.concurrent("LSWorld.createWallet - with address & balance", async () => {
  using world = await LSWorld.start();
  const address = createAddressLike("wallet");
  const wallet = await world.createWallet({ address, balance: 10n });
  assertAccount(await wallet.getAccount(), { address, balance: 10n });
});

test.concurrent("LSWorld.createWallet - with shard", async () => {
  using world = await LSWorld.start();
  const wallet0 = await world.createWallet({ address: { shard: 0 } });
  const wallet1 = await world.createWallet({ address: { shard: 1 } });
  const wallet2 = await world.createWallet({ address: { shard: 2 } });
  expect(getAddressType(wallet0)).toEqual("wallet");
  expect(getAddressShard(wallet0)).toEqual(0);
  expect(getAddressType(wallet1)).toEqual("wallet");
  expect(getAddressShard(wallet1)).toEqual(1);
  expect(getAddressType(wallet2)).toEqual("wallet");
  expect(getAddressShard(wallet2)).toEqual(2);
});

test.concurrent("LSWorld.createContract - empty contract", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const contract = await world.createContract();
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  expect(getAddressType(contract)).toEqual("vmContract");
  assertAccount(await contract.getAccount(), { code: "" });
});

test.concurrent("LSWorld.createContract - with balance", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({ balance: 10n });
  assertAccount(await contract.getAccount(), { balance: 10n });
});

test.concurrent("LSWorld.createContract - with file:", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccount(), { code: worldCode });
});

test.concurrent("LSWorld.createContract - with address & file:", async () => {
  using world = await LSWorld.start();
  const address = createAddressLike("vmContract");
  const contract = await world.createContract({ address, code: worldCode });
  assertAccount(await contract.getAccount(), { address, code: worldCode });
});

test.concurrent("LSWorld.createContract - with shard", async () => {
  using world = await LSWorld.start();
  const contract0 = await world.createContract({ address: { shard: 0 } });
  const contract1 = await world.createContract({ address: { shard: 1 } });
  const contract2 = await world.createContract({ address: { shard: 2 } });
  expect(getAddressType(contract0)).toEqual("vmContract");
  expect(getAddressShard(contract0)).toEqual(0);
  expect(getAddressType(contract1)).toEqual("vmContract");
  expect(getAddressShard(contract1)).toEqual(1);
  expect(getAddressType(contract2)).toEqual("vmContract");
  expect(getAddressShard(contract2)).toEqual(2);
});

test.concurrent("LSWorld.getAccountNonce", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ nonce: 10 });
  expect(await world.getAccountNonce(wallet)).toEqual(10);
});

test.concurrent("LSWorld.getAccountBalance", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 1234 });
  expect(await world.getAccountBalance(wallet)).toEqual(1234n);
});

test.concurrent("LSWorld.getAccountValue - non-present key", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await world.getAccountValue(wallet, "02")).toEqual("");
});

test.concurrent("LSWorld.getAccountValue - present key", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await world.getAccountValue(wallet, "01")).toEqual("11");
});

test.concurrent("LSWorld.getAccountKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  expect(await world.getAccountKvs(wallet)).toEqual(
    e.kvs([[e.Str("n"), e.U(1)]]),
  );
});

test.concurrent("LSWorld.getAccountWithoutKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  assertAccount(await world.getAccountWithoutKvs(wallet), { kvs: {} });
});

test.concurrent("LSWorld.getAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  assertAccount(await world.getAccount(wallet), {
    kvs: [[e.Str("n"), e.U(1)]],
  });
});

test.concurrent("LSWorld.getAllSerializableAccounts", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    address: { shard: 1 },
    balance: 10n ** 18n,
    kvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
  const contract = await wallet.createContract({
    balance: 10n ** 18n,
    code: "00",
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  expect(await world.getAllSerializableAccounts()).toEqual(
    [
      e.account({
        address: wallet,
        balance: 10n ** 18n,
        code: "",
        codeHash: "",
        codeMetadata: ["readable"],
        kvs: {
          esdts: [{ id: fftId, amount: 10n ** 18n }],
        },
        nonce: 0,
        owner: "",
      }),
      e.account({
        address: contract,
        balance: 10n ** 18n,
        code: "00",
        codeHash:
          "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
        codeMetadata: ["readable"],
        kvs: {
          esdts: [{ id: fftId, amount: 10n ** 18n }],
          mappers: [{ key: "n", value: e.U64(2) }],
        },
        nonce: 0,
        owner: wallet,
      }),
    ].sort((a, b) => a.address.localeCompare(b.address)),
  );
});

test.concurrent("LSWorld.setAccounts", async () => {
  using world = await LSWorld.start();
  const walletAddress = createAddressLike("wallet");
  const contractAddress = createAddressLike("vmContract");
  await world.setAccounts([
    {
      address: walletAddress,
      balance: 10n ** 19n,
      kvs: {
        esdts: [{ id: fftId, amount: 10n ** 19n }],
      },
    },
    {
      address: contractAddress,
      balance: 1234,
      code: expandCode(worldCode),
      codeMetadata: ["upgradeable"],
      kvs: [[e.Str("n"), e.U64(10)]],
      owner: walletAddress,
    },
  ]);
  assertAccount(await world.getAccount(walletAddress), {
    address: walletAddress,
    balance: 10n ** 19n,
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 19n }],
    },
  });
  assertAccount(await world.getAccount(contractAddress), {
    address: contractAddress,
    balance: 1234,
    code: worldCode,
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: walletAddress,
  });
});

test.concurrent("LSWorld.setAccount", async () => {
  using world = await LSWorld.start();
  const walletAddress = createAddressLike("wallet");
  const contractAddress = createAddressLike("vmContract");
  await world.setAccount({
    address: contractAddress,
    balance: 1234,
    code: "00",
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: walletAddress,
  });
  assertAccount(await world.getAccount(contractAddress), {
    address: contractAddress,
    balance: 1234,
    code: "00",
    codeHash:
      "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: walletAddress,
  });
});

test.concurrent("LSWorld.setCurrentBlockInfo", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  await world.setCurrentBlockInfo({
    epoch: 100,
    nonce: 200,
    round: 300,
    timestamp: 400,
  });
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_current_block_info",
  });
  assertVs(returnData, [e.U64(100), e.U64(200), e.U64(300), e.U64(400)]);
});

test.concurrent("LSWorld.setPreviousBlockInfo", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  await world.setPreviousBlockInfo({
    epoch: 10,
    nonce: 20,
    round: 30,
    timestamp: 40,
  });
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_prev_block_info",
  });
  assertVs(returnData, [e.U64(10), e.U64(20), e.U64(30), e.U64(40)]);
});

test.concurrent("LSWorld.query - basic", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test.concurrent("LSWorld.query - sender", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("LSWorld.query - value", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test.concurrent("LSWorld.query.assertFail - correct parameters", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  await world
    .query({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test.concurrent("LSWorld.executeTxs", async () => {
  using world = await LSWorld.start();
  const { wallet, wallet2, wallet3 } = await createAccounts(world);
  const [{ fee: fee1 }, { fee: fee2 }] = await world.executeTxs([
    {
      sender: wallet,
      receiver: wallet2,
      value: 10n ** 17n,
      gasLimit: 10_000_000,
    },
    {
      sender: wallet,
      receiver: wallet3,
      value: 10n ** 17n,
      gasLimit: 10_000_000,
    },
  ]);
  assertAccount(await wallet.getAccount(), {
    balance: 8n * 10n ** 17n - fee1 - fee2,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
  assertAccount(await wallet3.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("LSWorld.executeTx", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet, wallet2 } = await createAccounts(world);
  const { hash, explorerUrl, gasUsed, fee } = await world.executeTx({
    sender: wallet,
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("LSWorld.transfer", async () => {
  using world = await LSWorld.start();
  const { wallet, wallet2 } = await createAccounts(world);
  const { fee } = await world.transfer({
    sender: wallet,
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent(
  "LSWorld.transfer - invalid tx - gasLimit too low",
  async () => {
    using world = await LSWorld.start();
    const { wallet } = await createAccounts(world);
    await expect(
      world.transfer({
        sender: wallet,
        receiver: wallet,
        value: 0,
        gasLimit: 0,
      }),
    ).rejects.toThrow("insufficient gas limit");
  },
);

test.concurrent(
  "LSWorld.doTransfers - invalid tx - gasLimit too low",
  async () => {
    using world = await LSWorld.start();
    const { wallet } = await createAccounts(world);
    await expect(
      world.doTransfers([
        {
          sender: wallet,
          receiver: wallet,
          value: 0,
          gasLimit: 0,
        },
      ]),
    ).rejects.toThrow(
      "Only 0 of 1 transactions were sent. The other ones were invalid.",
    );
  },
);

test.concurrent("LSWorld.deployContract", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet } = await createAccounts(world);
  const { contract } = await world.deployContract({
    sender: wallet,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  expect(getAddressType(contract)).toEqual("vmContract");
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("LSWorld.upgradeContract", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await contract.setAccount({
    code: worldCode,
    codeMetadata: ["upgradeable"],
    owner: wallet,
  });
  await world.upgradeContract({
    sender: wallet,
    callee: contract,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("LSWorld.callContract", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { fee } = await world.callContract({
    sender: wallet,
    callee: contract,
    funcName: "fund",
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n + 10n ** 17n,
  });
});

test.concurrent("LSWorld.terminate", async () => {
  using world = await LSWorld.start();
  expect(world.server?.killed).toEqual(false);
  world.terminate();
  expect(world.server?.killed).toEqual(true);
});

test.concurrent("LSWallet.query", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("LSWallet.query - try to change the state", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
  });
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
  await wallet.query({
    callee: contract,
    funcName: "fund",
    value: 10,
  });
  await wallet.query({
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(100)],
  });
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
  });
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.todo("LSWallet.query - esdts", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_esdts",
    esdts: [
      { id: fftId, amount: 10 },
      { id: sftId, nonce: 1, amount: 20 },
    ],
  } as any); // remove the "as any"
  assertVs(returnData, [
    e.Tuple(e.Str(fftId), e.U64(0), e.U(10)),
    e.Tuple(e.Str(sftId), e.U64(1), e.U(20)),
  ]);
});

test.concurrent("LSWallet.callContract failure", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  await expect(
    world.query({
      callee: contract,
      funcName: "non_existent_function",
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^Query failed: 1 - invalid function \(not found\) - Result:\n\{\n {2}"executionLogs": "(.*)",/,
    ),
    stack: expect.stringMatching(/src\/world\/lsworld\.test\.ts:[0-9]+:[0-9]+/),
  });
});

test.concurrent("LSWallet.getAccountNonce", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test.concurrent("LSWallet.getAccountBalance", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test.concurrent("LSWallet.getAccountValue", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await wallet.getAccountValue("01")).toEqual("11");
});

test.concurrent("LSWallet.getAccountKvs", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 10n ** 18n }] }),
  );
});

test.concurrent("LSWallet.getAccountWithoutKvs", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  assertAccount(await wallet.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
  });
});

test.concurrent("LSWallet.getAccount", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test.concurrent("LSWallet.setAccount & LSWallet.getAccount", async () => {
  using world = await LSWorld.start();
  const { wallet } = await createAccounts(world);
  const before = await wallet.getAccount();
  await wallet.setAccount(before);
  const after = await wallet.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("LSWallet.executeTx", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet, wallet2 } = await createAccounts(world);
  const { hash, explorerUrl, gasUsed, fee } = await wallet.executeTx({
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("LSWallet.transfer - EGLD", async () => {
  using world = await LSWorld.start();
  const { wallet, wallet2 } = await createAccounts(world);
  const { fee } = await wallet.transfer({
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("LSWallet.transfer - ESDTs", async () => {
  using world = await LSWorld.start();
  const { wallet, wallet2 } = await createAccounts(world);
  await wallet.transfer({
    receiver: wallet2,
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await wallet2.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 17n }] },
  });
});

test.concurrent("LSWallet.deployContract", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet } = await createAccounts(world);
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  expect(getAddressType(contract)).toEqual("vmContract");
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("LSWallet.upgradeContract", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await contract.setAccount({
    code: worldCode,
    codeMetadata: ["upgradeable"],
    owner: wallet,
  });
  await wallet.upgradeContract({
    callee: contract,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("LSWallet.callContract - with EGLD", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { fee } = await wallet.callContract({
    callee: contract,
    funcName: "fund",
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n + 10n ** 17n,
  });
});

test.concurrent("LSWallet.callContract - with ESDT", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await contract.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n + 10n ** 17n }] },
  });
});

test.concurrent("LSWallet.callContract - with return", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.U64(20)]);
});

test.concurrent("LSWallet.callContract - change the state", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await wallet.callContract({
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(100)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccount(), {
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(100)]],
    },
  });
});

test.concurrent("LSWallet.callContract - failure", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await expect(
    wallet.callContract({
      callee: contract,
      funcName: "non_existent_function",
      gasLimit: 10_000_000,
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^Transaction failed: 1 - invalid function \(not found\) - Result:\n\{\n {2}"explorerUrl": "(.*)",\n {2}"hash": "(.*)",\n {2}"executionLogs": "(.*)",/,
    ),
    stack: expect.stringMatching(/src\/world\/lsworld\.test\.ts:[0-9]+:[0-9]+/),
  });
});

test.concurrent(
  "LSWallet.callContract.assertFail - correct parameters",
  async () => {
    using world = await LSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(0)],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: 4, message: "Amount is not positive." });
  },
);

test.concurrent("LSWallet.callContract.assertFail - wrong code", async () => {
  using world = await LSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(0)],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: 5 }),
  ).rejects.toThrow(
    "Failed with unexpected error code.\nExpected code: 5\nReceived code: 4",
  );
});

test.concurrent(
  "LSWallet.callContract.assertFail - wrong message",
  async () => {
    using world = await LSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await expect(
      wallet
        .callContract({
          callee: contract,
          funcName: "require_positive",
          funcArgs: [e.U64(0)],
          gasLimit: 10_000_000,
        })
        .assertFail({ message: "" }),
    ).rejects.toThrow(
      "Failed with unexpected error message.\nExpected message: \nReceived message: Amount is not positive.",
    );
  },
);

test.concurrent(
  "LSWallet.callContract.assertFail - transaction not failing",
  async () => {
    using world = await LSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await expect(
      wallet
        .callContract({
          callee: contract,
          funcName: "require_positive",
          funcArgs: [e.U64(1)],
          gasLimit: 10_000_000,
        })
        .assertFail(),
    ).rejects.toThrow("No failure.");
  },
);

test.concurrent("LSContract.getAccountNonce", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountNonce()).toEqual(0);
});

test.concurrent("LSContract.getAccountBalance", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test.concurrent("LSContract.getAccountValue", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    kvs: { "01": "11" },
  });
  expect(await contract.getAccountValue("01")).toEqual("11");
});

test.concurrent("LSContract.getAccountKvs", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
  );
});

test.concurrent("LSContract.getAccountWithoutKvs", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  assertAccount(await contract.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test.concurrent("LSContract.getAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    balance: 10n ** 18n,
    code: "00",
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  assertAccount(await contract.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "00",
    codeHash:
      "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
    codeMetadata: ["readable"],
    owner: wallet,
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test.concurrent("LSContract.setAccount & LSContract.getAccount", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  const before = await contract.getAccount();
  await contract.setAccount(before);
  const after = await contract.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("LSContract.query", async () => {
  using world = await LSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await contract.query({
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

const createAccounts = async (world: LSWorld) => {
  const [wallet, wallet2, wallet3] = await world.createWallets([
    {
      address: { shard: 1 },
      balance: 10n ** 18n,
      kvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
    },
    { address: { shard: 1 } },
    { address: { shard: 1 } },
  ]);
  const contract = await wallet.createContract({
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  return { wallet, wallet2, wallet3, contract };
};
