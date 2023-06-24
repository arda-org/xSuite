import { describe, expect, test } from "@jest/globals";
import { d, e, Encodable, AddressEncodable, b64ToHex } from "./index";

describe("Encoding Decoding Suite", () => {
  test("Encodable", () => {
    const encodable = e.Bytes([65, 66, 67]);
    expect(encodable).toBeInstanceOf(Encodable);
  });

  test("AddressEncodable", () => {
    const encodable = e.Addr(new Uint8Array(32));
    expect(encodable).toBeInstanceOf(AddressEncodable);
  });

  test("e.Bytes", () => {
    const encoded = e.Bytes([65, 66, 67]).toTopHex();
    expect(encoded).toEqual("414243");
  });

  test("e.Buffer", () => {
    const encoded = e.Buffer([1, 2, 3]).toTopHex();
    expect(encoded).toEqual("010203");
  });

  test("e.Str", () => {
    const encoded = e.Str("hi").toTopHex();
    expect(encoded).toEqual("6869");
  });

  test("e.Addr", () => {
    const encoded = e.Addr(new Uint8Array(32)).toTopHex();
    expect(encoded).toEqual(
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  test("e.Bool", () => {
    const encoded = e.Bool(true).toTopHex();
    expect(encoded).toEqual("01");
  });

  test("e.U8", () => {
    const encoded = e.U8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.U16", () => {
    const encoded = e.U16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U32", () => {
    const encoded = e.U32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U64", () => {
    const encoded = e.U64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U", () => {
    const encoded = e.U(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I8", () => {
    const encoded = e.I8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.I16", () => {
    const encoded = e.I16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I32", () => {
    const encoded = e.I32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I64", () => {
    const encoded = e.I64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I", () => {
    const encoded = e.I(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.Tuple", () => {
    const encoded = e.Tuple(e.U32(1234), e.I32(-2)).toTopHex();
    expect(encoded).toEqual("000004d2fffffffe");
  });

  test("e.List", () => {
    const encoded = e.List(e.U32(1234), e.U32(4321)).toTopHex();
    expect(encoded).toEqual("000004d2000010e1");
  });

  test("e.Option", () => {
    const encoded = e.Option(e.U32(1234)).toTopHex();
    expect(encoded).toEqual("01000004d2");
  });

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
      "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu"
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

  test("b64ToHex", () => {
    const actualHex = b64ToHex("aGVsbG8=");
    const expectedHex = "68656c6c6f";
    expect(actualHex).toEqual(expectedHex);
  });
});
