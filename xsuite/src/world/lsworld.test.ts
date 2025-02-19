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
const worldCode = "file:contracts/output-reproducible/world/world.wasm";
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
const localhostRegex = /^http:\/\/127\.0\.0\.1:\d+$/;

test.concurrent("LSWorld.start - port 12345", async () => {
  using world = await LSWorld.start({ binaryPort: 12345 });
  expect(world.proxy.proxyUrl).toEqual("http://127.0.0.1:12345");
});

test.concurrent("LSWorld.proxy.proxyUrl", async () => {
  using world = await LSWorld.start();
  expect(world.proxy.proxyUrl).toMatch(localhostRegex);
});

test.concurrent("LSWorld.getAccountNonce on empty bech address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountNonce(zeroBechAddress)).toEqual(0);
});

test.concurrent("LSWorld.getAccountNonce on empty hex address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountNonce(zeroHexAddress)).toEqual(0);
});

test.concurrent("LSWorld.getAccountNonce on empty U8A address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountNonce(zeroU8AAddress)).toEqual(0);
});

test.concurrent("LSWorld.getAccountBalance on empty bech address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountBalance(zeroBechAddress)).toEqual(0n);
});

test.concurrent("LSWorld.getAccountBalance on empty hex address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountBalance(zeroHexAddress)).toEqual(0n);
});

test.concurrent("LSWorld.getAccountBalance on empty U8A address", async () => {
  using world = await LSWorld.start();
  expect(await world.getAccountBalance(zeroU8AAddress)).toEqual(0n);
});

test.concurrent("LSWorld.getAccount on empty bech address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.getAccount(zeroBechAddress), emptyAccount);
});

test.concurrent("LSWorld.getAccount on empty hex address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.getAccount(zeroHexAddress), emptyAccount);
});

test.concurrent("LSWorld.getAccount on empty U8A address", async () => {
  using world = await LSWorld.start();
  assertAccount(await world.getAccount(zeroU8AAddress), emptyAccount);
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

test.concurrent("LSWorld.getAccountEsdtBalance", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const balance = await world.getAccountEsdtBalance(wallet, fftId);
  expect(balance).toEqual(1n);
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
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const contract = await wallet.createContract({
    balance: 1,
    code: "00",
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  expect(await world.getAllSerializableAccounts()).toEqual(
    [
      e.account({
        address: wallet,
        balance: 1,
        code: "",
        codeHash: "",
        codeMetadata: ["readable"],
        kvs: {
          esdts: [{ id: fftId, amount: 1 }],
        },
        nonce: 0,
        owner: "",
      }),
      e.account({
        address: contract,
        balance: 1,
        code: "00",
        codeHash:
          "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
        codeMetadata: ["readable"],
        kvs: {
          esdts: [{ id: fftId, amount: 1 }],
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
      balance: 1,
      kvs: {
        esdts: [{ id: fftId, amount: 1 }],
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
    balance: 1,
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
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

test.concurrent("LSWorld.updateAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const before = await wallet.getAccount();
  await world.updateAccount({
    address: wallet,
    balance: 2,
  });
  const after = await wallet.getAccount();
  expect(after).toEqual({ ...before, balance: 2n });
});

test.concurrent("LSWorld.updateAccount - remove key", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "mapper", value: e.U(1) }],
      extraKvs: { "1234": "01" },
    },
  });
  assertAccount(await wallet.getAccount(), {
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "mapper", value: e.U(1) }],
      extraKvs: { "1234": "01" },
    },
  });
  await world.updateAccount({
    address: wallet,
    kvs: {
      esdts: [{ id: fftId, amount: 0 }],
      mappers: [{ key: "mapper", value: null }],
      extraKvs: { "1234": "" },
    },
  });
  assertAccount(await wallet.getAccount(), { kvs: {} });
});

test.concurrent("LSWorld.setCurrentBlockInfo", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({ code: worldCode });
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
  const contract = await world.createContract({ code: worldCode });
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

test.concurrent("LSWorld.advanceTimestamp", async () => {
  using world = await LSWorld.start();
  await world.setCurrentBlockInfo({ timestamp: 10 });
  expect((await world.getNetworkStatus()).blockTimestamp).toEqual(10);
  await world.advanceTimestamp(10);
  expect((await world.getNetworkStatus()).blockTimestamp).toEqual(20);
});

test.concurrent("LSWorld.advanceNonce", async () => {
  using world = await LSWorld.start();
  await world.setCurrentBlockInfo({ nonce: 10 });
  expect((await world.getNetworkStatus()).nonce).toEqual(10);
  await world.advanceNonce(10);
  expect((await world.getNetworkStatus()).nonce).toEqual(20);
});

test.concurrent("LSWorld.advanceRound", async () => {
  using world = await LSWorld.start();
  await world.setCurrentBlockInfo({ round: 10 });
  expect((await world.getNetworkStatus()).round).toEqual(10);
  await world.advanceRound(10);
  expect((await world.getNetworkStatus()).round).toEqual(20);
});

test.concurrent("LSWorld.advanceEpoch", async () => {
  using world = await LSWorld.start();
  await world.setCurrentBlockInfo({ epoch: 10 });
  expect((await world.getNetworkStatus()).epoch).toEqual(10);
  await world.advanceEpoch(10);
  expect((await world.getNetworkStatus()).epoch).toEqual(20);
});

test.concurrent("LSWorld.query - basic", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    code: worldCode,
    kvs: {
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test.concurrent("LSWorld.query - sender", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await world.createContract({ code: worldCode });
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("LSWorld.query - value", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 10 });
  const contract = await world.createContract({ code: worldCode });
  const { returnData } = await world.query({
    sender: wallet,
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test.concurrent("LSWorld.query.assertFail - correct parameters", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({ code: worldCode });
  await world
    .query({
      callee: contract,
      funcName: "failing_endpoint",
      funcArgs: [],
    })
    .assertFail({ code: 4, message: "Fail" });
});

test.concurrent("LSWorld.executeTxs", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({ balance: 2 });
  const wallet2 = await world.createWallet();
  const wallet3 = await world.createWallet();
  await world.executeTxs([
    {
      sender: wallet1,
      receiver: wallet2,
      value: 1,
      gasLimit: 10_000_000,
    },
    {
      sender: wallet1,
      receiver: wallet3,
      value: 1,
      gasLimit: 10_000_000,
    },
  ]);
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
  assertAccount(await wallet3.getAccount(), {
    balance: 1,
  });
});

test.concurrent("LSWorld.executeTx", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const wallet1 = await world.createWallet({ balance: 1 });
  const wallet2 = await world.createWallet();
  const { hash, explorerUrl, gasUsed } = await world.executeTx({
    sender: wallet1,
    receiver: wallet2,
    value: 1,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
});

test.concurrent("LSWorld.transfer", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({ balance: 1 });
  const wallet2 = await world.createWallet();
  await world.transfer({
    sender: wallet1,
    receiver: wallet2,
    value: 1,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
});

test.concurrent(
  "LSWorld.transfer - invalid tx - gasLimit too low",
  async () => {
    using world = await LSWorld.start();
    const wallet = await world.createWallet();
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

test.concurrent("LSWorld.doTransfers - 100 transfers", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({
    kvs: {
      esdts: [{ id: fftId, amount: 100 }],
    },
  });
  const wallet2 = await world.createWallet();
  await world.doTransfers(
    Array.from({ length: 100 }, () => ({
      sender: wallet1,
      receiver: wallet2,
      esdts: [{ id: fftId, amount: 1 }],
      gasLimit: 10_000_000,
    })),
  );
  assertAccount(await wallet1.getAccount(), {
    kvs: {},
  });
  assertAccount(await wallet2.getAccount(), {
    kvs: {
      esdts: [{ id: fftId, amount: 100 }],
    },
  });
});

test.concurrent(
  "LSWorld.doTransfers - invalid tx - gasLimit too low",
  async () => {
    using world = await LSWorld.start();
    const wallet = await world.createWallet();
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
  const wallet = await world.createWallet();
  const { contract } = await world.deployContract({
    sender: wallet,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 40_000_000,
  });
  expect(getAddressType(contract)).toEqual("vmContract");
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("LSWorld.upgradeContract", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    code: worldCode,
    codeMetadata: ["upgradeable"],
  });
  await world.upgradeContract({
    sender: wallet,
    callee: contract,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(2)],
    gasLimit: 40_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("LSWorld.callContract", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await world.createContract({ code: worldCode });
  await world.callContract({
    sender: wallet,
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccount(), {
    kvs: {
      mappers: [{ key: "n", value: e.U(1) }],
    },
  });
});

test.concurrent("LSWorld.addKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { "01": "02", "03": "04" },
  });
  await world.addKvs(wallet, {
    "01": "05",
    "06": "07",
  });
  assertAccount(await wallet.getAccount(), {
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("LSWorld.addEsdts", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 1 },
        { id: "TOK2-123456", amount: 1 },
      ],
    },
  });
  await world.addEsdts(wallet, [
    { id: "TOK1-123456", amount: 2 },
    { id: "TOK3-123456", amount: 1 },
  ]);
  assertAccount(await wallet.getAccount(), {
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 2 },
        { id: "TOK2-123456", amount: 1 },
        { id: "TOK3-123456", amount: 1 },
      ],
    },
  });
});

test.concurrent("LSWorld.addMappers", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: {
      mappers: [
        { key: "key1", value: e.U(2) },
        { key: "key3", value: e.U(4) },
      ],
    },
  });
  await world.addMappers(wallet, [
    { key: "key1", value: e.U(4) },
    { key: "key5", value: e.U(6) },
  ]);
  assertAccount(await wallet.getAccount(), {
    kvs: {
      mappers: [
        { key: "key1", value: e.U(4) },
        { key: "key3", value: e.U(4) },
        { key: "key5", value: e.U(6) },
      ],
    },
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
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({ code: worldCode });
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("LSWallet.query - try to change the state", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 10 });
  const contract = await wallet.createContract({ code: worldCode });
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
    balance: 10,
  });
  assertAccount(await contract.getAccount(), {
    kvs: [],
  });
});

test.todo("LSWallet.query - esdts", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: {
      esdts: [
        { id: fftId, amount: 10 },
        { id: sftId, nonce: 1, amount: 20 },
      ],
    },
  });
  const contract = await wallet.createContract({ code: worldCode });
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
  const contract = await world.createContract({ code: worldCode });
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
  const wallet = await world.createWallet({});
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test.concurrent("LSWallet.getAccountBalance", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 1 });
  expect(await wallet.getAccountBalance()).toEqual(1n);
});

test.concurrent("LSWallet.getAccountEsdtBalance", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const balance = await wallet.getAccountEsdtBalance(fftId);
  expect(balance).toEqual(1n);
});

test.concurrent("LSWallet.getAccountValue", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await wallet.getAccountValue("01")).toEqual("11");
});

test.concurrent("LSWallet.getAccountKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 1 }] }),
  );
});

test.concurrent("LSWallet.getAccountWithoutKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  assertAccount(await wallet.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 1,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
  });
});

test.concurrent("LSWallet.getAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 1,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
});

test.concurrent("LSWallet.setAccount & LSWallet.getAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const before = await wallet.getAccount();
  await wallet.setAccount(before);
  const after = await wallet.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("LSWallet.updateAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    balance: 1,
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const before = await wallet.getAccount();
  await wallet.updateAccount({ balance: 2 });
  const after = await wallet.getAccount();
  expect(after).toEqual({ ...before, balance: 2n });
});

test.concurrent("LSWallet.executeTx", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const wallet1 = await world.createWallet({ balance: 1 });
  const wallet2 = await world.createWallet();
  const { hash, explorerUrl, gasUsed } = await wallet1.executeTx({
    receiver: wallet2,
    value: 1,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
});

test.concurrent("LSWallet.transfer - EGLD", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({ balance: 1 });
  const wallet2 = await world.createWallet();
  await wallet1.transfer({
    receiver: wallet2,
    value: 1,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
});

// TODO-MvX: To run once Mandos is fixed
test.todo("LSWallet.transfer - EGLD as ESDT", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({ balance: 1 });
  const wallet2 = await world.createWallet();
  await wallet1.transfer({
    receiver: wallet2,
    esdts: [{ id: "EGLD-000000", amount: 1 }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet1.getAccount(), {
    balance: 0,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 1,
  });
});

test.concurrent("LSWallet.transfer - ESDTs", async () => {
  using world = await LSWorld.start();
  const wallet1 = await world.createWallet({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const wallet2 = await world.createWallet();
  await wallet1.transfer({
    receiver: wallet2,
    esdts: [{ id: fftId, amount: 1 }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet1.getAccount(), {
    kvs: {},
  });
  assertAccount(await wallet2.getAccount(), {
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
});

test.concurrent("LSWallet.deployContract", async () => {
  using world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  const wallet = await world.createWallet();
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 40_000_000,
  });
  expect(getAddressType(contract)).toEqual("vmContract");
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("LSWallet.upgradeContract", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    code: worldCode,
    codeMetadata: ["upgradeable"],
  });
  await wallet.upgradeContract({
    callee: contract,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(2)],
    gasLimit: 40_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("LSWallet.callContract - with EGLD", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({ balance: 1 });
  const contract = await wallet.createContract({ code: worldCode });
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    value: 1,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 0,
  });
  assertAccount(await contract.getAccount(), {
    balance: 1,
  });
});

test.concurrent("LSWallet.callContract - with ESDT", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const contract = await wallet.createContract({ code: worldCode });
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    esdts: [{ id: fftId, amount: 1 }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    kvs: { esdts: [{ id: fftId, amount: 0 }] },
  });
  assertAccount(await contract.getAccount(), {
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
});

test.concurrent("LSWallet.callContract - with return", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    code: worldCode,
    kvs: {
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
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
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({ code: worldCode });
  await wallet.callContract({
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(100)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccount(), {
    kvs: {
      extraKvs: [[e.Str("n"), e.U64(100)]],
    },
  });
});

// TODO-MvX: To run once Mandos is fixed
test.todo(
  "LSWallet.callContract - transfer ESDT to non-existent account",
  async () => {
    using world = await LSWorld.start();
    const wallet = await world.createWallet({
      kvs: { esdts: [{ id: fftId, amount: 1 }] },
    });
    const contract = await wallet.createContract({ code: worldCode });
    const nonExistentWallet = world.newWallet(createAddressLike("wallet"));
    await wallet.callContract({
      callee: contract,
      funcName: "transfer_received",
      funcArgs: [nonExistentWallet],
      esdts: [{ id: fftId, amount: 1 }],
      gasLimit: 10_000_000,
    });
    assertAccount(await wallet.getAccount(), {
      kvs: { esdts: [{ id: fftId, amount: 0 }] },
    });
    assertAccount(await nonExistentWallet.getAccount(), {
      kvs: { esdts: [{ id: fftId, amount: 1 }] },
    });
  },
);

test.concurrent("LSWallet.callContract - failure", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({ code: worldCode });
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
  "LSWallet.callContract.assertFail - failing sync call",
  async () => {
    using world = await LSWorld.start();
    const wallet = await world.createWallet();
    const contract = await wallet.createContract({ code: worldCode });
    await wallet
      .callContract({
        callee: contract,
        funcName: "failing_endpoint",
        funcArgs: [],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: 4, message: "Fail" });
  },
);

test.concurrent("LSWallet.callContract.assertFail - wrong code", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({ code: worldCode });
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "failing_endpoint",
        funcArgs: [],
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
    const wallet = await world.createWallet();
    const contract = await wallet.createContract({ code: worldCode });
    await expect(
      wallet
        .callContract({
          callee: contract,
          funcName: "failing_endpoint",
          funcArgs: [],
          gasLimit: 10_000_000,
        })
        .assertFail({ message: "" }),
    ).rejects.toThrow(
      "Failed with unexpected error message.\nExpected message: \nReceived message: Fail",
    );
  },
);

test.concurrent(
  "LSWallet.callContract.assertFail - transaction not failing",
  async () => {
    using world = await LSWorld.start();
    const wallet = await world.createWallet();
    const contract = await wallet.createContract({ code: worldCode });
    await expect(
      wallet
        .callContract({
          callee: contract,
          funcName: "succeeding_endpoint",
          funcArgs: [],
          gasLimit: 10_000_000,
        })
        .assertFail(),
    ).rejects.toThrow("No failure.");
  },
);

test.concurrent("LSWallet.addKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: { "01": "02", "03": "04" },
  });
  await wallet.addKvs({
    "01": "05",
    "06": "07",
  });
  assertAccount(await wallet.getAccount(), {
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("LSWallet.addEsdts", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet({
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 1 },
        { id: "TOK2-123456", amount: 1 },
      ],
    },
  });
  await wallet.addEsdts([
    { id: "TOK1-123456", amount: 2 },
    { id: "TOK3-123456", amount: 1 },
  ]);
  assertAccount(await wallet.getAccount(), {
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 2 },
        { id: "TOK2-123456", amount: 1 },
        { id: "TOK3-123456", amount: 1 },
      ],
    },
  });
});

test.concurrent("LSContract.getAccountNonce", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract();
  expect(await contract.getAccountNonce()).toEqual(0);
});

test.concurrent("LSContract.getAccountBalance", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({ balance: 1 });
  expect(await contract.getAccountBalance()).toEqual(1n);
});

test.concurrent("LSContract.getAccountEsdtBalance", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    kvs: { esdts: [{ id: fftId, amount: 1 }] },
  });
  const balance = await contract.getAccountEsdtBalance(fftId);
  expect(balance).toEqual(1n);
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
  const contract = await world.createContract({
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 1 }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
  );
});

test.concurrent("LSContract.getAccountWithoutKvs", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    balance: 1,
    code: "00",
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  assertAccount(await contract.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 1,
    code: "00",
    codeHash:
      "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
    codeMetadata: ["readable"],
    owner: wallet,
  });
});

test.concurrent("LSContract.getAccount", async () => {
  using world = await LSWorld.start();
  const wallet = await world.createWallet();
  const contract = await wallet.createContract({
    balance: 1,
    code: "00",
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  assertAccount(await contract.getAccount(), {
    nonce: 0,
    balance: 1,
    code: "00",
    codeHash:
      "03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
    codeMetadata: ["readable"],
    owner: wallet,
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
});

test.concurrent("LSContract.setAccount & LSContract.getAccount", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    balance: 1,
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
    owner: createAddressLike("wallet"),
  });
  const before = await contract.getAccount();
  await contract.setAccount(before);
  const after = await contract.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("LSContract.updateAccount", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    balance: 1,
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 1 }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  const before = await contract.getAccount();
  await contract.updateAccount({ balance: 2 });
  const after = await contract.getAccount();
  expect(after).toEqual({ ...before, balance: 2n });
});

test.concurrent("LSContract.query", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    code: worldCode,
    kvs: { mappers: [{ key: "n", value: e.U64(2) }] },
  });
  const { returnData } = await contract.query({
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test.concurrent("LSContract.addKvs", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    kvs: { "01": "02", "03": "04" },
  });
  await contract.addKvs({
    "01": "05",
    "06": "07",
  });
  assertAccount(await contract.getAccount(), {
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("LSContract.addEsdts", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 1 },
        { id: "TOK2-123456", amount: 1 },
      ],
    },
  });
  await contract.addEsdts([
    { id: "TOK1-123456", amount: 2 },
    { id: "TOK3-123456", amount: 1 },
  ]);
  assertAccount(await contract.getAccount(), {
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 2 },
        { id: "TOK2-123456", amount: 1 },
        { id: "TOK3-123456", amount: 1 },
      ],
    },
  });
});

test.concurrent("LSContract.addMappers", async () => {
  using world = await LSWorld.start();
  const contract = await world.createContract({
    kvs: {
      mappers: [
        { key: "key1", value: e.U(2) },
        { key: "key3", value: e.U(4) },
      ],
    },
  });
  await contract.addMappers([
    { key: "key1", value: e.U(4) },
    { key: "key5", value: e.U(6) },
  ]);
  assertAccount(await contract.getAccount(), {
    kvs: {
      mappers: [
        { key: "key1", value: e.U(4) },
        { key: "key3", value: e.U(4) },
        { key: "key5", value: e.U(6) },
      ],
    },
  });
});
