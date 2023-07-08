import { describe, expect, test } from "@jest/globals";
import { enc } from "./encoding";

describe("Encoding Decoding Suite", () => {
  test("e.Bytes", () => {
    const encoded = enc.Bytes([65, 66, 67]).toTopHex();
    expect(encoded).toEqual("414243");
  });

  test("e.Buffer", () => {
    const encoded = enc.Buffer([1, 2, 3]).toTopHex();
    expect(encoded).toEqual("010203");
  });

  test("e.Str", () => {
    const encoded = enc.Str("hi").toTopHex();
    expect(encoded).toEqual("6869");
  });

  test("e.Addr", () => {
    const encoded = enc.Addr(new Uint8Array(32)).toTopHex();
    expect(encoded).toEqual(
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  test("e.Bool", () => {
    const encoded = enc.Bool(true).toTopHex();
    expect(encoded).toEqual("01");
  });

  test("e.U8", () => {
    const encoded = enc.U8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.U16", () => {
    const encoded = enc.U16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U32", () => {
    const encoded = enc.U32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U64", () => {
    const encoded = enc.U64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U", () => {
    const encoded = enc.U(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I8", () => {
    const encoded = enc.I8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.I16", () => {
    const encoded = enc.I16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I32", () => {
    const encoded = enc.I32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I64", () => {
    const encoded = enc.I64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I", () => {
    const encoded = enc.I(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.Tuple", () => {
    const encoded = enc.Tuple(enc.U32(1234), enc.I32(-2)).toTopHex();
    expect(encoded).toEqual("000004d2fffffffe");
  });

  test("e.List", () => {
    const encoded = enc.List(enc.U32(1234), enc.U32(4321)).toTopHex();
    expect(encoded).toEqual("000004d2000010e1");
  });

  test("e.Option", () => {
    const encoded = enc.Option(enc.U32(1234)).toTopHex();
    expect(encoded).toEqual("01000004d2");
  });
});
