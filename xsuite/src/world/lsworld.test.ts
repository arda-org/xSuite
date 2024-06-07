import { afterEach, beforeEach, expect, test } from "vitest";
import { assertAccount, assertVs } from "../assert";
import { e } from "../data";
import {
  zeroBechAddress,
  zeroHexAddress,
  zeroU8AAddress,
} from "../data/address";
import { getAddressType } from "../data/utils";
import { childProcesses } from "./childProcesses";
import { LSWorld, LSContract, LSWallet } from "./lsworld";
import { createAddressLike } from "./utils";
import { expandCode } from "./world";

let world: LSWorld;
let wallet: LSWallet;
let otherWallet: LSWallet;
let contract: LSContract;
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
  world = await LSWorld.start({ explorerUrl: baseExplorerUrl });
  wallet = await world.createWallet({
    balance: 10n ** 18n,
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
    },
  });
  otherWallet = await world.createWallet();
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

test("LSWorld.proxy.getAccountNonce on empty bech address", async () => {
  expect(await world.proxy.getAccountNonce(zeroBechAddress)).toEqual(0);
});

test("LSWorld.proxy.getAccountNonce on empty hex address", async () => {
  expect(await world.proxy.getAccountNonce(zeroHexAddress)).toEqual(0);
});

test("LSWorld.proxy.getAccountNonce on empty U8A address", async () => {
  expect(await world.proxy.getAccountNonce(zeroU8AAddress)).toEqual(0);
});

test("LSWorld.proxy.getAccountBalance on empty bech address", async () => {
  expect(await world.proxy.getAccountBalance(zeroBechAddress)).toEqual(0n);
});

test("LSWorld.proxy.getAccountBalance on empty hex address", async () => {
  expect(await world.proxy.getAccountBalance(zeroHexAddress)).toEqual(0n);
});

test("LSWorld.proxy.getAccountBalance on empty U8A address", async () => {
  expect(await world.proxy.getAccountBalance(zeroU8AAddress)).toEqual(0n);
});

test("LSWorld.proxy.getAccount on empty bech address", async () => {
  assertAccount(await world.proxy.getAccount(zeroBechAddress), emptyAccount);
});

test("LSWorld.proxy.getAccount on empty hex address", async () => {
  assertAccount(await world.proxy.getAccount(zeroHexAddress), emptyAccount);
});

test("LSWorld.proxy.getAccount on empty U8A address", async () => {
  assertAccount(await world.proxy.getAccount(zeroU8AAddress), emptyAccount);
});

test("LSWorld.new with defined chainId", () => {
  expect(() => LSWorld.new({ chainId: "D" })).toThrow(
    "chainId is not undefined.",
  );
});

test("LSWorld.newDevnet", () => {
  expect(() => LSWorld.newDevnet()).toThrow("newDevnet is not implemented.");
});

test("LSWorld.newTestnet", () => {
  expect(() => LSWorld.newTestnet()).toThrow("newTestnet is not implemented.");
});

test("LSWorld.newMainnet", () => {
  expect(() => LSWorld.newMainnet()).toThrow("newMainnet is not implemented.");
});

test("LSWorld.newWallet", async () => {
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("LSWorld.newContract", async () => {
  const wallet = world.newWallet(zeroU8AAddress);
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("LSWorld.createWallet - empty wallet", async () => {
  const wallet = await world.createWallet();
  expect(wallet.explorerUrl).toEqual(`${baseExplorerUrl}/accounts/${wallet}`);
  expect(getAddressType(wallet)).toEqual("wallet");
  assertAccount(await wallet.getAccount(), {});
});

test("LSWorld.createWallet - with balance", async () => {
  const wallet = await world.createWallet({ balance: 10n });
  assertAccount(await wallet.getAccount(), { balance: 10n });
});

test("LSWorld.createWallet - with address & balance", async () => {
  const address = createAddressLike("wallet");
  const wallet = await world.createWallet({ address, balance: 10n });
  assertAccount(await wallet.getAccount(), { address, balance: 10n });
});

test("LSWorld.createContract - empty contract", async () => {
  const contract = await world.createContract();
  expect(contract.explorerUrl).toEqual(
    `${baseExplorerUrl}/accounts/${contract}`,
  );
  expect(getAddressType(contract)).toEqual("vmContract");
  assertAccount(await contract.getAccount(), { code: "" });
});

test("LSWorld.createContract - with balance", async () => {
  const contract = await world.createContract({ balance: 10n });
  assertAccount(await contract.getAccount(), { balance: 10n });
});

test("LSWorld.createContract - with file:", async () => {
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccount(), { code: worldCode });
});

test("LSWorld.createContract - with address & file:", async () => {
  const address = createAddressLike("vmContract");
  const contract = await world.createContract({ address, code: worldCode });
  assertAccount(await contract.getAccount(), { address, code: worldCode });
});

test("LSWorld.getAccountNonce", async () => {
  await wallet.setAccount({ nonce: 10 });
  expect(await world.getAccountNonce(wallet)).toEqual(10);
});

test("LSWorld.getAccountBalance", async () => {
  await wallet.setAccount({ balance: 1234 });
  expect(await world.getAccountBalance(wallet)).toEqual(1234n);
});

test("LSWorld.getAccountKvs", async () => {
  await wallet.setAccount({ kvs: [[e.Str("n"), e.U(12)]] });
  expect(await world.getAccountKvs(wallet)).toEqual(
    e.kvs([[e.Str("n"), e.U(12)]]),
  );
});

test("LSWorld.getAccountWithoutKvs", async () => {
  await wallet.setAccount({ nonce: 10, balance: 1234 });
  assertAccount(await world.getAccountWithoutKvs(wallet), {
    nonce: 10,
    balance: 1234,
  });
});

test("LSWorld.getAccount", async () => {
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

test("LSWorld.getAllSerializableAccounts", async () => {
  expect(await world.getAllSerializableAccounts()).toEqual([
    e.account({
      address: contract,
      balance: 10n ** 18n,
      code: expandCode(worldCode),
      codeHash:
        "d8c9ddd83e614eaefd0a0c9d4f350bc3bb6368281ff71e030fc9d3d65b6ef2ae",
      codeMetadata: ["readable"],
      kvs: {
        esdts: [{ id: fftId, amount: 10n ** 18n }],
        mappers: [{ key: "n", value: e.U64(2) }],
      },
      nonce: 0,
      owner: wallet,
    }),
    e.account({
      address: otherWallet,
      balance: "0",
      code: "",
      codeHash: "",
      codeMetadata: ["readable"],
      kvs: {},
      nonce: 0,
      owner: "",
    }),
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
  ]);
});

test("LSWorld.setAccounts", async () => {
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

test("LSWorld.setAccount", async () => {
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

test("LSWorld.setCurrentBlockInfo", async () => {
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

test("LSWorld.setPreviousBlockInfo", async () => {
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

test("LSWorld.query - basic", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test("LSWorld.query - sender", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test("LSWorld.query - value", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test("LSWorld.query.assertFail - correct parameters", async () => {
  await world
    .query({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test("LSWorld.executeTx", async () => {
  const { hash, explorerUrl, gasUsed, fee } = await world.executeTx({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("LSWorld.transfer", async () => {
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

test("LSWorld.deployContract", async () => {
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

test("LSWorld.upgradeContract", async () => {
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

test("LSWorld.callContract", async () => {
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

test("LSWorld.terminate", () => {
  expect(childProcesses.size).toEqual(1);
  const childProcess = [...childProcesses][0];
  world.terminate();
  expect(childProcesses.size).toEqual(0);
  expect(childProcess.killed);
});

test("LSWallet.query", async () => {
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test("LSWallet.query - try to change the state", async () => {
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

test("LSWallet.callContract failure", async () => {
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

test("LSWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("LSWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("LSWallet.getAccountKvs", async () => {
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 10n ** 18n }] }),
  );
});

test("LSWallet.getAccountWithoutKvs", async () => {
  assertAccount(await wallet.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
  });
});

test("LSWallet.getAccount", async () => {
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

test("LSWallet.setAccount - LSWallet.getAccount", async () => {
  const before = await wallet.getAccount();
  await wallet.setAccount(before);
  const after = await wallet.getAccount();
  expect(after).toEqual(before);
});

test("LSWallet.executeTx", async () => {
  const { hash, explorerUrl, gasUsed, fee } = await wallet.executeTx({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(hash).toBeTruthy();
  expect(explorerUrl).toEqual(`${baseExplorerUrl}/transactions/${hash}`);
  expect(gasUsed).toEqual(10_000_000);
  assertAccount(await wallet.getAccount(), {
    balance: 9n * 10n ** 17n - fee,
  });
  assertAccount(await otherWallet.getAccount(), {
    balance: 10n ** 17n,
  });
});

test("LSWallet.transfer - EGLD", async () => {
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

test("LSWallet.transfer - ESDTs", async () => {
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

test("LSWallet.deployContract", async () => {
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

test("LSWallet.upgradeContract", async () => {
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

test("LSWallet.callContract with EGLD", async () => {
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

test("LSWallet.callContract with ESDT", async () => {
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

test("LSWallet.callContract with return", async () => {
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.U64(20)]);
});

test("LSWallet.callContract - change the state", async () => {
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

test("LSWallet.callContract failure", async () => {
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

test("LSWallet.callContract.assertFail - correct parameters", async () => {
  await wallet
    .callContract({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
      gasLimit: 10_000_000,
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test("LSWallet.callContract.assertFail - Wrong code", async () => {
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

test("LSWallet.callContract.assertFail - Wrong message", async () => {
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

test("LSWallet.callContract.assertFail - Transaction not failing", async () => {
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

test("LSContract.getAccountNonce", async () => {
  expect(await contract.getAccountNonce()).toEqual(0);
});

test("LSContract.getAccountBalance", async () => {
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test("LSContract.getAccountKvs", async () => {
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
  );
});

test("LSContract.getAccountWithoutKvs", async () => {
  assertAccount(await contract.getAccountWithoutKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
  });
});

test("LSContract.getAccount", async () => {
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

test("LSContract.setAccount - LSContract.getAccount", async () => {
  const before = await contract.getAccount();
  await contract.setAccount(before);
  const after = await contract.getAccount();
  expect(after).toEqual(before);
});
