import { expect, test } from "vitest";
import { assertAccount, assertVs } from "../assert";
import { d, e } from "../data";
import {
  zeroBechAddress,
  zeroHexAddress,
  zeroU8AAddress,
} from "../data/address";
import { getAddressShard, getAddressType } from "../data/utils";
import { FSProxy } from "../proxy";
import { FSWorld } from "./fsworld";
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

test.concurrent("FSWorld.proxy.blockNonce", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
  });
  await wallet.setAccount({
    balance: 2n * 10n ** 18n,
  });
  const proxy = new FSProxy({ proxyUrl: world.proxy.proxyUrl, blockNonce: 2 });
  assertAccount(await proxy.getAccount(wallet), {
    balance: 10n ** 18n,
  });
  proxy.blockNonce = undefined;
  assertAccount(await proxy.getAccount(wallet), {
    balance: 2n * 10n ** 18n,
  });
});

test.concurrent("FSWorld.start - port 3000", async () => {
  using world = await FSWorld.start({ binaryPort: 3000 });
  expect(world.proxy.proxyUrl).toEqual("http://localhost:3000");
});

test.concurrent("FSWorld.start - epoch, round, nonce", async () => {
  const epoch = 12;
  const round = 34;
  const nonce = 56;
  using world = await FSWorld.start({ epoch, round, nonce });
  expect(await world.getNetworkStatus(0)).toMatchObject({
    epoch,
    round,
    nonce,
  });
});

test.concurrent("FSWorld.getAccountNonce on empty bech address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountNonce(zeroBechAddress)).toEqual(0);
});

test.concurrent("FSWorld.getAccountNonce on empty hex address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountNonce(zeroHexAddress)).toEqual(0);
});

test.concurrent("FSWorld.getAccountNonce on empty U8A address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountNonce(zeroU8AAddress)).toEqual(0);
});

test.concurrent("FSWorld.getAccountBalance on empty bech address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountBalance(zeroBechAddress)).toEqual(0n);
});

test.concurrent("FSWorld.getAccountBalance on empty hex address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountBalance(zeroHexAddress)).toEqual(0n);
});

test.concurrent("FSWorld.getAccountBalance on empty U8A address", async () => {
  using world = await FSWorld.start();
  expect(await world.getAccountBalance(zeroU8AAddress)).toEqual(0n);
});

test.concurrent("FSWorld.getAccount on empty bech address", async () => {
  using world = await FSWorld.start();
  assertAccount(await world.getAccount(zeroBechAddress), emptyAccount);
});

test.concurrent("FSWorld.getAccount on empty hex address", async () => {
  using world = await FSWorld.start();
  assertAccount(await world.getAccount(zeroHexAddress), emptyAccount);
});

test.concurrent("FSWorld.getAccount on empty U8A address", async () => {
  using world = await FSWorld.start();
  assertAccount(await world.getAccount(zeroU8AAddress), emptyAccount);
});

test.concurrent("FSWorld.new with defined chainId", () => {
  expect(() => FSWorld.new({ chainId: "D" })).toThrow(
    "chainId is not undefined.",
  );
});

test.concurrent("FSWorld.newDevnet", () => {
  expect(() => FSWorld.newDevnet()).toThrow("newDevnet is not implemented.");
});

test.concurrent("FSWorld.newTestnet", () => {
  expect(() => FSWorld.newTestnet()).toThrow("newTestnet is not implemented.");
});

test.concurrent("FSWorld.newMainnet", () => {
  expect(() => FSWorld.newMainnet()).toThrow("newMainnet is not implemented.");
});

test.concurrent("FSWorld.newWallet", async () => {
  using world = await FSWorld.start();
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test.concurrent("FSWorld.newContract", async () => {
  using world = await FSWorld.start();
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test.concurrent("FSWorld.createWallet - empty wallet", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const wallet = await world.createWallet();
  expect(wallet.explorerUrl).toEqual(`${baseExplorerUrl}/accounts/${wallet}`);
  expect(getAddressType(wallet)).toEqual("wallet");
  assertAccount(await wallet.getAccount(), {});
});

test.concurrent("FSWorld.createWallet - with balance", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ balance: 10n });
  assertAccount(await wallet.getAccount(), { balance: 10n });
});

test.concurrent("FSWorld.createWallet - with address & balance", async () => {
  using world = await FSWorld.start();
  const address = createAddressLike("wallet");
  const wallet = await world.createWallet({ address, balance: 10n });
  assertAccount(await wallet.getAccount(), { address, balance: 10n });
});

test.concurrent("FSWorld.createWallet - with shard", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.createContract - empty contract", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const contract = await world.createContract();
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  expect(getAddressType(contract)).toEqual("vmContract");
  assertAccount(await contract.getAccount(), { code: "" });
});

test.concurrent("FSWorld.createContract - with balance", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({ balance: 10n });
  assertAccount(await contract.getAccount(), { balance: 10n });
});

test.concurrent("FSWorld.createContract - with file:", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccount(), { code: worldCode });
});

test.concurrent("FSWorld.createContract - with address & file:", async () => {
  using world = await FSWorld.start();
  const address = createAddressLike("vmContract");
  const contract = await world.createContract({ address, code: worldCode });
  assertAccount(await contract.getAccount(), { address, code: worldCode });
});

test.concurrent("FSWorld.createContract - with shard", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.getAccountNonce", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ nonce: 10 });
  expect(await world.getAccountNonce(wallet)).toEqual(10);
});

test.concurrent("FSWorld.getAccountBalance", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ balance: 1234 });
  expect(await world.getAccountBalance(wallet)).toEqual(1234n);
});

test.concurrent("FSWorld.getAccountEsdtBalance", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  const balance = await world.getAccountEsdtBalance(wallet, fftId);
  expect(balance).toEqual(10n ** 18n);
});

test.concurrent("FSWorld.getAccountValue - non-present key", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await world.getAccountValue(wallet, "02")).toEqual("");
});

test.concurrent("FSWorld.getAccountValue - present key", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await world.getAccountValue(wallet, "01")).toEqual("11");
});

test.concurrent("FSWorld.getAccountKvs", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  expect(await world.getAccountKvs(wallet)).toEqual(
    e.kvs([[e.Str("n"), e.U(1)]]),
  );
});

test.concurrent("FSWorld.getAccountWithoutKvs", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  assertAccount(await world.getAccountWithoutKvs(wallet), { kvs: {} });
});

test.concurrent("FSWorld.getAccount", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: [[e.Str("n"), e.U(1)]] });
  assertAccount(await world.getAccount(wallet), {
    kvs: [[e.Str("n"), e.U(1)]],
  });
});

test.concurrent("FSWorld.getInitialWallets", async () => {
  using world = await FSWorld.start();
  const initialAddresses = await world.getInitialAddresses();
  const walletWithBalance = world.newWallet(initialAddresses.withBalance[0]);
  const walletWithStake = world.newWallet(initialAddresses.withStake[0]);
  assertAccount(await walletWithBalance.getAccount(), {
    balance: 6663333333333333333333333n,
  });
  assertAccount(await walletWithStake.getAccount(), {
    balance: 0n,
  });
});

test.concurrent("FSWorld.setAccounts", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.setAccount", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.updateAccount", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    address: { shard: 1 },
    balance: 10n ** 18n,
    kvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
  const before = await wallet.getAccount();
  await world.updateAccount({
    address: wallet,
    balance: 10n ** 17n,
  });
  const after = await wallet.getAccount();
  expect(after).toEqual({ ...before, balance: 10n ** 17n });
});

test.concurrent("FSWorld.updateAccount - remove key", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.query - basic", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test.concurrent("FSWorld.query - sender", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("FSWorld.query - value", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test.concurrent("FSWorld.query.assertFail - correct parameters", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  await world
    .query({
      callee: contract,
      funcName: "failing_endpoint",
      funcArgs: [],
    })
    .assertFail({ code: "user error", message: "Fail" });
});

test.concurrent(
  "FSWorld.sendTx & FSWorld.resolveTx.assertPending & FSWorld.resolveTx.assertSucceed",
  async () => {
    using world = await FSWorld.start();
    const { wallet, wallet2 } = await createAccounts(world);
    const txHash = await world.sendTx({
      sender: wallet,
      receiver: wallet2,
      value: 10n ** 17n,
      gasLimit: 10_000_000,
    });
    await world.resolveTx(txHash).assertPending();
    await world.generateBlocks(4); // TODO-MvX: bug here
    const { fee } = await world.resolveTx(txHash).assertSucceed();
    assertAccount(await wallet.getAccount(), {
      balance: 9n * 10n ** 17n - fee,
    });
    assertAccount(await wallet2.getAccount(), {
      balance: 10n ** 17n,
    });
  },
);

test.concurrent("FSWorld.executeTxs", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.executeTx", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet, wallet2 } = await createAccounts(world);
  const { hash, explorerUrl, gasUsed, fee } = await world.executeTx({
    sender: wallet,
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(50_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("FSWorld.transfer", async () => {
  using world = await FSWorld.start();
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
  "FSWorld.transfer - invalid tx - gasLimit too low",
  async () => {
    using world = await FSWorld.start();
    const { wallet } = await createAccounts(world);
    await expect(
      world.transfer({
        sender: wallet,
        receiver: wallet,
        value: 0,
        gasLimit: 0,
      }),
    ).rejects.toThrow(
      "transaction generation failed: insufficient gas limit in tx",
    );
  },
);

test.concurrent("FSWorld.doTransfers - 100 transfers", async () => {
  using world = await FSWorld.start();
  const wallet1 = await world.createWallet({
    address: { shard: 0 },
    balance: 10n ** 18n,
    kvs: {
      esdts: [{ id: fftId, amount: 100 }],
    },
  });
  const wallet2 = await world.createWallet({
    address: { shard: 0 },
  });
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
  "FSWorld.doTransfers - invalid tx - gasLimit too low",
  async () => {
    using world = await FSWorld.start();
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

test.concurrent("FSWorld.deployContract", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet } = await createAccounts(world);
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
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("FSWorld.upgradeContract", async () => {
  using world = await FSWorld.start();
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
    gasLimit: 40_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("FSWorld.callContract", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWorld.addKvs", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: { "01": "02", "03": "04" },
  });
  await world.addKvs(wallet, {
    "01": "05",
    "06": "07",
  });
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("FSWorld.addEsdts", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 10n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
      ],
    },
  });
  await world.addEsdts(wallet, [
    { id: "TOK1-123456", amount: 20n ** 18n },
    { id: "TOK3-123456", amount: 10n ** 18n },
  ]);
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 20n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
        { id: "TOK3-123456", amount: 10n ** 18n },
      ],
    },
  });
});

test.concurrent("FSWorld.addMappers", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
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
    balance: 10n ** 18n,
    kvs: {
      mappers: [
        { key: "key1", value: e.U(4) },
        { key: "key3", value: e.U(4) },
        { key: "key5", value: e.U(6) },
      ],
    },
  });
});

test.concurrent("FSWorld.terminate", async () => {
  using world = await FSWorld.start();
  expect(world.server?.killed).toEqual(false);
  world.terminate();
  expect(world.server?.killed).toEqual(true);
});

test.concurrent("FSWallet.query", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test.concurrent("FSWallet.query - try to change the state", async () => {
  using world = await FSWorld.start();
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

test.todo("FSWallet.query - esdts", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWallet.callContract failure", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  await expect(
    world.query({
      callee: contract,
      funcName: "non_existent_function",
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^Query failed: function not found - invalid function \(not found\) - Result:\n\{/,
    ),
    stack: expect.stringMatching(/src\/world\/fsworld\.test\.ts:[0-9]+:[0-9]+/),
  });
});

test.concurrent("FSWallet.getAccountNonce", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test.concurrent("FSWallet.getAccountBalance", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test.concurrent("FSWallet.getAccountEsdtBalance", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  const balance = await wallet.getAccountEsdtBalance(fftId);
  expect(balance).toEqual(10n ** 18n);
});

test.concurrent("FSWallet.getAccountValue", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({ kvs: { "01": "11" } });
  expect(await wallet.getAccountValue("01")).toEqual("11");
});

test.concurrent("FSWallet.getAccountKvs", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 10n ** 18n }] }),
  );
});

test.concurrent("FSWallet.getAccountWithoutKvs", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  assertAccount(await wallet.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: [],
    owner: "",
  });
});

test.concurrent("FSWallet.getAccount", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: [],
    owner: "",
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test.concurrent("FSWallet.setAccount & FSWallet.getAccount", async () => {
  using world = await FSWorld.start();
  const { wallet } = await createAccounts(world);
  const before = await wallet.getAccount();
  await wallet.setAccount(before);
  const after = await wallet.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("FSWallet.updateAccount", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    address: { shard: 1 },
    balance: 10n ** 18n,
    kvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
  const before = await wallet.getAccount();
  await wallet.updateAccount({ balance: 10n ** 17n });
  const after = await wallet.getAccount();
  expect(after).toEqual({ ...before, balance: 10n ** 17n });
});

test.concurrent("FSWallet.executeTx", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet, wallet2 } = await createAccounts(world);
  const { hash, explorerUrl, gasUsed, fee } = await wallet.executeTx({
    receiver: wallet2,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(50_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await wallet2.getAccount(), {
    balance: 10n ** 17n,
  });
});

test.concurrent("FSWallet.transfer - EGLD", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWallet.transfer - ESDTs", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWallet.deployContract", async () => {
  using world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  const { wallet } = await createAccounts(world);
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
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test.concurrent("FSWallet.upgradeContract", async () => {
  using world = await FSWorld.start();
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
    gasLimit: 40_000_000,
  });
  assertAccount(await contract.getAccount(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.concurrent("FSWallet.callContract - with EGLD", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWallet.callContract - with ESDT", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSWallet.callContract - with return", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.U64(20)]);
});

test.concurrent("FSWallet.callContract - with return (writeLog)", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "get_back_transfers",
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.Tuple(e.U(0), e.List())]);
});

test.concurrent("FSWallet.callContract - change the state", async () => {
  using world = await FSWorld.start();
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

test.concurrent(
  "FSWallet.callContract - succeeding async call v2",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    const { returnData } = await wallet.callContract({
      callee: contract,
      funcName: "issue_token_with_succeeding_callback_v2",
      value: 5n * 10n ** 16n,
      gasLimit: 100_000_000,
    });
    expect(returnData.length).toEqual(1);
    expect(d.Tuple(d.Str(), d.U()).fromTop(returnData[0])).toEqual([
      expect.stringContaining("TEST"),
      1n,
    ]);
  },
);

test.concurrent(
  "FSWallet.callContract - succeeding async call v1",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    const { returnData } = await wallet.callContract({
      callee: contract,
      funcName: "issue_token_with_succeeding_callback_v1",
      value: 5n * 10n ** 16n,
      gasLimit: 100_000_000,
    });
    expect(returnData.length).toEqual(1);
    expect(d.Tuple(d.Str(), d.U()).fromTop(returnData[0])).toEqual([
      expect.stringContaining("TEST"),
      1n,
    ]);
  },
);

test.concurrent(
  "FSWallet.callContract - succeeding async calls v2 with return",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    const { returnData } = await wallet.callContract({
      callee: contract,
      funcName: "issue_tokens_with_return_and_succeeding_callback_v2",
      value: 5n * 10n ** 16n,
      gasLimit: 150_000_000,
    });
    expect(returnData.length).toEqual(3);
    expect(d.Str().fromTop(returnData[0])).toEqual("call");
    expect(d.Tuple(d.Str(), d.U()).fromTop(returnData[1])).toEqual([
      expect.stringContaining("TEST"),
      1n,
    ]);
    expect(d.Tuple(d.Str(), d.U()).fromTop(returnData[2])).toEqual([
      expect.stringContaining("TEST"),
      1n,
    ]);
  },
);

test.concurrent("FSWallet.callContract - failure", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
  await expect(
    wallet.callContract({
      callee: contract,
      funcName: "non_existent_function",
      gasLimit: 10_000_000,
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^Transaction failed: signalError - invalid function \(not found\) - Result:\n\{\n {2}"explorerUrl": "(.*)",\n {2}"hash": "(.*)",/,
    ),
    stack: expect.stringMatching(/src\/world\/fsworld\.test\.ts:[0-9]+:[0-9]+/),
  });
});

test.concurrent(
  "FSWallet.callContract.assertFail - failing sync call",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "failing_endpoint",
        funcArgs: [],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: "signalError", message: "Fail" });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v2 without callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_without_callback_v2",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v1 without callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_without_callback_v1",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v2 with succeeding callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_succeeding_callback_v2",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v1 with succeeding callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_succeeding_callback_v1",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - succeeding async call v2 with failing callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_failing_callback_v2",
        value: 5n * 10n ** 16n,
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "signalError",
        message: "Fail",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing intra-shard async call v2 without callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "async_call_failing_endpoint",
        gasLimit: 600_000_000,
      })
      .assertFail({
        code: "internalVMErrors",
        message: /\[Fail\]/,
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - succeeding async call v1 with failing callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_failing_callback_v1",
        value: 5n * 10n ** 16n,
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "signalError",
        message: "Fail",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v2 with failing callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_failing_callback_v2",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent(
  "FSWallet.callContract.assertFail - failing async call v1 with failing callback",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
    await wallet
      .callContract({
        callee: contract,
        funcName: "issue_token_with_failing_callback_v1",
        gasLimit: 100_000_000,
      })
      .assertFail({
        code: "returnMessage",
        message: "callValue not equals with baseIssuingCost",
      });
  },
);

test.concurrent("FSWallet.callContract.assertFail - wrong code", async () => {
  using world = await FSWorld.start();
  const { wallet, contract } = await createAccounts(world);
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
    "Failed with unexpected error code.\nExpected code: 5\nReceived code: signalError",
  );
});

test.concurrent(
  "FSWallet.callContract.assertFail - wrong message",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
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
  "FSWallet.callContract.assertFail - transaction not failing",
  async () => {
    using world = await FSWorld.start();
    const { wallet, contract } = await createAccounts(world);
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

test.concurrent("FSWallet.addKvs", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: { "01": "02", "03": "04" },
  });
  await wallet.addKvs({
    "01": "05",
    "06": "07",
  });
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("FSWallet.addEsdts", async () => {
  using world = await FSWorld.start();
  const wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 10n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
      ],
    },
  });
  await wallet.addEsdts([
    { id: "TOK1-123456", amount: 20n ** 18n },
    { id: "TOK3-123456", amount: 10n ** 18n },
  ]);
  assertAccount(await wallet.getAccount(), {
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 20n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
        { id: "TOK3-123456", amount: 10n ** 18n },
      ],
    },
  });
});

test.concurrent("FSContract.getAccountNonce", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountNonce()).toEqual(0);
});

test.concurrent("FSContract.getAccountBalance", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test.concurrent("FSContract.getAccountEsdtBalance", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  const balance = await contract.getAccountEsdtBalance(fftId);
  expect(balance).toEqual(10n ** 18n);
});

test.concurrent("FSContract.getAccountValue", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({
    kvs: { "01": "11" },
  });
  expect(await contract.getAccountValue("01")).toEqual("11");
});

test.concurrent("FSContract.getAccountKvs", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
  );
});

test.concurrent("FSContract.getAccountWithoutKvs", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  assertAccount(await contract.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test.concurrent("FSContract.getAccount", async () => {
  using world = await FSWorld.start();
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

test.concurrent("FSContract.setAccount & FSContract.getAccount", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  const before = await contract.getAccount();
  await contract.setAccount(before);
  const after = await contract.getAccount();
  expect(after).toEqual(before);
});

test.concurrent("FSContract.updateAccount", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
  const before = await contract.getAccount();
  await contract.updateAccount({ balance: 10n ** 17n });
  const after = await contract.getAccount();
  expect(after).toEqual({ ...before, balance: 10n ** 17n });
});

test.concurrent("FSContract.query", async () => {
  using world = await FSWorld.start();
  const { contract } = await createAccounts(world);
  const { returnData } = await contract.query({
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test.concurrent("FSContract.addKvs", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({
    balance: 10n ** 18n,
    kvs: { "01": "02", "03": "04" },
  });
  await contract.addKvs({
    "01": "05",
    "06": "07",
  });
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n,
    kvs: { "01": "05", "03": "04", "06": "07" },
  });
});

test.concurrent("FSContract.addEsdts", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 10n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
      ],
    },
  });
  await contract.addEsdts([
    { id: "TOK1-123456", amount: 20n ** 18n },
    { id: "TOK3-123456", amount: 10n ** 18n },
  ]);
  assertAccount(await contract.getAccount(), {
    balance: 10n ** 18n,
    kvs: {
      esdts: [
        { id: "TOK1-123456", amount: 20n ** 18n },
        { id: "TOK2-123456", amount: 10n ** 18n },
        { id: "TOK3-123456", amount: 10n ** 18n },
      ],
    },
  });
});

test.concurrent("FSContract.addMappers", async () => {
  using world = await FSWorld.start();
  const contract = await world.createContract({
    balance: 10n ** 18n,
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
    balance: 10n ** 18n,
    kvs: {
      mappers: [
        { key: "key1", value: e.U(4) },
        { key: "key3", value: e.U(4) },
        { key: "key5", value: e.U(6) },
      ],
    },
  });
});

const createAccounts = async (world: FSWorld) => {
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
