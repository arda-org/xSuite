import { describe, test, expect } from "@jest/globals";
import { TupleDecoder } from "./TupleDecoder";
import { U32Decoder } from "./UintDecoder";

describe("TupleDecoder", () => {
  test("topDecode empty map", () => {
    const result = new TupleDecoder({}).topDecode("");
    expect(result).toEqual({});
  });

  test("topDecode non-empty map", () => {
    const result = new TupleDecoder({
      a: new U32Decoder(),
      b: new U32Decoder(),
    }).topDecode("0000000100000002");
    expect(result).toEqual({ a: 1n, b: 2n });
  });

  test("nestDecode empty map", () => {
    const result = new TupleDecoder({}).nestDecode("");
    expect(result).toEqual({});
  });

  test("topDecode empty map", () => {
    const result = new TupleDecoder({
      a: new U32Decoder(),
      b: new U32Decoder(),
    }).nestDecode("0000000100000002");
    expect(result).toEqual({ a: 1n, b: 2n });
  });
});
