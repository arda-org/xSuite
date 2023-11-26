import { expect, test } from "@jest/globals";
import { d } from "./decoding";

test("d.Buffer.fromTop - hex", () => {
  expect(d.Buffer().fromTop("01020304")).toEqual(new Uint8Array([1, 2, 3, 4]));
});

test("d.Buffer.fromTop - number[]", () => {
  expect(d.Buffer().fromTop("01020304")).toEqual(new Uint8Array([1, 2, 3, 4]));
});

test("d.Buffer.fromTop - bytes", () => {
  expect(d.Buffer().fromTop([1, 2, 3, 4])).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.Buffer.fromTop - bytes", () => {
  expect(d.Buffer().fromTop(new Uint8Array([1, 2, 3, 4]))).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.Buffer.fromTop - b64", () => {
  expect(d.Buffer().fromTop("AQIDBA==", "b64")).toEqual(
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
  expect(d.Buffer().fromNest("AAAABAECAwQ=", "b64")).toEqual(
    new Uint8Array([1, 2, 3, 4]),
  );
});

test("d.CstBuffer.fromTop - no byteLength set", () => {
  expect(d.CstBuffer().fromTop("00010203")).toEqual(
    new Uint8Array([0, 1, 2, 3]),
  );
});

test("d.CstBuffer.fromTop - byteLength set", () => {
  expect(d.CstBuffer(2).fromTop("00010203")).toEqual(new Uint8Array([0, 1]));
});

test("d.CstBuffer.fromNest - no byteLength set", () => {
  expect(d.CstBuffer().fromNest("00010203")).toEqual(
    new Uint8Array([0, 1, 2, 3]),
  );
});

test("d.CstBuffer.fromNest - byteLength set", () => {
  expect(d.CstBuffer(2).fromNest("00010203")).toEqual(new Uint8Array([0, 1]));
});

test("d.Str", () => {
  expect(d.Str().fromTop("6869")).toEqual("hi");
});

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";

test("d.Addr.fromTop", () => {
  expect(d.Addr().fromTop(zeroHexAddress)).toEqual(zeroBechAddress);
});

test("d.Addr.toHex.fromTop", () => {
  expect(d.Addr().toHex().fromTop(zeroHexAddress)).toEqual(zeroHexAddress);
});

test("d.Addr.fromNest", () => {
  expect(d.Addr().fromNest(zeroHexAddress)).toEqual(zeroBechAddress);
});

test("d.Bool", () => {
  expect(d.Bool().fromNest("01")).toEqual(true);
});

const UXTestCases = {
  U8Success: [
    [0n, "", "00"],
    [1n, "01", "01"],
    [2n ** 7n - 1n, "7f", "7f"],
    [2n ** 7n, "80", "80"],
    [2n ** 8n - 1n, "ff", "ff"],
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

const IXTestCases = {
  I8Success: [
    [0n, "", "00"],
    [2n ** 7n - 1n, "7f", "7f"],
    [-1n, "ff", "ff"],
    [-(2n ** 7n), "80", "80"],
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
  I32Success: [
    [0n, "", "00000000"],
    [2n ** 31n - 1n, "7fffffff", "7fffffff"],
    [-1n, "ff", "ffffffff"],
    [-(2n ** 31n), "80000000", "80000000"],
  ],
  I64Success: [
    [0n, "", "0000000000000000"],
    [2n ** 63n - 1n, "7fffffffffffffff", "7fffffffffffffff"],
    [-1n, "ff", "ffffffffffffffff"],
    [-(2n ** 63n), "8000000000000000", "8000000000000000"],
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

test("d.Tuple.fromTop - empty map", () => {
  expect(d.Tuple({}).fromTop("")).toEqual({});
});

test("d.Tuple.fromTop - non-empty map", () => {
  expect(d.Tuple({ a: d.U8(), b: d.U8() }).fromTop("0102")).toEqual({
    a: 1n,
    b: 2n,
  });
});

test("d.Tuple.fromNest - empty map", () => {
  expect(d.Tuple({}).fromNest("")).toEqual({});
});

test("d.Tuple.fromNest - non-empty map", () => {
  expect(d.Tuple({ a: d.U8(), b: d.U8() }).fromNest("0102")).toEqual({
    a: 1n,
    b: 2n,
  });
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

test("d.Bytes", () => {
  expect(d.Bytes(3).fromTop("414243")).toEqual(new Uint8Array([65, 66, 67]));
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
