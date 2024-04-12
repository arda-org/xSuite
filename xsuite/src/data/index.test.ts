import { expect, test, beforeAll, afterAll } from "vitest";
import { SWorld, SContract, SWallet } from "../world";
import { readFileHex } from "../world/utils";
import { Account } from "./account";
import { EncodableMapper, eKvsUnfiltered } from "./encoding";
import { B64, d, e } from ".";

/* Data and helpers for tests */

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";
const zeroU8AAddress = new Uint8Array(32);

const vs = ["0102", "0304", "0506", "0a"];
let world: SWorld;
let wallet: SWallet;
let contract: SContract;
const fftId = "FFT-abcdef";
const sft1Id = "SFT1-abcdef";
const sft2Id = "SFT2-abcdef";
const sft3Id = "SFT3-abcdef";
let walletState: Account;
let complexContractState: Account;
let complexSysAccState: Account;

const range = (start: number, end: number) => {
  const output = [];
  for (let i = start; i < end; i++) {
    output.push(i);
  }
  return output;
};

beforeAll(async () => {
  world = await SWorld.start();
  wallet = await world.createWallet({
    balance: 20n,
  });
  walletState = await wallet.getSerializableAccountWithKvs();
  contract = await wallet.createContract({
    balance: 10n,
    code: "file:contracts/data/output/data.wasm",
    codeMetadata: ["readable", "upgradeable"],
    kvs: {
      esdts: [
        { id: fftId, roles: ["ESDTRoleLocalMint"] },
        {
          id: sft1Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        },
        {
          id: sft2Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        },
        {
          id: sft3Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        },
      ],
      extraKvs: {
        "010203": "040506",
      },
    },
  });
  await wallet.callContract({
    callee: contract,
    funcName: "esdt_local_mint",
    funcArgs: [e.Str(fftId), e.U64(0), e.U(10)],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "esdt_nft_create",
    funcArgs: range(1, 11).flatMap((i) => [
      e.Str(sft1Id),
      e.U(i),
      e.Str(`SFT1 ${i}`),
      e.U(i),
      e.U(i),
      i <= 5 ? e.Tuple(e.U(i), e.U(i)) : e.Str(`Attr ${i}`),
      e.List(e.Str(`URI1 ${i}`), e.Str(`URI2 ${i}`)),
    ]),
    gasLimit: 100_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "esdt_nft_create_compact",
    funcArgs: range(1, 11).flatMap((i) => [
      e.Str(sft2Id),
      e.U(i),
      e.Tuple(e.Str(`${i}`), e.U(i)),
    ]),
    gasLimit: 100_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "esdt_nft_create",
    funcArgs: [e.Str(sft3Id), e.U(1), e.Str(""), e.U(0), "", "", e.List()],
    gasLimit: 100_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "value_set",
    funcArgs: [e.Str("a"), e.U64(1), e.Str("b"), e.U64(2)],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "vec_push",
    funcArgs: [
      e.U64(1),
      e.U(1),
      e.List(e.U64(1), e.U64(2), e.U64(3)),
      e.U64(2),
      e.U(2),
      e.List(e.U64(4), e.U64(5), e.U64(6)),
    ],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "unordered_set_insert",
    funcArgs: [
      e.U64(3),
      e.List(e.U(7), e.U(8), e.U(9)),
      e.U64(4),
      e.List(e.U(10), e.U(11), e.U(12)),
    ],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "set_insert",
    funcArgs: [
      e.U64(5),
      e.List(e.U(13), e.U(14), e.U(15)),
      e.U64(6),
      e.List(e.U(18), e.U(17), e.U(16)),
    ],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "map_insert",
    funcArgs: [
      e.U(7),
      e.List(e.Tuple(e.Str("a"), e.U64(1)), e.Tuple(e.Str("b"), e.U64(2))),
      e.U(8),
      e.List(e.Tuple(e.Str("d"), e.U64(3)), e.Tuple(e.Str("c"), e.U64(4))),
    ],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    funcName: "user_create",
    funcArgs: [
      e.Str("a"),
      e.List(wallet, contract),
      e.Str("b"),
      e.List(wallet, contract),
    ],
    gasLimit: 10_000_000,
  });
  complexContractState = await contract.getSerializableAccountWithKvs();
  complexSysAccState = await world.sysAcc.getSerializableAccountWithKvs();
});

afterAll(async () => {
  world.terminate();
});

/* Encoding */

test("e.Buffer - odd hex length", () => {
  expect(() => e.Buffer("48656c6c6")).toThrow("Odd hex length.");
});

test("e.Buffer - invalid hex", () => {
  expect(() => e.Buffer("48656c6c6g")).toThrow("Invalid hex.");
});

test("e.Buffer.toTopHex - empty hex", () => {
  expect(e.Buffer("").toTopHex()).toEqual("");
});

test("e.Buffer.toTopHex - non-empty hex", () => {
  expect(e.Buffer("48656c6c").toTopHex()).toEqual("48656c6c");
});

test("e.Buffer.toTopB64 - non-empty hex", () => {
  expect(e.Buffer("48656c6c").toTopB64()).toEqual("SGVsbA==");
});

test("e.Buffer.toTopHex - non-empty base64", () => {
  expect(e.Buffer(B64("ASM=")).toTopHex()).toEqual("0123");
});

test("e.Buffer.toTopHex - empty Uint8Array", () => {
  expect(e.Buffer(new Uint8Array([])).toTopHex()).toEqual("");
});

test("e.Buffer.toTopHex - non-empty Uint8Array", () => {
  expect(e.Buffer(new Uint8Array([72, 101, 108, 108])).toTopHex()).toEqual(
    "48656c6c",
  );
});

test("e.Buffer.toNestHex - empty hex", () => {
  expect(e.Buffer("").toNestHex()).toEqual("00000000");
});

test("e.Buffer.toNestHex - non-empty hex", () => {
  expect(e.Buffer("48656c6c").toNestHex()).toEqual("0000000448656c6c");
});

test("e.Buffer.toNestB64 - non-empty hex", () => {
  expect(e.Buffer("48656c6c").toNestB64()).toEqual("AAAABEhlbGw=");
});

test("e.TopBuffer.toTopHex - empty hex", () => {
  expect(e.TopBuffer("").toTopHex()).toEqual("");
});

test("e.TopBuffer.toTopHex - non-empty hex", () => {
  expect(e.TopBuffer("48656c6c").toTopHex()).toEqual("48656c6c");
});

test("e.TopBuffer.toTopHex - non-empty b64", () => {
  expect(e.TopBuffer(B64("ASM=")).toTopHex()).toEqual("0123");
});

test("e.TopBuffer.toTopHex - empty Uint8Array", () => {
  expect(e.TopBuffer(new Uint8Array([])).toTopHex()).toEqual("");
});

test("e.TopBuffer.toTopHex - non-empty Uint8Array", () => {
  expect(e.TopBuffer(new Uint8Array([72, 101, 108, 108])).toTopHex()).toEqual(
    "48656c6c",
  );
});

test("e.TopBuffer.toNestHex - empty hex", () => {
  expect(e.TopBuffer("").toNestHex()).toEqual("");
});

test("e.TopBuffer.toNestHex - non-empty hex", () => {
  expect(e.TopBuffer("48656c6c").toNestHex()).toEqual("48656c6c");
});

test("e.Str.toTopHex", () => {
  expect(e.Str("hi").toTopHex()).toEqual("6869");
});

test("e.TopStr.toNestHex", () => {
  expect(e.TopStr("hi").toNestHex()).toEqual("6869");
});

test("e.Addr.toTopHex - bech address", () => {
  expect(e.Addr(zeroBechAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toTopHex - hex address", () => {
  expect(e.Addr(zeroHexAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toTopHex - u8a address", () => {
  expect(e.Addr(zeroU8AAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toNestHex - u8a address", () => {
  expect(e.Addr(zeroU8AAddress).toNestHex()).toEqual(zeroHexAddress);
});

test("e.Addr - Invalid address format", () => {
  const address =
    "btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5mhdvz";
  expect(() => e.Addr(address)).toThrow("Invalid address format.");
});

test("e.Addr - Too small address length", () => {
  const address = new Uint8Array(31);
  expect(() => e.Addr(address)).toThrow("Invalid address length.");
});

test("e.Addr - Too long address length", () => {
  const address = new Uint8Array(33);
  expect(() => e.Addr(address)).toThrow("Invalid address length.");
});

test("e.Bool", () => {
  expect(e.Bool(true).toTopHex()).toEqual("01");
});

const UXTestCases = {
  U8Success: [
    [0n, "", "00"],
    [1n, "01", "01"],
    [2n ** 7n - 1n, "7f", "7f"],
    [2n ** 7n, "80", "80"],
    [2n ** 8n - 1n, "ff", "ff"],
  ],
  U8Error: [
    [2n ** 8n, "Number above maximal value allowed."],
    [-1n, "Number is negative."],
  ],
  U16Success: [
    [0n, "", "0000"],
    [1n, "01", "0001"],
    [2n ** 7n - 1n, "7f", "007f"],
    [2n ** 7n, "80", "0080"],
    [2n ** 8n - 1n, "ff", "00ff"],
    [2n ** 8n, "0100", "0100"],
    [2n ** 16n - 1n, "ffff", "ffff"],
  ],
  U16Error: [
    [2n ** 16n, "Number above maximal value allowed."],
    [-1n, "Number is negative."],
  ],
  U32Success: [
    [0n, "", "00000000"],
    [1n, "01", "00000001"],
    [2n ** 7n - 1n, "7f", "0000007f"],
    [2n ** 7n, "80", "00000080"],
    [2n ** 8n - 1n, "ff", "000000ff"],
    [2n ** 8n, "0100", "00000100"],
    [2n ** 16n - 1n, "ffff", "0000ffff"],
    [2n ** 16n, "010000", "00010000"],
    [2n ** 32n - 1n, "ffffffff", "ffffffff"],
  ],
  U32Error: [
    [2n ** 32n, "Number above maximal value allowed."],
    [-1n, "Number is negative."],
  ],
  U64Success: [
    [0n, "", "0000000000000000"],
    [1n, "01", "0000000000000001"],
    [2n ** 7n - 1n, "7f", "000000000000007f"],
    [2n ** 7n, "80", "0000000000000080"],
    [2n ** 8n - 1n, "ff", "00000000000000ff"],
    [2n ** 8n, "0100", "0000000000000100"],
    [2n ** 16n - 1n, "ffff", "000000000000ffff"],
    [2n ** 16n, "010000", "0000000000010000"],
    [2n ** 32n - 1n, "ffffffff", "00000000ffffffff"],
    [2n ** 32n, "0100000000", "0000000100000000"],
    [2n ** 64n - 1n, "ffffffffffffffff", "ffffffffffffffff"],
  ],
  U64Error: [
    [2n ** 64n, "Number above maximal value allowed."],
    [-1n, "Number is negative."],
  ],
  USuccess: [
    [0n, "", "00000000"],
    [1n, "01", "0000000101"],
    [2n ** 7n - 1n, "7f", "000000017f"],
    [2n ** 7n, "80", "0000000180"],
    [2n ** 8n - 1n, "ff", "00000001ff"],
    [2n ** 8n, "0100", "000000020100"],
    [2n ** 16n - 1n, "ffff", "00000002ffff"],
    [2n ** 32n - 1n, "ffffffff", "00000004ffffffff"],
  ],
} as const;
UXTestCases.U8Success.forEach(([value, topEncoding, nestedEncoding]) => {
  test(`e.U8.toTopHex - In: ${value}`, () => {
    expect(e.U8(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.U8.toNestHex - In: ${value}`, () => {
    expect(e.U8(value).toNestHex()).toEqual(nestedEncoding);
  });
});
UXTestCases.U8Error.forEach(([value, error]) => {
  test(`e.U8 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.U8(value)).toThrow(error);
  });
});
UXTestCases.U16Success.forEach(([value, topEncoding, nestedEncoding]) => {
  test(`e.U16.toTopHex - In: ${value}`, () => {
    expect(e.U16(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.U16.toNestHex - In: ${value}`, () => {
    expect(e.U16(value).toNestHex()).toEqual(nestedEncoding);
  });
});
UXTestCases.U16Error.forEach(([value, error]) => {
  test(`e.U16 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.U16(value)).toThrow(error);
  });
});
UXTestCases.U32Success.forEach(([value, topEncoding, nestedEncoding]) => {
  test(`e.U32.toTopHex - In: ${value}`, () => {
    expect(e.U32(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.U32.toNestHex - In: ${value}`, () => {
    expect(e.U32(value).toNestHex()).toEqual(nestedEncoding);
  });
});
UXTestCases.U32Error.forEach(([value, error]) => {
  test(`e.U32 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.U32(value)).toThrow(error);
  });
});
UXTestCases.U64Success.forEach(([value, topEncoding, nestedEncoding]) => {
  test(`e.U64.toTopHex - In: ${value}`, () => {
    expect(e.U64(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.U64.toNestHex - In: ${value}`, () => {
    expect(e.U64(value).toNestHex()).toEqual(nestedEncoding);
  });
});
UXTestCases.U64Error.forEach(([value, error]) => {
  test(`e.U64 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.U64(value)).toThrow(error);
  });
});
UXTestCases.USuccess.forEach(([value, topEncoding, nestedEncoding]) => {
  test(`e.U.toTopHex - In: ${value}`, () => {
    expect(e.U(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.U.toNestHex - In: ${value}`, () => {
    expect(e.U(value).toNestHex()).toEqual(nestedEncoding);
  });
});

test("e.Usize.toTopHex", () => {
  expect(e.Usize(1234).toTopHex()).toEqual("04d2");
});

test("e.TopU.toNestHex", () => {
  expect(e.TopU(1234).toNestHex()).toEqual("04d2");
});

const IXTestCases = {
  I8Success: [
    [0n, "", "00"],
    [2n ** 7n - 1n, "7f", "7f"],
    [-1n, "ff", "ff"],
    [-(2n ** 7n), "80", "80"],
  ],
  I8Error: [
    [2n ** 7n, "Number above maximal value allowed."],
    [-(2n ** 7n) - 1n, "Number below minimal value allowed."],
  ],
  I16Success: [
    [0n, "", "0000"],
    [2n ** 7n - 1n, "7f", "007f"],
    [2n ** 7n, "0080", "0080"],
    [2n ** 15n - 1n, "7fff", "7fff"],
    [-1n, "ff", "ffff"],
    [-(2n ** 7n), "80", "ff80"],
    [-(2n ** 7n) - 1n, "ff7f", "ff7f"],
    [-(2n ** 15n), "8000", "8000"],
  ],
  I16Error: [
    [2n ** 15n, "Number above maximal value allowed."],
    [-(2n ** 15n) - 1n, "Number below minimal value allowed."],
  ],
  I32Success: [
    [0n, "", "00000000"],
    [2n ** 31n - 1n, "7fffffff", "7fffffff"],
    [-1n, "ff", "ffffffff"],
    [-(2n ** 31n), "80000000", "80000000"],
  ],
  I32Error: [
    [2n ** 31n, "Number above maximal value allowed."],
    [-(2n ** 31n) - 1n, "Number below minimal value allowed."],
  ],
  I64Success: [
    [0n, "", "0000000000000000"],
    [2n ** 63n - 1n, "7fffffffffffffff", "7fffffffffffffff"],
    [-1n, "ff", "ffffffffffffffff"],
    [-(2n ** 63n), "8000000000000000", "8000000000000000"],
  ],
  I64Error: [
    [2n ** 63n, "Number above maximal value allowed."],
    [-(2n ** 63n) - 1n, "Number below minimal value allowed."],
  ],
  ISuccess: [
    [0n, "", "00000000"],
    [1n, "01", "0000000101"],
    [127n, "7f", "000000017f"],
    [128n, "0080", "000000020080"],
    [255n, "00ff", "0000000200ff"],
    [256n, "0100", "000000020100"],
    [-1n, "ff", "00000001ff"],
    [-128n, "80", "0000000180"],
    [-129n, "ff7f", "00000002ff7f"],
    [-256n, "ff00", "00000002ff00"],
    [-257n, "feff", "00000002feff"],
  ],
} as const;
IXTestCases.I8Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`e.I8.toTopHex - In: ${value}`, () => {
    expect(e.I8(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.I8.toNestHex - In: ${value}`, () => {
    expect(e.I8(value).toNestHex()).toEqual(nestEncoding);
  });
});
IXTestCases.I8Error.forEach(([value, error]) => {
  test(`e.I8 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.I8(value)).toThrow(error);
  });
});
IXTestCases.I16Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`e.I16.toTopHex - In: ${value}`, () => {
    expect(e.I16(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.I16.toNestHex - In: ${value}`, () => {
    expect(e.I16(value).toNestHex()).toEqual(nestEncoding);
  });
});
IXTestCases.I16Error.forEach(([value, error]) => {
  test(`e.I16 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.I16(value)).toThrow(error);
  });
});
IXTestCases.I32Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`e.I32.toTopHex - In: ${value}`, () => {
    expect(e.I32(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.I32.toNestHex - In: ${value}`, () => {
    expect(e.I32(value).toNestHex()).toEqual(nestEncoding);
  });
});
IXTestCases.I32Error.forEach(([value, error]) => {
  test(`e.I32 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.I32(value)).toThrow(error);
  });
});
IXTestCases.I64Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`e.I64.toTopHex - In: ${value}`, () => {
    expect(e.I64(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.I64.toNestHex - In: ${value}`, () => {
    expect(e.I64(value).toNestHex()).toEqual(nestEncoding);
  });
});
IXTestCases.I64Error.forEach(([value, error]) => {
  test(`e.I64 - In: ${value} - Error: ${error}`, () => {
    expect(() => e.I64(value)).toThrow(error);
  });
});
IXTestCases.ISuccess.forEach(([value, topEncoding, nestEncoding]) => {
  test(`e.I.toTopHex - In: ${value}`, () => {
    expect(e.I(value).toTopHex()).toEqual(topEncoding);
  });
  test(`e.I.toNestHex - In: ${value}`, () => {
    expect(e.I(value).toNestHex()).toEqual(nestEncoding);
  });
});

test("e.Isize.toTopHex", () => {
  expect(e.Isize(1234).toTopHex()).toEqual("04d2");
});

test("e.TopI.toNestHex", () => {
  expect(e.TopI(1234).toNestHex()).toEqual("04d2");
});

test("e.Tuple.toTopHex - e.U8 + e.U8", () => {
  expect(e.Tuple(e.U8(1), e.U8(2)).toTopHex()).toEqual("0102");
});

test("e.Tuple.toNestHex - e.U8 + e.U8", () => {
  expect(e.Tuple(e.U8(1), e.U8(2)).toNestHex()).toEqual("0102");
});

test("e.Tuple.toTopHex - e.U8 + e.U16", () => {
  expect(e.Tuple(e.U8(1), e.U16(2)).toTopHex()).toEqual("010002");
});

test("e.Tuple.toNestHex - e.U8 + e.U16", () => {
  expect(e.Tuple(e.U8(1), e.U16(2)).toNestHex()).toEqual("010002");
});

test("e.List.toTopHex - e.U8 + e.U8", () => {
  expect(e.List(e.U8(1), e.U8(2)).toTopHex()).toEqual("0102");
});

test("e.List.toNestHex - e.U8 + e.U8", () => {
  expect(e.List(e.U8(1), e.U8(2)).toNestHex()).toEqual("000000020102");
});

test("e.List.toTopHex - e.U8 + e.U16", () => {
  expect(e.List(e.U8(1), e.U16(2)).toTopHex()).toEqual("010002");
});

test("e.List.toNestHex - e.U8 + e.U16", () => {
  expect(e.List(e.U8(1), e.U16(2)).toNestHex()).toEqual("00000002010002");
});

test("e.Option.toTopHex - e.U16(5)", () => {
  expect(e.Option(e.U16(5)).toTopHex()).toEqual("010005");
});

test("e.Option.toNestHex - e.U16(5)", () => {
  expect(e.Option(e.U16(5)).toNestHex()).toEqual("010005");
});

test("e.Option.toTopHex - e.U16(0)", () => {
  expect(e.Option(e.U16(0)).toTopHex()).toEqual("010000");
});

test("e.Option.toNestHex - e.U16(0)", () => {
  expect(e.Option(e.U16(0)).toNestHex()).toEqual("010000");
});

test("e.Option.toTopHex - null", () => {
  expect(e.Option(null).toTopHex()).toEqual("");
});

test("e.Option.toNestHex - null", () => {
  expect(e.Option(null).toNestHex()).toEqual("00");
});

test("e.Option.toTopHex - e.U(256)", () => {
  expect(e.Option(e.U(256)).toTopHex()).toEqual("01000000020100");
});

test("e.Option.toNestHex - e.U(256)", () => {
  expect(e.Option(e.U(256)).toNestHex()).toEqual("01000000020100");
});

test("e.vs", () => {
  expect(e.vs(["0102", "0304", new Uint8Array([5, 6]), e.U8(10)])).toEqual(vs);
});

test("e.kvs - complex kvs", () => {
  expect(walletState.kvs).toEqual({});
  expect(complexContractState.kvs).toEqual(
    e.kvs({
      esdts: [
        { id: fftId, roles: ["ESDTRoleLocalMint"], amount: 10n },
        {
          id: sft1Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          lastNonce: 10,
          variants: range(1, 11).map((i) => ({ nonce: i, amount: i })),
        },
        {
          id: sft2Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          lastNonce: 10,
          variants: range(1, 11).map((i) => ({ nonce: i, amount: i })),
        },
        {
          id: sft3Id,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          lastNonce: 1,
          nonce: 1,
          amount: 1,
        },
      ],
      mappers: [
        { key: ["value", e.Str("a")], value: e.U64(1) },
        { key: ["value", e.Str("b")], value: e.U64(2) },
        {
          key: ["vec", e.U64(1), e.U(1)],
          vec: [e.U64(1), e.U64(2), e.U64(3)],
        },
        {
          key: ["vec", e.U64(2), e.U(2)],
          vec: [e.U64(4), e.U64(5), e.U64(6)],
        },
        {
          key: ["unordered_set", e.U64(3)],
          unorderedSet: [e.U(7), e.U(8), e.U(9)],
        },
        {
          key: ["unordered_set", e.U64(4)],
          unorderedSet: [e.U(10), e.U(11), e.U(12)],
        },
        {
          key: ["set", e.U64(5)],
          set: [
            [1, e.U(13)],
            [2, e.U(14)],
            [3, e.U(15)],
          ],
        },
        {
          key: ["set", e.U64(6)],
          set: [
            [1, e.U(18)],
            [2, e.U(17)],
            [3, e.U(16)],
          ],
        },
        {
          key: ["map", e.U(7)],
          map: [
            [1, e.Str("a"), e.U64(1)],
            [2, e.Str("b"), e.U64(2)],
          ],
        },
        {
          key: ["map", e.U(8)],
          map: [
            [1, e.Str("d"), e.U64(3)],
            [2, e.Str("c"), e.U64(4)],
          ],
        },
        {
          key: ["user", e.Str("a")],
          user: [wallet, contract],
        },
        {
          key: ["user", e.Str("b")],
          user: [wallet, contract],
        },
      ],
      extraKvs: {
        "010203": "040506",
      },
    }),
  );
  expect(complexSysAccState.kvs).toEqual(
    e.kvs({
      esdts: [
        {
          id: sft1Id,
          variants: range(1, 11).map((i) => ({
            nonce: i,
            name: `SFT1 ${i}`,
            royalties: i,
            hash: e.U(i),
            attrs: i <= 5 ? e.Tuple(e.U(i), e.U(i)) : e.Str(`Attr ${i}`),
            uris: [`URI1 ${i}`, `URI2 ${i}`],
            creator: contract,
          })),
        },
        {
          id: sft2Id,
          variants: range(1, 11).map((i) => ({
            nonce: i,
            attrs: e.Tuple(e.Str(`${i}`), e.U(i)),
            creator: contract,
          })),
        },
        {
          id: sft3Id,
          nonce: 1,
          creator: contract,
        },
      ],
    }),
  );
});

test("e.kvs - omitting empty NFT properties", () => {
  expect(
    e.kvs({
      esdts: [
        {
          id: sft3Id,
          nonce: 1,
          creator: contract,
        },
      ],
    }),
  ).toEqual(
    e.kvs({
      esdts: [
        {
          id: sft3Id,
          nonce: 1,
          name: "",
          royalties: 0,
          hash: "",
          attrs: "",
          uris: [""],
          creator: contract,
        },
      ],
    }),
  );
});

test("eKvsUnfiltered - ESDTs with amount 0", () => {
  const unfilteredKvs = eKvsUnfiltered({
    esdts: [
      { id: fftId, amount: 0n },
      { id: sft1Id, nonce: 1, amount: 0n },
    ],
  });
  expect(unfilteredKvs).toMatchObject({});
  expect(unfilteredKvs).not.toMatchObject(complexContractState.kvs!);
});

test("eKvsUnfiltered - empty mappers", () => {
  const mappers: EncodableMapper[] = [
    { key: ["value", e.Str("a")], value: null },
    { key: ["vec", e.U64(1), e.U(1)], vec: null },
    { key: ["unordered_set", e.U64(3)], unorderedSet: null },
    { key: ["set", e.U64(5)], set: null },
    { key: ["map", e.U(7)], map: null },
    { key: ["user", e.Str("a")], user: null },
  ];
  for (const mapper of mappers) {
    const unfilteredKvs = eKvsUnfiltered({ mappers: [mapper] });
    expect(unfilteredKvs).toMatchObject({});
    expect(unfilteredKvs).not.toMatchObject(complexContractState.kvs!);
  }
});

test("e.account", async () => {
  expect(walletState).toEqual(
    e.account({
      address: wallet,
      nonce: 0,
      balance: 20,
      code: "",
      codeHash: "",
      codeMetadata: ["readable"],
      kvs: {},
      owner: "",
    }),
  );
  expect(complexContractState).toEqual(
    e.account({
      address: contract,
      nonce: 0,
      balance: 10,
      code: readFileHex("contracts/data/output/data.wasm"),
      codeHash:
        "8a698500ab8961cab5ce309a208f30d91cb031d4e9145312acc138ff20eaeca5",
      codeMetadata: ["readable", "upgradeable"],
      kvs: complexContractState.kvs,
      owner: wallet,
    }),
  );
  expect(complexSysAccState).toEqual(
    e.account({
      address: world.sysAcc,
      nonce: 0,
      balance: 0,
      code: "",
      codeHash: "",
      codeMetadata: "",
      kvs: complexSysAccState.kvs,
      owner: "",
    }),
  );
});

test("e.Bytes.toNestHex", () => {
  expect(e.Bytes(new Uint8Array([65, 66, 67])).toNestHex()).toEqual("414243");
});

test("e.CstStr.toNestHex", () => {
  expect(e.CstStr("hi").toNestHex()).toEqual("6869");
});

test("e.CstBuffer.toNestHex", () => {
  expect(e.CstBuffer("48656c6c").toNestHex()).toEqual("48656c6c");
});

/* Decoding */

test("d.U8.fromTop - not all bytes read", () => {
  expect(() => d.U8().fromTop("0000")).toThrow("Not all bytes have been read.");
});

test("d.Buffer.fromTop - hex", () => {
  expect(d.Buffer().fromTop("01020304")).toEqual(new Uint8Array([1, 2, 3, 4]));
});

test("d.Buffer.fromTop - u8a", () => {
  expect(d.Buffer().fromTop(new Uint8Array([1, 2, 3, 4]))).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.Buffer.fromTop - b64", () => {
  expect(d.Buffer().fromTop(B64("AQIDBA=="))).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.Buffer.toHex.fromTop", () => {
  expect(d.Buffer().toHex().fromTop("01020304")).toEqual("01020304");
});

test("d.Buffer.toB64.fromTop", () => {
  expect(d.Buffer().toB64().fromTop("01020304")).toEqual("AQIDBA==");
});

test("d.Buffer.fromNest - hex", () => {
  expect(d.Buffer().fromNest("0000000401020304")).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.Buffer.fromTop - b64", () => {
  expect(d.Buffer().fromNest(B64("AAAABAECAwQ="))).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.TopBuffer.fromTop", () => {
  expect(d.TopBuffer().fromTop("00010203")).toEqual(
    new Uint8Array([0, 1, 2, 3]),
  );
});

test("d.TopBuffer.fromNest", () => {
  expect(d.TopBuffer().fromNest("00010203")).toEqual(
    new Uint8Array([0, 1, 2, 3]),
  );
});

test("d.Str.fromTop", () => {
  expect(d.Str().fromTop("6869")).toEqual("hi");
});

test("d.TopStr.fromNest", () => {
  expect(d.TopStr().fromNest("6869")).toEqual("hi");
});

test("d.Addr.fromTop", () => {
  expect(d.Addr().fromTop(zeroHexAddress)).toEqual(zeroBechAddress);
});

test("d.Addr.toHex.fromTop", () => {
  expect(d.Addr().toHex().fromTop(zeroHexAddress)).toEqual(zeroHexAddress);
});

test("d.Addr.fromNest", () => {
  expect(d.Addr().fromNest(zeroHexAddress)).toEqual(zeroBechAddress);
});

test("d.Bool.fromTop - true", () => {
  expect(d.Bool().fromTop("01")).toEqual(true);
});

test("d.Bool.fromTop - false", () => {
  expect(d.Bool().fromTop("")).toEqual(false);
});

test("d.Bool.fromNest - true", () => {
  expect(d.Bool().fromNest("01")).toEqual(true);
});

test("d.Bool.fromNest - false", () => {
  expect(d.Bool().fromNest("00")).toEqual(false);
});

test("d.Bool.fromNest - incomplete decoding", () => {
  expect(() => d.Bool().fromNest("0100")).toThrow(
    "Not all bytes have been read.",
  );
});

UXTestCases.U8Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.U8.fromTop - In: ${value}`, () => {
    expect(d.U8().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.U8.fromNest - In: ${value}`, () => {
    expect(d.U8().fromNest(nestEncoding)).toEqual(value);
  });
});
UXTestCases.U16Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.U16.fromTop - In: ${value}`, () => {
    expect(d.U16().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.U16.fromNest - In: ${value}`, () => {
    expect(d.U16().fromNest(nestEncoding)).toEqual(value);
  });
});
UXTestCases.U32Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.U32.fromTop - In: ${value}`, () => {
    expect(d.U32().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.U32.fromNest - In: ${value}`, () => {
    expect(d.U32().fromNest(nestEncoding)).toEqual(value);
  });
});
UXTestCases.U64Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.U64.fromTop - In: ${value}`, () => {
    expect(d.U64().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.U64.fromNest - In: ${value}`, () => {
    expect(d.U64().fromNest(nestEncoding)).toEqual(value);
  });
});
UXTestCases.USuccess.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.U.fromTop - In: ${value}`, () => {
    expect(d.U().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.U.fromNest - In: ${value}`, () => {
    expect(d.U().fromNest(nestEncoding)).toEqual(value);
  });
});

test("d.Usize.fromTop", () => {
  expect(d.Usize().fromTop("01")).toEqual(1n);
});

test("d.U.toNum.fromTop - in-range number", () => {
  expect(d.U().toNum().fromTop("01")).toEqual(1);
});

test("d.U.toNum.fromTop - out-of-range number", () => {
  expect(() => d.U().toNum().fromTop("0100000000000000")).toThrow(
    "Bigint above threshold to be safely casted to Number.",
  );
});

test("d.U.toStr.fromTop", () => {
  expect(d.U().toStr().fromTop("01")).toEqual("1");
});

test("d.TopU.fromNest", () => {
  expect(d.TopU().fromNest("0100")).toEqual(256n);
});

IXTestCases.I8Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.I8.fromTop - In: ${value}`, () => {
    expect(d.I8().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.I8.fromNest - In: ${value}`, () => {
    expect(d.I8().fromNest(nestEncoding)).toEqual(value);
  });
});
IXTestCases.I16Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.I16.fromTop - In: ${value}`, () => {
    expect(d.I16().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.I16.fromNest - In: ${value}`, () => {
    expect(d.I16().fromNest(nestEncoding)).toEqual(value);
  });
});
IXTestCases.I32Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.I32.fromTop - In: ${value}`, () => {
    expect(d.I32().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.I32.fromNest - In: ${value}`, () => {
    expect(d.I32().fromNest(nestEncoding)).toEqual(value);
  });
});
IXTestCases.I64Success.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.I64.fromTop - In: ${value}`, () => {
    expect(d.I64().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.I64.fromNest - In: ${value}`, () => {
    expect(d.I64().fromNest(nestEncoding)).toEqual(value);
  });
});
IXTestCases.ISuccess.forEach(([value, topEncoding, nestEncoding]) => {
  test(`d.I.fromTop - In: ${value}`, () => {
    expect(d.I().fromTop(topEncoding)).toEqual(value);
  });
  test(`d.I.fromNest - In: ${value}`, () => {
    expect(d.I().fromNest(nestEncoding)).toEqual(value);
  });
});

test("d.Isize.fromTop", () => {
  expect(d.Isize().fromTop("01")).toEqual(1n);
});

test("d.I.toNum.fromTop", () => {
  expect(d.I().toNum().fromTop("01")).toEqual(1);
});

test("d.I.toNum.fromTop - out-of-range number", () => {
  expect(() => d.I().toNum().fromTop("8000000000000000")).toThrow(
    "Bigint below threshold to be safely casted to Number.",
  );
});

test("d.I.toStr.fromTop", () => {
  expect(d.I().toStr().fromTop("01")).toEqual("1");
});

test("d.TopI.fromNest", () => {
  expect(d.TopI().fromNest("ff7f")).toEqual(-129n);
});

test("d.Tuple.fromTop - empty map", () => {
  expect(d.Tuple({}).fromTop("")).toEqual({});
});

test("d.Tuple.fromTop - non-empty map", () => {
  expect(
    d.Tuple({ a: d.Str(), b: d.U8() }).fromTop("0000000568656c6c6f02"),
  ).toEqual({ a: "hello", b: 2n });
});

test("d.Tuple.fromTop - empty list", () => {
  expect(d.Tuple().fromTop("")).toEqual([]);
});

test("d.Tuple.fromTop - list of 1", () => {
  expect(d.Tuple(d.Str()).fromTop("0000000568656c6c6f")).toEqual(["hello"]);
});

test("d.Tuple.fromTop - list of 2", () => {
  expect(d.Tuple(d.Str(), d.U8()).fromTop("0000000568656c6c6f02")).toEqual([
    "hello",
    2n,
  ]);
});

test("d.Tuple.fromNest - empty map", () => {
  expect(d.Tuple({}).fromNest("")).toEqual({});
});

test("d.Tuple.fromNest - non-empty map", () => {
  expect(
    d.Tuple({ a: d.Str(), b: d.U8() }).fromNest("0000000568656c6c6f02"),
  ).toEqual({ a: "hello", b: 2n });
});

test("d.Tuple.fromNest - empty list", () => {
  expect(d.Tuple().fromNest("")).toEqual([]);
});

test("d.Tuple.fromNest - non-empty list", () => {
  expect(d.Tuple(d.Str(), d.U8()).fromNest("0000000568656c6c6f02")).toEqual([
    "hello",
    2n,
  ]);
});

test("d.List.fromTop - empty array", () => {
  expect(d.List(d.U8()).fromTop("")).toEqual([]);
});

test("d.List.fromTop - non-empty array", () => {
  expect(d.List(d.U8()).fromTop("0102")).toEqual([1n, 2n]);
});

test("d.List.fromNest - empty array", () => {
  expect(d.List(d.U8()).fromNest("00000000")).toEqual([]);
});

test("d.List.fromNest - non-empty array", () => {
  expect(d.List(d.U8()).fromNest("000000020102")).toEqual([1n, 2n]);
});

test("d.Option.fromTop - null of BigUint", () => {
  expect(d.Option(d.U()).fromTop("")).toBeNull();
});

test("d.Option.fromTop - BigUint", () => {
  expect(d.Option(d.U()).fromTop("010000000101")).toEqual(1n);
});

test("d.Option.fromTop - null of u8", () => {
  expect(d.Option(d.U8()).fromTop("")).toBeNull();
});

test("d.Option.fromTop - u8", () => {
  expect(d.Option(d.U8()).fromTop("0101")).toEqual(1n);
});

test("d.Option.fromTop - first byte >= 2", () => {
  expect(() => d.Option(d.U8()).fromTop("0200")).toThrow(
    "Invalid Option top-encoding.",
  );
});

test("d.Option.fromNest - null of BigUint", () => {
  expect(d.Option(d.U()).fromNest("00")).toBeNull();
});

test("d.Option.fromNest - BigUint", () => {
  expect(d.Option(d.U()).fromNest("010000000101")).toEqual(1n);
});

test("d.Option.fromNest - null of u8", () => {
  expect(d.Option(d.U()).fromNest("00")).toBeNull();
});

test("d.Option.fromNest - u8", () => {
  expect(d.Option(d.U8()).fromNest("0101")).toEqual(1n);
});

test("d.Option.fromNest - first byte >= 2", () => {
  expect(() => d.Option(d.U8()).fromNest("0200")).toThrow(
    "Invalid Option nest-encoding.",
  );
});

test("d.vs - number of values and decoders matching", () => {
  expect(d.vs([d.U(), d.U(), d.U(), d.U()]).from(vs)).toEqual([
    258n,
    772n,
    1286n,
    10n,
  ]);
});

test("d.vs - number of values and decoders not matching", () => {
  expect(() => d.vs([]).from(vs)).toThrow(
    "Not the same number of values and decoders.",
  );
});

test("d.kvs", async () => {
  expect(
    d
      .kvs({
        mappers: [
          { key: ["value", d.Str()], value: d.U64() },
          { key: ["vec", d.U64(), d.U()], vec: d.U64() },
          { key: ["unordered_set", d.U64()], unorderedSet: d.U() },
          { key: ["set", d.U64()], set: d.U() },
          { key: ["map", d.U()], map: [d.Str(), d.U64()] },
          { key: ["user", d.Str()], user: true },
        ],
      })
      .from(complexContractState.kvs!),
  ).toEqual({
    esdts: [
      { id: fftId, roles: ["ESDTRoleLocalMint"], amount: 10n },
      {
        id: sft1Id,
        roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        lastNonce: 10,
        variants: range(1, 11).map((i) => ({
          nonce: i,
          amount: BigInt(i),
        })),
      },
      {
        id: sft2Id,
        roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        lastNonce: 10,
        variants: range(1, 11).map((i) => ({
          nonce: i,
          amount: BigInt(i),
        })),
      },
      {
        id: sft3Id,
        roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        lastNonce: 1,
        variants: [{ nonce: 1, amount: 1n }],
      },
    ],
    mappers: [
      { key: ["value", "a"], value: 1n },
      { key: ["value", "b"], value: 2n },
      { key: ["vec", 1n, 1n], vec: [1n, 2n, 3n] },
      { key: ["vec", 2n, 2n], vec: [4n, 5n, 6n] },
      { key: ["unordered_set", 3n], unorderedSet: [7n, 8n, 9n] },
      { key: ["unordered_set", 4n], unorderedSet: [10n, 11n, 12n] },
      {
        key: ["set", 5n],
        set: [
          [1, 13n],
          [2, 14n],
          [3, 15n],
        ],
      },
      {
        key: ["set", 6n],
        set: [
          [1, 18n],
          [2, 17n],
          [3, 16n],
        ],
      },
      {
        key: ["map", 7n],
        map: [
          [1, "a", 1n],
          [2, "b", 2n],
        ],
      },
      {
        key: ["map", 8n],
        map: [
          [1, "d", 3n],
          [2, "c", 4n],
        ],
      },
      {
        key: ["user", "a"],
        user: [wallet, contract],
      },
      {
        key: ["user", "b"],
        user: [wallet, contract],
      },
    ],
    extraKvs: {
      "010203": "040506",
    },
  });
  expect(
    d
      .kvs({
        esdts: [
          {
            id: sft1Id,
            attrs: (nonce) => (nonce <= 5 ? d.Tuple(d.U(), d.U()) : d.Str()),
          },
          {
            id: sft2Id,
            attrs: d.Tuple(d.Str(), d.U()),
          },
        ],
      })
      .from(complexSysAccState.kvs!),
  ).toEqual({
    esdts: [
      {
        id: sft1Id,
        variants: range(1, 11).map((i) => ({
          nonce: i,
          name: `SFT1 ${i}`,
          royalties: i,
          hash: e.U(i).toTopHex(),
          attrs: i <= 5 ? [BigInt(i), BigInt(i)] : `Attr ${i}`,
          uris: [`URI1 ${i}`, `URI2 ${i}`],
          creator: contract,
        })),
      },
      {
        id: sft2Id,
        variants: range(1, 11).map((i) => ({
          nonce: i,
          attrs: [`${i}`, BigInt(i)],
          creator: contract,
        })),
      },
      { id: sft3Id, variants: [{ nonce: 1, creator: contract }] },
    ],
  });
});

test("d.account", () => {
  expect(d.account().from(walletState)).toEqual({
    address: wallet,
    nonce: 0,
    balance: 20n,
    code: "",
    codeHash: "",
    codeMetadata: ["readable"],
    kvs: {},
    owner: "",
  });
  expect(d.account().from(complexContractState)).toEqual({
    address: contract,
    nonce: 0,
    balance: 10n,
    code: readFileHex("contracts/data/output/data.wasm"),
    codeHash:
      "8a698500ab8961cab5ce309a208f30d91cb031d4e9145312acc138ff20eaeca5",
    codeMetadata: ["upgradeable", "readable"],
    kvs: expect.anything(),
    owner: wallet,
  });
  expect(d.account().from(complexSysAccState)).toEqual({
    address: world.sysAcc,
    nonce: 0,
    balance: 0n,
    code: "",
    codeHash: "",
    codeMetadata: [],
    kvs: expect.anything(),
    owner: "",
  });
});

test("d.Bytes", () => {
  expect(d.Bytes().fromTop("414243")).toEqual(new Uint8Array([65, 66, 67]));
});

test("d.CstBuffer.fromNest", () => {
  expect(d.CstBuffer().fromNest("00010203")).toEqual(
    new Uint8Array([0, 1, 2, 3]),
  );
});

test("d.Buffer.topDecode", () => {
  expect(d.Buffer().topDecode("01")).toEqual(new Uint8Array([1]));
});

test("d.Buffer.nestDecode", () => {
  expect(d.Buffer().nestDecode("0000000101")).toEqual(new Uint8Array([1]));
});

test("d.Buffer.topDecode", () => {
  expect(d.Buffer().toHex().topDecode("01")).toEqual("01");
});

test("d.Buffer.nestDecode", () => {
  expect(d.Buffer().toHex().nestDecode("0000000101")).toEqual("01");
});
