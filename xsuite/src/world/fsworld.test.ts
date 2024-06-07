import { afterEach, beforeEach, expect, test } from "vitest";
import { assertAccount, assertVs } from "../assert";
import { e } from "../data";
import {
  zeroBechAddress,
  zeroHexAddress,
  zeroU8AAddress,
} from "../data/address";
import { getAddressShard, getAddressType } from "../data/utils";
import { childProcesses } from "./childProcesses";
import { FSWorld, FSContract, FSWallet } from "./fsworld";
import { createAddressLike } from "./utils";
import { expandCode } from "./world";

let world: FSWorld;
let wallet: FSWallet;
let otherWallet: FSWallet;
let contract: FSContract;
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

beforeEach(async () => {
  world = await FSWorld.start({ explorerUrl: baseExplorerUrl });
  wallet = await world.createWallet({
    address: { shard: 1 },
    balance: 10n ** 18n,
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
    },
  });
  otherWallet = await world.createWallet({
    address: { shard: 1 },
  });
  contract = await wallet.createContract({
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["readable"],
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      mappers: [{ key: "n", value: e.U64(2) }],
    },
  });
});

afterEach(() => {
  world.terminate();
});

test("FSWorld.proxy.getAccountNonce on empty bech address", async () => {
  expect(await world.proxy.getAccountNonce(zeroBechAddress)).toEqual(0);
});

test("FSWorld.proxy.getAccountNonce on empty hex address", async () => {
  expect(await world.proxy.getAccountNonce(zeroHexAddress)).toEqual(0);
});

test("FSWorld.proxy.getAccountNonce on empty U8A address", async () => {
  expect(await world.proxy.getAccountNonce(zeroU8AAddress)).toEqual(0);
});

test("FSWorld.proxy.getAccountBalance on empty bech address", async () => {
  expect(await world.proxy.getAccountBalance(zeroBechAddress)).toEqual(0n);
});

test("FSWorld.proxy.getAccountBalance on empty hex address", async () => {
  expect(await world.proxy.getAccountBalance(zeroHexAddress)).toEqual(0n);
});

test("FSWorld.proxy.getAccountBalance on empty U8A address", async () => {
  expect(await world.proxy.getAccountBalance(zeroU8AAddress)).toEqual(0n);
});

test("FSWorld.proxy.getAccount on empty bech address", async () => {
  assertAccount(await world.proxy.getAccount(zeroBechAddress), emptyAccount);
});

test("FSWorld.proxy.getAccount on empty hex address", async () => {
  assertAccount(await world.proxy.getAccount(zeroHexAddress), emptyAccount);
});

test("FSWorld.proxy.getAccount on empty U8A address", async () => {
  assertAccount(await world.proxy.getAccount(zeroU8AAddress), emptyAccount);
});

test("FSWorld.new with defined chainId", () => {
  expect(() => FSWorld.new({ chainId: "D" })).toThrow(
    "chainId is not undefined.",
  );
});

test("FSWorld.newDevnet", () => {
  expect(() => FSWorld.newDevnet()).toThrow("newDevnet is not implemented.");
});

test("FSWorld.newTestnet", () => {
  expect(() => FSWorld.newTestnet()).toThrow("newTestnet is not implemented.");
});

test("FSWorld.newMainnet", () => {
  expect(() => FSWorld.newMainnet()).toThrow("newMainnet is not implemented.");
});

test("FSWorld.newWallet", async () => {
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("FSWorld.newContract", async () => {
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("FSWorld.createWallet - empty wallet", async () => {
  const wallet = await world.createWallet();
  expect(wallet.explorerUrl).toEqual(`${baseExplorerUrl}/accounts/${wallet}`);
  expect(getAddressType(wallet)).toEqual("wallet");
  assertAccount(await wallet.getAccount(), {});
});

test("FSWorld.createWallet - with balance", async () => {
  const wallet = await world.createWallet({ balance: 10n });
  assertAccount(await wallet.getAccount(), { balance: 10n });
});

test("FSWorld.createWallet - with address & balance", async () => {
  const address = createAddressLike("wallet");
  const wallet = await world.createWallet({ address, balance: 10n });
  assertAccount(await wallet.getAccount(), { address, balance: 10n });
});

test("FSWorld.createWallet - with shard", async () => {
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

test("FSWorld.createContract - empty contract", async () => {
  const contract = await world.createContract();
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  expect(getAddressType(contract)).toEqual("vmContract");
  assertAccount(await contract.getAccount(), { code: "" });
});

test("FSWorld.createContract - with balance", async () => {
  const contract = await world.createContract({ balance: 10n });
  assertAccount(await contract.getAccount(), { balance: 10n });
});

test("FSWorld.createContract - with file:", async () => {
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccount(), { code: worldCode });
});

test("FSWorld.createContract - with address & file:", async () => {
  const address = createAddressLike("vmContract");
  const contract = await world.createContract({ address, code: worldCode });
  assertAccount(await contract.getAccount(), { address, code: worldCode });
});

test("FSWorld.createContract - with shard", async () => {
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

test("FSWorld.getAccountNonce", async () => {
  await wallet.setAccount({ nonce: 10 });
  expect(await world.getAccountNonce(wallet)).toEqual(10);
});

test("FSWorld.getAccountBalance", async () => {
  await wallet.setAccount({ balance: 1234 });
  expect(await world.getAccountBalance(wallet)).toEqual(1234n);
});

test("FSWorld.getAccountKvs", async () => {
  await wallet.setAccount({ kvs: [[e.Str("n"), e.U(12)]] });
  expect(await world.getAccountKvs(wallet)).toEqual(
    e.kvs([[e.Str("n"), e.U(12)]]),
  );
});

test("FSWorld.getAccountWithoutKvs", async () => {
  await wallet.setAccount({ nonce: 10, balance: 1234 });
  assertAccount(await world.getAccountWithoutKvs(wallet), {
    nonce: 10,
    balance: 1234,
  });
});

test("FSWorld.getAccount", async () => {
  await wallet.setAccount({
    nonce: 10,
    balance: 1234,
    kvs: [[e.Str("n"), e.U(12)]],
  });
  assertAccount(await world.getAccount(wallet), {
    nonce: 10,
    balance: 1234,
    kvs: [[e.Str("n"), e.U(12)]],
  });
});

test("FSWorld.getInitialWallets", async () => {
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

test("FSWorld.setAccounts", async () => {
  await world.setAccounts([
    {
      address: wallet,
      balance: 10n ** 19n,
      kvs: {
        esdts: [{ id: fftId, amount: 10n ** 19n }],
      },
    },
    {
      address: contract,
      balance: 1234,
      code: expandCode(worldCode),
      codeMetadata: ["upgradeable"],
      kvs: [[e.Str("n"), e.U64(10)]],
      owner: wallet,
    },
  ]);
  assertAccount(await wallet.getAccount(), {
    address: wallet,
    balance: 10n ** 19n,
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 19n }],
    },
  });
  assertAccount(await contract.getAccount(), {
    address: contract,
    balance: 1234,
    code: worldCode,
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
});

test("FSWorld.setAccount", async () => {
  await world.setAccount({
    address: contract,
    balance: 1234,
    code: worldCode,
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
  assertAccount(await contract.getAccount(), {
    balance: 1234,
    code: worldCode,
    codeHash:
      "d8c9ddd83e614eaefd0a0c9d4f350bc3bb6368281ff71e030fc9d3d65b6ef2ae",
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
});

test("FSWorld.query - basic", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test("FSWorld.query - sender", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test("FSWorld.query - value", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test("FSWorld.query.assertFail - correct parameters", async () => {
  await world
    .query({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
    })
    .assertFail({ code: "user error", message: "Amount is not positive." });
});

test("FSWorld.sendTx & FSWorld.resolveTx.assertPending & FSWorld.resolveTx.assertSucceed", async () => {
  const txHash = await world.sendTx({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  await world.resolveTx(txHash).assertPending();
  await world.generateBlocks(4); // TODO-MvX: bug here
  const { fee } = await world.resolveTx(txHash).assertSucceed();
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("FSWorld.executeTx", async () => {
  const { hash, explorerUrl, gasUsed, fee } = await world.executeTx({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(50_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("FSWorld.transfer", async () => {
  const { fee } = await world.transfer({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("FSWorld.deployContract", async () => {
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

test("FSWorld.upgradeContract", async () => {
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

test("FSWorld.callContract", async () => {
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

test("FSWorld.terminate", () => {
  expect(childProcesses.size).toEqual(1);
  const childProcess = [...childProcesses][0];
  world.terminate();
  expect(childProcesses.size).toEqual(0);
  expect(childProcess.killed);
});

test("FSWallet.query", async () => {
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test("FSWallet.query - try to change the state", async () => {
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

test("FSWallet.callContract failure", async () => {
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

test("FSWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("FSWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("FSWallet.getAccountKvs", async () => {
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 10n ** 18n }] }),
  );
});

test("FSWallet.getAccountWithoutKvs", async () => {
  assertAccount(await wallet.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: [],
    owner: "",
  });
});

test("FSWallet.getAccount", async () => {
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

test("FSWallet.setAccount - FSWallet.getAccount", async () => {
  const before = await wallet.getAccount();
  await wallet.setAccount(before);
  const after = await wallet.getAccount();
  expect(after).toEqual(before);
});

test("FSWallet.executeTx", async () => {
  const { hash, explorerUrl, gasUsed, fee } = await wallet.executeTx({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(50_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("FSWallet.transfer - EGLD", async () => {
  const { fee } = await wallet.transfer({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("FSWallet.transfer - ESDTs", async () => {
  await wallet.transfer({
    receiver: otherWallet,
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await otherWallet.getAccount(), {
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 17n }] },
  });
});

test("FSWallet.deployContract", async () => {
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

test("FSWallet.upgradeContract", async () => {
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

test("FSWallet.callContract with EGLD", async () => {
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

test("FSWallet.callContract with ESDT", async () => {
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

test("FSWallet.callContract with return", async () => {
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.U64(20)]);
});

test("FSWallet.callContract - change the state", async () => {
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

test("FSWallet.callContract failure", async () => {
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

test("FSWallet.callContract.assertFail - correct parameters", async () => {
  await wallet
    .callContract({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: "signalError", message: "Amount is not positive." });
});

test("FSWallet.callContract.assertFail - Wrong code", async () => {
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
    "Failed with unexpected error code.\nExpected code: 5\nReceived code: signalError",
  );
});

test("FSWallet.callContract.assertFail - Wrong message", async () => {
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
});

test("FSWallet.callContract.assertFail - Transaction not failing", async () => {
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
});

test("FSContract.getAccountNonce", async () => {
  expect(await contract.getAccountNonce()).toEqual(0);
});

test("FSContract.getAccountBalance", async () => {
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test("FSContract.getAccountKvs", async () => {
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
  );
});

test("FSContract.getAccountWithoutKvs", async () => {
  assertAccount(await contract.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("FSContract.getAccount", async () => {
  assertAccount(await contract.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: worldCode,
    codeHash:
      "d8c9ddd83e614eaefd0a0c9d4f350bc3bb6368281ff71e030fc9d3d65b6ef2ae",
    codeMetadata: ["readable"],
    owner: wallet,
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test("FSContract.setAccount - FSContract.getAccount", async () => {
  const before = await contract.getAccount();
  await contract.setAccount(before);
  const after = await contract.getAccount();
  expect(after).toEqual(before);
});
