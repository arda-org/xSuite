import { afterEach, beforeEach, expect, test } from "@jest/globals";
import { assertAccount, assertHexList } from "../assert";
import { d, e } from "../data";
import { kvsToRawKvs } from "../data/kvs";
import { SWorld, SContract, SWallet } from "./sworld";
import { isContractAddress } from "./utils";

let world: SWorld;
let wallet: SWallet;
let otherWallet: SWallet;
let contract: SContract;
const fftId = "FFT-abcdef";
const worldCode = "file:contracts/world/output/world.wasm";

beforeEach(async () => {
  world = await SWorld.start();
  wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: [e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
  otherWallet = await world.createWallet();
  contract = await wallet.createContract({
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["payable"],
    kvs: [
      e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }]),
      [e.Str("n"), e.U64(1)],
    ],
  });
});

afterEach(async () => {
  await world.terminate();
});

test("SWorld.createWallet", async () => {
  const wallet = await world.createWallet();
  assertAccount(await wallet.getAccountWithKvs(), {});
});

test("SWorld.createWallet - is wallet address", async () => {
  const wallet = await world.createWallet();
  expect(isContractAddress(wallet)).toEqual(false);
});

test("SWorld.createContract", async () => {
  const contract = await world.createContract();
  assertAccount(await contract.getAccountWithKvs(), { code: "00" });
});

test("SWorld.createContract - is contract address", async () => {
  const contract = await world.createContract();
  expect(isContractAddress(contract)).toEqual(true);
});

test("SWorld.createContract - file:", async () => {
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccountWithKvs(), { code: worldCode });
});

test("SWorld.query", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_n",
  });
  expect(d.U64().topDecode(returnData[0])).toEqual(1n);
});

test("SWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("SWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("SWallet.getAccountKvs", async () => {
  expect(await wallet.getAccountKvs()).toEqual(
    kvsToRawKvs(e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }])),
  );
});

test("SWallet.getAccount", async () => {
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("SWallet.getAccountWithKvs", async () => {
  assertAccount(await wallet.getAccountWithKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: null,
    codeMetadata: ["readable"],
    owner: null,
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
});

test("SWallet.getAccountWithKvs + SWorld.createWallet", async () => {
  const wallet1 = await world.createWallet();
  const wallet1Data = await wallet1.getAccountWithKvs();
  const wallet2 = await world.createWallet(wallet1Data);
  assertAccount(await wallet2.getAccountWithKvs(), wallet1Data);
});

test("SContract.getAccountNonce", async () => {
  expect(await contract.getAccountNonce()).toEqual(0);
});

test("SContract.getAccountBalance", async () => {
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test("SContract.getAccountKvs", async () => {
  expect(await contract.getAccountKvs()).toEqual(
    kvsToRawKvs([
      e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }]),
      [e.Str("n"), e.U64(1)],
    ]),
  );
});

test("SContract.getAccount", async () => {
  assertAccount(await contract.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("SContract.getAccountWithKvs", async () => {
  assertAccount(await contract.getAccountWithKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["payable"],
    owner: wallet,
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
});

test("SContract.getAccountWithKvs + SContract.createContract", async () => {
  const contract1 = await world.createContract();
  const contract1Data = await contract1.getAccountWithKvs();
  const contract2 = await world.createContract(contract1Data);
  assertAccount(await contract2.getAccountWithKvs(), contract1Data);
});

test("SWallet.executeTx", async () => {
  await wallet.executeTx({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 9n * 10n ** 17n,
  });
  assertAccount(await otherWallet.getAccountWithKvs(), {
    balance: 10n ** 17n,
  });
});

test("SWallet.transfer", async () => {
  await wallet.transfer({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  await wallet.transfer({
    receiver: otherWallet,
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 9n * 10n ** 17n,
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 9n * 10n ** 17n }])],
  });
  assertAccount(await otherWallet.getAccountWithKvs(), {
    balance: 10n ** 17n,
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 10n ** 17n }])],
  });
});

test("SWallet.deployContract & upgradeContract", async () => {
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable", "payable", "payableBySc", "upgradeable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
  await wallet.upgradeContract({
    callee: contract,
    code: worldCode,
    codeMetadata: "0000",
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test("SWallet.deployContract & upgradeContract - file:", async () => {
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable", "payable", "payableBySc", "upgradeable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
  await wallet.upgradeContract({
    callee: contract,
    code: worldCode,
    codeMetadata: "0000",
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test("SWallet.deployContract - is contract address", async () => {
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: [],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  expect(isContractAddress(contract)).toEqual(true);
});

test("SWallet.callContract with EGLD", async () => {
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 9n * 10n ** 17n,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10n ** 18n + 10n ** 17n,
  });
});

test("SWallet.callContract with ESDT", async () => {
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 9n * 10n ** 17n }])],
  });
  assertAccount(await contract.getAccountWithKvs(), {
    hasKvs: [e.kvs.Esdts([{ id: fftId, amount: 10n ** 18n + 10n ** 17n }])],
  });
});

test("SWallet.callContract with return", async () => {
  const txResult = await wallet.callContract({
    callee: contract,
    funcName: "get_n",
    gasLimit: 10_000_000,
  });
  assertHexList(txResult.returnData, ["01"]);
});

test("SWallet.callContract.assertFail - Correct parameters", async () => {
  await wallet
    .callContract({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test("SWallet.callContract.assertFail - Wrong code", async () => {
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

test("SWallet.callContract.assertFail - Wrong message", async () => {
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

test("SWallet.callContract.assertFail - Transaction not failing", async () => {
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(1)],
        gasLimit: 10_000_000,
      })
      .assertFail(),
  ).rejects.toThrow("Transaction has not failed.");
});
