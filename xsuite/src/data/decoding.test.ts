import { describe, expect, test } from "@jest/globals";
import { d } from "./decoding";

describe("Encoding Decoding Suite", () => {
  test("d.Bytes", () => {
    const decoded = d.Bytes(3).topDecode("414243");
    expect(decoded).toEqual(new Uint8Array([65, 66, 67]));
  });

  test("d.Buffer", () => {
    const decoded = d.Buffer().topDecode("010203");
    expect(decoded).toEqual(new Uint8Array([1, 2, 3]));
  });

  test("d.Str", () => {
    const decoded = d.Str().topDecode("6869");
    expect(decoded).toEqual("hi");
  });

  test("d.Addr", () => {
    const decoded = d.Addr().topDecode(new Uint8Array(32));
    expect(decoded).toEqual(
      "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu",
    );
  });

  test("d.Bool", () => {
    const decoded = d.Bool().nestDecode("01");
    expect(decoded).toEqual(true);
  });

  test("d.U8", () => {
    const decoded = d.U8().topDecode("0c");
    expect(decoded).toEqual(12n);
  });

  test("d.U16", () => {
    const decoded = d.U16().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.U32", () => {
    const decoded = d.U32().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.U64", () => {
    const decoded = d.U64().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.U", () => {
    const decoded = d.U().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.I8", () => {
    const decoded = d.I8().topDecode("0c");
    expect(decoded).toEqual(12n);
  });

  test("d.I16", () => {
    const decoded = d.I16().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.I32", () => {
    const decoded = d.I32().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.I64", () => {
    const decoded = d.I64().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.I", () => {
    const decoded = d.I().topDecode("04d2");
    expect(decoded).toEqual(1234n);
  });

  test("d.Tuple", () => {
    const decoded = d
      .Tuple({ a: d.U32(), b: d.I32() })
      .topDecode("000004d2fffffffe");
    expect(decoded).toEqual({ a: 1234n, b: -2n });
  });

  test("d.List", () => {
    const decoded = d.List(d.U32()).topDecode("000004d2000010e1");
    expect(decoded).toEqual([1234n, 4321n]);
  });

  test("d.Option", () => {
    const decoded = d.Option(d.U32()).topDecode("01000004d2");
    expect(decoded).toEqual(1234n);
  });
});
