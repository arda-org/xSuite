import { describe, expect, test } from "@jest/globals";
import { e } from "./encoding";

describe("Encoding Decoding Suite", () => {
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
});
