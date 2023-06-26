import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { e } from "../enc";
import { getEsdtsKvs, kvsToPairs } from "../pairs";
import { assertAccount } from "../test";
import { FWorld, FWorldContract, FWorldWallet } from "./fworld";
import { readFileHex } from "./utils";

let world: FWorld;
let wallet: FWorldWallet;
let otherWallet: FWorldWallet;
let contract: FWorldContract;
const fftId = "FFT-abcdef";
const storageCode = readFileHex("contracts/storage/output/storage.wasm");
const esdtCode = readFileHex("contracts/esdt/output/esdt.wasm");

beforeAll(async () => {
  world = await FWorld.start();
  wallet = await world.createWallet({
    balance: 10n ** 18n,
    esdts: [{ id: fftId, amount: 10n ** 18n }],
  });
  otherWallet = await world.createWallet({});
  contract = await world.createContract({
    code: readFileHex("contracts/world/output/world.wasm"),
  });
});

afterAll(async () => {
  await world.terminate();
});

test("FWorldWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("FWorldWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("FWorldWallet.getAccountPairs", async () => {
  expect(await wallet.getAccountPairs()).toEqual(
    kvsToPairs(getEsdtsKvs([{ id: fftId, amount: 10n ** 18n }]))
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
    containsEsdts: [{ id: fftId, amount: 10n ** 18n }],
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
    containsEsdts: [{ id: fftId, amount: 9n * 10n ** 17n }],
  });
  assertAccount(await otherWallet.getAccountWithPairs(), {
    balance: 10n ** 17n,
    containsEsdts: [{ id: fftId, amount: 10n ** 17n }],
  });
});

test("FWorldWallet.deployContract & upgradeContract", async () => {
  const { deployedContract } = await wallet.deployContract({
    code: storageCode,
    codeMetadata: [],
    gasLimit: 10_000_000,
  });
  assertAccount(await deployedContract.getAccountWithPairs(), {
    code: storageCode,
  });
  await wallet.upgradeContract({
    callee: deployedContract,
    code: esdtCode,
    codeMetadata: [],
    gasLimit: 10_000_000,
  });
  assertAccount(await deployedContract.getAccountWithPairs(), {
    code: esdtCode,
  });
});

test("FWorldWallet.callContract.assertFail", async () => {
  await wallet
    .callContract(contract, {
      functionName: "require_ten",
      functionArgs: [e.U64(11)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "Amount is not equal to 10." });
  await expect(
    wallet
      .callContract(contract, {
        functionName: "require_ten",
        functionArgs: [e.U64(11)],
        gasLimit: 10_000_000,
      })
      .assertFail({ code: 5 })
  ).rejects.toThrowError("Failed with unexpected error code.");
  await expect(
    wallet
      .callContract(contract, {
        functionName: "require_ten",
        functionArgs: [e.U64(11)],
        gasLimit: 10_000_000,
      })
      .assertFail({ message: "" })
  ).rejects.toThrowError("Failed with unexpected error message.");
  await expect(
    wallet
      .callContract(contract, {
        functionName: "require_ten",
        functionArgs: [e.U64(10)],
        gasLimit: 10_000_000,
      })
      .assertFail()
  ).rejects.toThrowError("Transaction has not failed.");
});
