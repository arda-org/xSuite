import { afterEach, beforeEach, expect, test } from "@jest/globals";
import { d, e, pairsToRawPairs } from "../data";
import { assertAccount, assertTxReturnData } from "../test";
import { FWorld, FWorldContract, FWorldWallet } from "./fworld";
import { readFileHex } from "./utils";

let world: FWorld;
let wallet: FWorldWallet;
let otherWallet: FWorldWallet;
let contract: FWorldContract;
const fftId = "FFT-abcdef";
const worldPath = "contracts/world/output/world.wasm";
const worldCode = readFileHex(worldPath);

beforeEach(async () => {
  world = await FWorld.start();
  wallet = await world.createWallet({
    balance: 10n ** 18n,
    pairs: [e.p.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
  otherWallet = await world.createWallet();
  contract = await world.createContract({
    balance: 10n ** 18n,
    code: worldCode,
    codeMetadata: ["payable"],
    pairs: [
      e.p.Esdts([{ id: fftId, amount: 10n ** 18n }]),
      [e.Str("n"), e.U64(1)],
    ],
  });
});

afterEach(async () => {
  await world.terminate();
});

test("FWorld.createWallet()", async () => {
  const wallet = await world.createWallet();
  assertAccount(await wallet.getAccountWithPairs(), {});
});

test("FWorld.createContract()", async () => {
  const contract = await world.createContract();
  assertAccount(await contract.getAccountWithPairs(), { code: "00" });
});

test("FWorld.createContract - file:", async () => {
  const contract = await world.createContract({ code: `file:${worldPath}` });
  assertAccount(await contract.getAccountWithPairs(), { code: worldCode });
});

test("FWorld.query", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_n",
  });
  expect(d.U64().topDecode(returnData[0])).toEqual(1n);
});

test("FWorldWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("FWorldWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("FWorldWallet.getAccountPairs", async () => {
  expect(await wallet.getAccountPairs()).toEqual(
    pairsToRawPairs(e.p.Esdts([{ id: fftId, amount: 10n ** 18n }]))
  );
});

test("FWorldWallet.getAccount", async () => {
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("FWorldWallet.getAccountWithPairs", async () => {
  assertAccount(await wallet.getAccountWithPairs(), {
    nonce: 0,
    balance: 10n ** 18n,
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
});

test("FWorldContract.getAccountNonce", async () => {
  expect(await contract.getAccountNonce()).toEqual(0);
});

test("FWorldContract.getAccountBalance", async () => {
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test("FWorldContract.getAccountPairs", async () => {
  expect(await contract.getAccountPairs()).toEqual(
    pairsToRawPairs([
      e.p.Esdts([{ id: fftId, amount: 10n ** 18n }]),
      [e.Str("n"), e.U64(1)],
    ])
  );
});

test("FWorldContract.getAccount", async () => {
  assertAccount(await contract.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("FWorldContract.getAccountWithPairs", async () => {
  assertAccount(await contract.getAccountWithPairs(), {
    nonce: 0,
    balance: 10n ** 18n,
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 10n ** 18n }])],
  });
});

test("FWorldWallet.executeTx", async () => {
  await wallet.executeTx({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithPairs(), {
    balance: 9n * 10n ** 17n,
  });
  assertAccount(await otherWallet.getAccountWithPairs(), {
    balance: 10n ** 17n,
  });
});

test("FWorldWallet.transfer", async () => {
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
  assertAccount(await wallet.getAccountWithPairs(), {
    balance: 9n * 10n ** 17n,
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 9n * 10n ** 17n }])],
  });
  assertAccount(await otherWallet.getAccountWithPairs(), {
    balance: 10n ** 17n,
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 10n ** 17n }])],
  });
});

test("FWorldWallet.deployContract & upgradeContract", async () => {
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable", "payable", "payableBySc", "upgradeable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithPairs(), {
    code: worldCode,
    hasPairs: [[e.Str("n"), e.U64(1)]],
  });
  await wallet.upgradeContract({
    callee: contract,
    code: worldCode,
    codeMetadata: "0000",
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithPairs(), {
    code: worldCode,
    hasPairs: [[e.Str("n"), e.U64(2)]],
  });
});

test("FWorldWallet.deployContract & upgradeContract - file:", async () => {
  const { contract } = await wallet.deployContract({
    code: `file:${worldPath}`,
    codeMetadata: ["readable", "payable", "payableBySc", "upgradeable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithPairs(), {
    code: worldCode,
    hasPairs: [[e.Str("n"), e.U64(1)]],
  });
  await wallet.upgradeContract({
    callee: contract,
    code: `file:${worldPath}`,
    codeMetadata: "0000",
    codeArgs: [e.U64(2)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithPairs(), {
    code: worldCode,
    hasPairs: [[e.Str("n"), e.U64(2)]],
  });
});

test("FWorldWallet.callContract with EGLD", async () => {
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithPairs(), {
    balance: 9n * 10n ** 17n,
  });
  assertAccount(await contract.getAccountWithPairs(), {
    balance: 10n ** 18n + 10n ** 17n,
  });
});

test("FWorldWallet.callContract with ESDT", async () => {
  await wallet.callContract({
    callee: contract,
    funcName: "fund",
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithPairs(), {
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 9n * 10n ** 17n }])],
  });
  assertAccount(await contract.getAccountWithPairs(), {
    hasPairs: [e.p.Esdts([{ id: fftId, amount: 10n ** 18n + 10n ** 17n }])],
  });
});

test("FWorldWallet.callContract with return", async () => {
  const txResult = await wallet.callContract({
    callee: contract,
    funcName: "get_n",
    gasLimit: 10_000_000,
  });
  assertTxReturnData(txResult.returnData, ["01"]);
});

test("FWorldWallet.callContract.assertFail - Correct parameters", async () => {
  await wallet
    .callContract({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test("FWorldWallet.callContract.assertFail - Wrong code", async () => {
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(0)],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: 5 })
  ).rejects.toThrow(
    "Failed with unexpected error code.\nExpected code: 5\nReceived code: 4"
  );
});

test("FWorldWallet.callContract.assertFail - Wrong message", async () => {
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(0)],
        gasLimit: 10_000_000,
      })
      .assertFail({ message: "" })
  ).rejects.toThrow(
    "Failed with unexpected error message.\nExpected message: \nReceived message: Amount is not positive."
  );
});

test("FWorldWallet.callContract.assertFail - Transaction not failing", async () => {
  await expect(
    wallet
      .callContract({
        callee: contract,
        funcName: "require_positive",
        funcArgs: [e.U64(1)],
        gasLimit: 10_000_000,
      })
      .assertFail()
  ).rejects.toThrow("Transaction has not failed.");
});
