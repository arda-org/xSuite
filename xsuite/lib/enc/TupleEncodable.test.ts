import { describe, expect, test } from "@jest/globals";
import { TupleEncodable } from "./TupleEncodable";
import { U16Encodable, U32Encodable, U8Encodable } from "./UintEncodable";

describe("TupleEncodable", () => {
  test("u8 array", () => {
    const tuple = new TupleEncodable([new U8Encodable(1), new U8Encodable(2)]);
    expect(tuple.toTopHex()).toEqual("0102");
    expect(tuple.toNestHex()).toEqual("0102");
  });

  test("u16 array", () => {
    const tuple = new TupleEncodable([
      new U16Encodable(1),
      new U16Encodable(2),
    ]);
    expect(tuple.toTopHex()).toEqual("00010002");
    expect(tuple.toNestHex()).toEqual("00010002");
  });

  test("mixed tuple (u8, u16, u32)", () => {
    const input = [
      new U8Encodable(1),
      new U16Encodable(2),
      new U32Encodable(3),
    ];
    const tuple = new TupleEncodable(input);
    expect(tuple.toTopHex()).toEqual("01000200000003");
    expect(tuple.toNestHex()).toEqual("01000200000003");
  });
});
