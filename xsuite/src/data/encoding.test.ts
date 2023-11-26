import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { assertKvs } from "../assert/account";
import { SWorld, SContract, SWallet } from "../world";
import { e } from "./encoding";

test("e.Buffer - bytes with base64", () => {
  expect(() => e.Buffer([1] as any, "b64")).toThrow(
    "bytes is not a base64 string.",
  );
});

test("e.Buffer - invalid hex length", () => {
  expect(() => e.Buffer("48656c6c6")).toThrow("Odd hex string length.");
});

test("e.Buffer - invalid hex string", () => {
  expect(() => e.Buffer("48656c6c6g")).toThrow("Invalid hex string.");
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
  expect(e.Buffer("ASM=", "b64").toTopHex()).toEqual("0123");
});

test("e.Buffer.toTopHex - empty number[]", () => {
  expect(e.Buffer([]).toTopHex()).toEqual("");
});

test("e.Buffer.toTopHex - non-empty number[]", () => {
  expect(e.Buffer([72, 101, 108, 108]).toTopHex()).toEqual("48656c6c");
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

test("e.CstBuffer.toTopHex - empty hex", () => {
  expect(e.CstBuffer("").toTopHex()).toEqual("");
});

test("e.CstBuffer.toTopHex - non-empty hex", () => {
  expect(e.CstBuffer("48656c6c").toTopHex()).toEqual("48656c6c");
});

test("e.CstBuffer.toTopHex - non-empty b64", () => {
  expect(e.CstBuffer("ASM=", "b64").toTopHex()).toEqual("0123");
});

test("e.CstBuffer.toTopHex - empty number[]", () => {
  expect(e.CstBuffer([]).toTopHex()).toEqual("");
});

test("e.CstBuffer.toTopHex - non-empty number[]", () => {
  expect(e.CstBuffer([72, 101, 108, 108]).toTopHex()).toEqual("48656c6c");
});

test("e.CstBuffer.toTopHex - empty Uint8Array", () => {
  expect(e.CstBuffer(new Uint8Array([])).toTopHex()).toEqual("");
});

test("e.CstBuffer.toTopHex - non-empty Uint8Array", () => {
  expect(e.CstBuffer(new Uint8Array([72, 101, 108, 108])).toTopHex()).toEqual(
    "48656c6c",
  );
});

test("e.CstBuffer.toNestHex - empty hex", () => {
  expect(e.CstBuffer("").toNestHex()).toEqual("");
});

test("e.CstBuffer.toNestHex - non-empty hex", () => {
  expect(e.CstBuffer("48656c6c").toNestHex()).toEqual("48656c6c");
});

test("e.Str", () => {
  expect(e.Str("hi").toTopHex()).toEqual("6869");
});

test("e.CstStr", () => {
  expect(e.CstStr("hi").toNestHex()).toEqual("6869");
});

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";
const zeroBytesAddress = new Uint8Array(32);

test("e.Addr.toTopHex - bech address", () => {
  expect(e.Addr(zeroBechAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toTopHex - hex address", () => {
  expect(e.Addr(zeroHexAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toTopHex - bytes address", () => {
  expect(e.Addr(zeroBytesAddress).toTopHex()).toEqual(zeroHexAddress);
});

test("e.Addr.toNestHex - bytes address", () => {
  expect(e.Addr(zeroBytesAddress).toNestHex()).toEqual(zeroHexAddress);
});

test("e.Addr - Invalid address HRP", () => {
  const address =
    "btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5mhdvz";
  expect(() => e.Addr(address)).toThrow("Invalid address HRP.");
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

test("e.Usize", () => {
  expect(e.Usize(1234).toTopHex()).toEqual("04d2");
});

test("e.CstU", () => {
  expect(e.CstU(1234).toNestHex()).toEqual("04d2");
});

const IXTestCases = {
  I8Success: [
    [0, "", "00"],
    [2n ** 7n - 1n, "7f", "7f"],
    [-1, "ff", "ff"],
    [-(2n ** 7n), "80", "80"],
  ],
  I8Error: [
    [2n ** 7n, "Number above maximal value allowed."],
    [-(2n ** 7n) - 1n, "Number below minimal value allowed."],
  ],
  I16Success: [
    [0, "", "0000"],
    [2n ** 7n - 1n, "7f", "007f"],
    [2n ** 7n, "0080", "0080"],
    [2n ** 15n - 1n, "7fff", "7fff"],
    [-1, "ff", "ffff"],
    [-(2n ** 7n), "80", "ff80"],
    [-(2n ** 7n) - 1n, "ff7f", "ff7f"],
    [-(2n ** 15n), "8000", "8000"],
  ],
  I16Error: [
    [2n ** 15n, "Number above maximal value allowed."],
    [-(2n ** 15n) - 1n, "Number below minimal value allowed."],
  ],
  I32Success: [
    [0, "", "00000000"],
    [2n ** 31n - 1n, "7fffffff", "7fffffff"],
    [-1, "ff", "ffffffff"],
    [-(2n ** 31n), "80000000", "80000000"],
  ],
  I32Error: [
    [2n ** 31n, "Number above maximal value allowed."],
    [-(2n ** 31n) - 1n, "Number below minimal value allowed."],
  ],
  I64Success: [
    [0, "", "0000000000000000"],
    [2n ** 63n - 1n, "7fffffffffffffff", "7fffffffffffffff"],
    [-1, "ff", "ffffffffffffffff"],
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

test("e.Isize", () => {
  expect(e.Isize(1234).toTopHex()).toEqual("04d2");
});

test("e.CstI", () => {
  expect(e.CstI(1234).toNestHex()).toEqual("04d2");
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

describe("e.kvs", () => {
  let world: SWorld;
  let wallet: SWallet;
  let contract: SContract;

  const fftId = "FFT-abcdef";
  const sftId = "SFT-abcdef";

  beforeEach(async () => {
    world = await SWorld.start();
    wallet = await world.createWallet();
  });

  afterEach(async () => {
    await world.terminate();
  });

  describe("e.kvs.Mapper", () => {
    beforeEach(async () => {
      ({ contract } = await wallet.deployContract({
        code: "file:contracts/mapper/output/mapper.wasm",
        codeMetadata: [],
        gasLimit: 10_000_000,
      }));
    });

    test("e.kvs.Mapper.Value", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "single_add",
        funcArgs: [e.Str("a"), e.U64(1)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("single", e.Str("a")).Value(e.U64(1)),
        await contract.getAccountKvs(),
      );
      await expect(async () =>
        assertKvs(
          e.kvs.Mapper("single", e.Str("a")).Value(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "single_remove",
        funcArgs: [e.Str("a")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("single", e.Str("a")).Value(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.UnorderedSet", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "unordered_set_add",
        funcArgs: [e.U64(1), e.U(10), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs
          .Mapper("unordered_set", e.U64(1))
          .UnorderedSet([e.U(10), e.U(20)]),
        await contract.getAccountKvs(),
      );
      await expect(async () =>
        assertKvs(
          e.kvs.Mapper("unordered_set", e.U64(1)).UnorderedSet(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "unordered_set_remove",
        funcArgs: [e.U64(1), e.U(10), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("unordered_set", e.U64(1)).UnorderedSet(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Set", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "set_add",
        funcArgs: [e.U64(1), e.U(10), e.U(20), e.U(30), e.U(40)],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "set_remove",
        funcArgs: [e.U64(1), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("set", e.U64(1)).Set([
          [3, e.U(30)],
          [1, e.U(10)],
          [4, e.U(40)],
        ]),
        await contract.getAccountKvs(),
      );
      await expect(async () =>
        assertKvs(
          e.kvs.Mapper("set", e.U64(1)).Set(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "set_remove",
        funcArgs: [e.U64(1), e.U(10), e.U(30), e.U(40)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("set", e.U64(1)).Set(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Set - Negative id", () => {
      expect(() => e.kvs.Mapper("set").Set([[0, e.U64(0)]])).toThrow(
        "Negative id not allowed.",
      );
    });

    test("e.kvs.Mapper.Map", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "map_add",
        funcArgs: [
          e.U(1),
          e.Tuple(e.Str("a"), e.U64(10)),
          e.Tuple(e.Str("b"), e.U64(20)),
          e.Tuple(e.Str("c"), e.U64(30)),
        ],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "map_remove",
        funcArgs: [e.U(1), e.Str("b")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("map", e.U(1)).Map([
          [3, e.Str("c"), e.U64(30)],
          [1, e.Str("a"), e.U64(10)],
        ]),
        await contract.getAccountKvs(),
      );
      await expect(async () =>
        assertKvs(
          e.kvs.Mapper("map", e.U(1)).Map(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "map_remove",
        funcArgs: [e.U(1), e.Str("a"), e.Str("c")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("map", e.U(1)).Map(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Vec", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "vec_add",
        funcArgs: [e.U64(1), e.U(2), e.U64(1), e.U64(2)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec([e.U64(1), e.U64(2)]),
        await contract.getAccountKvs(),
      );
      await expect(async () =>
        assertKvs(
          e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "vec_remove",
        funcArgs: [e.U64(1), e.U(2), e.U32(2), e.U32(1)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec(null),
        await contract.getAccountKvs(),
      );
    });
  });

  describe("e.kvs.Esdts", () => {
    beforeEach(async () => {
      contract = await world.createContract({
        code: "file:contracts/esdt/output/esdt.wasm",
        kvs: [
          e.kvs.Esdts([
            {
              id: fftId,
              roles: ["ESDTRoleLocalMint"],
            },
            {
              id: sftId,
              roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
            },
          ]),
        ],
      });
    });

    test("e.kvs.Esdts", async () => {
      const fftAmount = 10;
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_local_mint",
        funcArgs: [e.Str(fftId), e.U64(0), e.U(fftAmount)],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(fftId), e.U64(0), e.U(fftAmount)],
        gasLimit: 10_000_000,
      });
      const sftAmount1 = 20;
      const sftName1 = "Test 1";
      const sftRoyalties1 = 20;
      const sftHash1 = "0001";
      const sftUris1 = ["https://google.com"];
      const sftAttrs1 = e.Tuple(e.U8(0), e.U8(0), e.U8(0));
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_nft_create",
        funcArgs: [
          e.Str(sftId),
          e.U(sftAmount1),
          e.Str(sftName1),
          e.U(sftRoyalties1),
          e.Buffer(sftHash1),
          sftAttrs1,
          e.List(...sftUris1.map((u) => e.Str(u))),
        ],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(sftId), e.U64(1), e.U(sftAmount1 / 2)],
        gasLimit: 10_000_000,
      });
      const sftAmount2 = 50;
      const sftAttrs2 = e.Tuple(e.U8(255), e.U8(255), e.U8(255));
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_nft_create_compact",
        funcArgs: [e.Str(sftId), e.U(sftAmount2), sftAttrs2],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(sftId), e.U64(2), e.U(sftAmount2 / 2)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Esdts([
          { id: fftId, amount: fftAmount },
          { id: sftId, nonce: 1, amount: sftAmount1 / 2 },
          { id: sftId, nonce: 2, amount: sftAmount2 / 2 },
        ]),
        await wallet.getAccountKvs(),
      );
      assertKvs(
        e.kvs.Esdts([
          {
            id: fftId,
            roles: ["ESDTRoleLocalMint"],
          },
          {
            id: sftId,
            roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
            lastNonce: 2,
          },
          { id: sftId, nonce: 1, amount: sftAmount1 / 2 },
          { id: sftId, nonce: 2, amount: sftAmount2 / 2 },
        ]),
        await contract.getAccountKvs(),
      );
      assertKvs(
        e.kvs.Esdts([
          {
            id: sftId,
            nonce: 1,
            name: sftName1,
            creator: contract,
            royalties: sftRoyalties1,
            hash: sftHash1,
            uris: sftUris1,
            attrs: sftAttrs1,
          },
          {
            id: sftId,
            nonce: 2,
            creator: contract,
            uris: [""],
            attrs: sftAttrs2,
          },
        ]),
        await world.sysAcc.getAccountKvs(),
      );
    });

    test("e.kvs.Esdts - amount 0", () => {
      assertKvs(
        e.kvs.Esdts([
          { id: fftId, amount: 0n },
          { id: sftId, nonce: 1, amount: 0n },
        ]),
        {},
      );
    });
  });
});

test("e.Bytes", () => {
  expect(e.Bytes([65, 66, 67]).toTopHex()).toEqual("414243");
});
