import { afterEach, beforeEach, expect, test } from "vitest";
import { assertAccount, assertVs } from "../assert";
import { e } from "../data";
import { childProcesses } from "./childProcesses";
import { DummySigner } from "./signer";
import { SWorld, SContract, SWallet } from "./sworld";
import {
  generateContractU8AAddress,
  generateWalletU8AAddress,
  isContractAddress,
} from "./utils";
import { expandCode } from "./world";

let world: SWorld;
let wallet: SWallet;
let otherWallet: SWallet;
let contract: SContract;
const fftId = "FFT-abcdef";
const sftId = "SFT-abcdef";
const worldCode = "file:contracts/world/output/world.wasm";
const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";
const zeroU8AAddress = new Uint8Array(32);
const emptyAccount = {
  nonce: 0,
  balance: 0,
  code: "",
  codeHash: "",
  codeMetadata: "",
  owner: "",
  kvs: {},
};
const explorerUrl = "http://explorer.local";

beforeEach(async () => {
  world = await SWorld.start({ explorerUrl });
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

afterEach(async () => {
  world.terminate();
});

test("SWorld.proxy.getAccountNonce on empty bech address", async () => {
  expect(await world.proxy.getAccountNonce(zeroBechAddress)).toEqual(0);
});

test("SWorld.proxy.getAccountNonce on empty hex address", async () => {
  expect(await world.proxy.getAccountNonce(zeroHexAddress)).toEqual(0);
});

test("SWorld.proxy.getAccountNonce on empty U8A address", async () => {
  expect(await world.proxy.getAccountNonce(zeroU8AAddress)).toEqual(0);
});

test("SWorld.proxy.getAccountBalance on empty bech address", async () => {
  expect(await world.proxy.getAccountBalance(zeroBechAddress)).toEqual(0n);
});

test("SWorld.proxy.getAccountBalance on empty hex address", async () => {
  expect(await world.proxy.getAccountBalance(zeroHexAddress)).toEqual(0n);
});

test("SWorld.proxy.getAccountBalance on empty U8A address", async () => {
  expect(await world.proxy.getAccountBalance(zeroU8AAddress)).toEqual(0n);
});

test("SWorld.proxy.getAccountWithKvs on empty bech address", async () => {
  assertAccount(
    await world.proxy.getAccountWithKvs(zeroBechAddress),
    emptyAccount,
  );
});

test("SWorld.proxy.getAccountWithKvs on empty hex address", async () => {
  assertAccount(
    await world.proxy.getAccountWithKvs(zeroHexAddress),
    emptyAccount,
  );
});

test("SWorld.proxy.getAccountWithKvs on empty U8A address", async () => {
  assertAccount(
    await world.proxy.getAccountWithKvs(zeroU8AAddress),
    emptyAccount,
  );
});

test("SWorld.new with defined chainId", () => {
  expect(() => SWorld.new({ chainId: "D" })).toThrow(
    "chainId is not undefined.",
  );
});

test("SWorld.newDevnet", () => {
  expect(() => SWorld.newDevnet()).toThrow("newDevnet is not implemented.");
});

test("SWorld.newTestnet", () => {
  expect(() => SWorld.newTestnet()).toThrow("newTestnet is not implemented.");
});

test("SWorld.newMainnet", () => {
  expect(() => SWorld.newMainnet()).toThrow("newMainnet is not implemented.");
});

test("SWorld.newWallet", async () => {
  const wallet = world.newWallet(new DummySigner(zeroU8AAddress));
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("SWorld.newContract", async () => {
  const wallet = world.newWallet(new DummySigner(zeroU8AAddress));
  expect(wallet.toTopU8A()).toEqual(zeroU8AAddress);
});

test("SWorld.createWallet - empty wallet", async () => {
  const wallet = await world.createWallet();
  expect(wallet.explorerUrl).toEqual(`${explorerUrl}/accounts/${wallet}`);
  expect(isContractAddress(wallet)).toEqual(false);
  assertAccount(await wallet.getAccountWithKvs(), {});
});

test("SWorld.createWallet - with balance", async () => {
  const wallet = await world.createWallet({ balance: 10n });
  assertAccount(await wallet.getAccountWithKvs(), { balance: 10n });
});

test("SWorld.createWallet - with address & balance", async () => {
  const address = generateWalletU8AAddress();
  const wallet = await world.createWallet({ address, balance: 10n });
  assertAccount(await wallet.getAccountWithKvs(), { address, balance: 10n });
});

test("SWorld.createContract - empty contract", async () => {
  const contract = await world.createContract();
  expect(contract.explorerUrl).toEqual(`${explorerUrl}/accounts/${contract}`);
  expect(isContractAddress(contract)).toEqual(true);
  assertAccount(await contract.getAccountWithKvs(), { code: "00" });
});

test("SWorld.createContract - with balance", async () => {
  const contract = await world.createContract({ balance: 10n });
  assertAccount(await contract.getAccountWithKvs(), { balance: 10n });
});

test("SWorld.createContract - with file:", async () => {
  const contract = await world.createContract({ code: worldCode });
  assertAccount(await contract.getAccountWithKvs(), { code: worldCode });
});

test("SWorld.createContract - with address & file:", async () => {
  const address = generateContractU8AAddress();
  const contract = await world.createContract({ address, code: worldCode });
  assertAccount(await contract.getAccountWithKvs(), {
    address,
    code: worldCode,
  });
});

test("SWorld.getAccountNonce", async () => {
  await wallet.setAccount({ nonce: 10 });
  expect(await world.getAccountNonce(wallet)).toEqual(10);
});

test("SWorld.getAccountBalance", async () => {
  await wallet.setAccount({ balance: 1234 });
  expect(await world.getAccountBalance(wallet)).toEqual(1234n);
});

test("SWorld.getAccount", async () => {
  await wallet.setAccount({ nonce: 10, balance: 1234 });
  assertAccount(await world.getAccount(wallet), { nonce: 10, balance: 1234 });
});

test("SWorld.getAccountKvs", async () => {
  await wallet.setAccount({ kvs: [[e.Str("n"), e.U(12)]] });
  expect(await world.getAccountKvs(wallet)).toEqual(
    e.kvs([[e.Str("n"), e.U(12)]]),
  );
});

test("SWorld.getAccountWithKvs", async () => {
  await wallet.setAccount({
    nonce: 10,
    balance: 1234,
    kvs: [[e.Str("n"), e.U(12)]],
  });
  assertAccount(await world.getAccountWithKvs(wallet), {
    nonce: 10,
    balance: 1234,
    kvs: [[e.Str("n"), e.U(12)]],
  });
});

test("SWorld.getAllSerializableAccountsWithKvs", async () => {
  expect(await world.getAllSerializableAccountsWithKvs()).toEqual([
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
      address: "erd1qyqqqqpmqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc3scyn",
      balance: "0",
      code: "",
      codeHash: "",
      codeMetadata: ["readable"],
      kvs: {},
      nonce: 0,
      owner: "",
    }),
  ]);
});

test("SWorld.setAccounts", async () => {
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
  assertAccount(await wallet.getAccountWithKvs(), {
    address: wallet,
    balance: 10n ** 19n,
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 19n }],
    },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    address: contract,
    balance: 1234,
    code: worldCode,
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
});

test("SWorld.setAccount", async () => {
  await world.setAccount({
    address: contract,
    balance: 1234,
    code: worldCode,
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 1234,
    code: worldCode,
    codeHash:
      "d8c9ddd83e614eaefd0a0c9d4f350bc3bb6368281ff71e030fc9d3d65b6ef2ae",
    codeMetadata: ["upgradeable"],
    kvs: [[e.Str("n"), e.U64(10)]],
    owner: wallet,
  });
});

test("SWorld.setCurrentBlockInfo", async () => {
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

test("SWorld.setPreviousBlockInfo", async () => {
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

test("SWorld.query - basic", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
  });
  assertVs(returnData, [e.U64(20n)]);
});

test("SWorld.query - sender", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_caller",
    sender: wallet,
  });
  assertVs(returnData, [wallet]);
});

test("SWorld.query - value", async () => {
  const { returnData } = await world.query({
    callee: contract,
    funcName: "get_value",
    value: 10,
  });
  assertVs(returnData, [e.U(10)]);
});

test("SWorld.query.assertFail - Correct parameters", async () => {
  await world
    .query({
      callee: contract,
      funcName: "require_positive",
      funcArgs: [e.U64(0)],
    })
    .assertFail({ code: 4, message: "Amount is not positive." });
});

test("SWorld.executeTx", async () => {
  const { tx } = await world.executeTx({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(tx.hash).toBeTruthy();
  expect(tx.explorerUrl).toEqual(`${explorerUrl}/transactions/${tx.hash}`);
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 9n * 10n ** 17n,
  });
  assertAccount(await otherWallet.getAccountWithKvs(), {
    balance: 10n ** 17n,
  });
});

test("SWorld.transfer", async () => {
  await world.transfer({
    sender: wallet,
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  await world.transfer({
    sender: wallet,
    receiver: otherWallet,
    esdts: [{ id: fftId, amount: 10n ** 17n }],
    gasLimit: 10_000_000,
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 9n * 10n ** 17n,
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await otherWallet.getAccountWithKvs(), {
    balance: 10n ** 17n,
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 17n }] },
  });
});

test("SWorld.deployContract", async () => {
  const { contract } = await world.deployContract({
    sender: wallet,
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  expect(isContractAddress(contract)).toEqual(true);
  expect(contract.explorerUrl).toEqual(`${explorerUrl}/accounts/${contract}`);
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test("SWorld.upgradeContract", async () => {
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
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test("SWorld.callContract", async () => {
  await world.callContract({
    sender: wallet,
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

test("SWorld.terminate", () => {
  expect(childProcesses.size).toEqual(1);
  const childProcess = [...childProcesses][0];
  world.terminate();
  expect(childProcesses.size).toEqual(0);
  expect(childProcess.killed);
});

test("SWallet.query", async () => {
  const { returnData } = await wallet.query({
    callee: contract,
    funcName: "get_caller",
  });
  assertVs(returnData, [wallet]);
});

test("SWallet.query - try to change the state", async () => {
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 10n ** 18n,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10n ** 18n,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
  await wallet.query({
    callee: contract,
    funcName: "fund",
    value: 10,
  });
  await world.query({
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(100)],
  });
  assertAccount(await wallet.getAccountWithKvs(), {
    balance: 10n ** 18n,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    balance: 10n ** 18n,
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
});

test.todo("SWallet.query - esdts", async () => {
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

test("SWallet.callContract failure", async () => {
  await expect(
    world.query({
      callee: contract,
      funcName: "non_existent_function",
    }),
  ).rejects.toMatchObject({
    message: expect.stringMatching(
      /^Query failed: 1 - invalid function \(not found\) - Result:\n\{\n {2}"executionLogs": "(.*)",/,
    ),
    stack: expect.stringMatching(/src\/world\/sworld\.test\.ts:[0-9]+:[0-9]+/),
  });
});

test("SWallet.getAccountNonce", async () => {
  expect(await wallet.getAccountNonce()).toEqual(0);
});

test("SWallet.getAccountBalance", async () => {
  expect(await wallet.getAccountBalance()).toEqual(10n ** 18n);
});

test("SWallet.getAccountKvs", async () => {
  expect(await wallet.getAccountKvs()).toEqual(
    e.kvs({ esdts: [{ id: fftId, amount: 10n ** 18n }] }),
  );
});

test("SWallet.getAccount", async () => {
  assertAccount(await wallet.getAccount(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
  });
});

test("SWallet.getAccountWithKvs", async () => {
  assertAccount(await wallet.getAccountWithKvs(), {
    nonce: 0,
    balance: 10n ** 18n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    owner: "",
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test("SWallet.setAccount - SWallet.getAccountWithKvs", async () => {
  const before = await wallet.getAccountWithKvs();
  await wallet.setAccount(before);
  const after = await wallet.getAccountWithKvs();
  expect(after).toEqual(before);
});

test("SWallet.executeTx", async () => {
  const { tx } = await wallet.executeTx({
    receiver: otherWallet,
    value: 10n ** 17n,
    gasLimit: 10_000_000,
  });
  expect(tx.hash).toBeTruthy();
  expect(tx.explorerUrl).toEqual(`${explorerUrl}/transactions/${tx.hash}`);
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
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await otherWallet.getAccountWithKvs(), {
    balance: 10n ** 17n,
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 17n }] },
  });
});

test("SWallet.deployContract", async () => {
  const { contract } = await wallet.deployContract({
    code: worldCode,
    codeMetadata: ["readable"],
    codeArgs: [e.U64(1)],
    gasLimit: 10_000_000,
  });
  expect(isContractAddress(contract)).toEqual(true);
  expect(contract.explorerUrl).toEqual(`${explorerUrl}/accounts/${contract}`);
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(1)]],
  });
});

test("SWallet.upgradeContract", async () => {
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
  assertAccount(await contract.getAccountWithKvs(), {
    code: worldCode,
    codeMetadata: ["readable"],
    hasKvs: [[e.Str("n"), e.U64(2)]],
  });
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
    hasKvs: { esdts: [{ id: fftId, amount: 9n * 10n ** 17n }] },
  });
  assertAccount(await contract.getAccountWithKvs(), {
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n + 10n ** 17n }] },
  });
});

test("SWallet.callContract with return", async () => {
  const { returnData } = await wallet.callContract({
    callee: contract,
    funcName: "multiply_by_n",
    funcArgs: [e.U64(10)],
    gasLimit: 10_000_000,
  });
  assertVs(returnData, [e.U64(20)]);
});

test("SWallet.callContract - change the state", async () => {
  await wallet.callContract({
    callee: contract,
    funcName: "set_n",
    funcArgs: [e.U64(100)],
    gasLimit: 10_000_000,
  });
  assertAccount(await contract.getAccountWithKvs(), {
    kvs: {
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(100)]],
    },
  });
});

test("SWallet.callContract failure", async () => {
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
    stack: expect.stringMatching(/src\/world\/sworld\.test\.ts:[0-9]+:[0-9]+/),
  });
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
  ).rejects.toThrow("No failure.");
});

test("SContract.getAccountNonce", async () => {
  expect(await contract.getAccountNonce()).toEqual(0);
});

test("SContract.getAccountBalance", async () => {
  expect(await contract.getAccountBalance()).toEqual(10n ** 18n);
});

test("SContract.getAccountKvs", async () => {
  expect(await contract.getAccountKvs()).toEqual(
    e.kvs({
      esdts: [{ id: fftId, amount: 10n ** 18n }],
      extraKvs: [[e.Str("n"), e.U64(2)]],
    }),
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
    codeHash:
      "d8c9ddd83e614eaefd0a0c9d4f350bc3bb6368281ff71e030fc9d3d65b6ef2ae",
    codeMetadata: ["readable"],
    owner: wallet,
    hasKvs: { esdts: [{ id: fftId, amount: 10n ** 18n }] },
  });
});

test("SContract.setAccount - SContract.getAccountWithKvs", async () => {
  const before = await contract.getAccountWithKvs();
  await contract.setAccount(before);
  const after = await contract.getAccountWithKvs();
  expect(after).toEqual(before);
});
