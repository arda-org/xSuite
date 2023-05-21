import { describe, expect, test } from "@jest/globals";
import { ListEncodable } from "./ListEncodable";
import { U16Encodable, U32Encodable, U8Encodable } from "./UintEncodable";

describe("ListEncodable", () => {
  test("u8 array", () => {
    const list = new ListEncodable([new U8Encodable(1), new U8Encodable(2)]);
    expect(list.toTopHex()).toEqual("0102");
    expect(list.toNestHex()).toEqual("000000020102");
  });

  test("u16 array", () => {
    const list = new ListEncodable([new U16Encodable(1), new U16Encodable(2)]);
    expect(list.toTopHex()).toEqual("00010002");
    expect(list.toNestHex()).toEqual("0000000200010002");
  });

  test("mixed list (u8, u16, u32)", () => {
    const list = new ListEncodable([
      new U8Encodable(1),
      new U16Encodable(2),
      new U32Encodable(3),
    ]);
    expect(list.toTopHex()).toEqual("01000200000003");
    expect(list.toNestHex()).toEqual("0000000301000200000003");
  });
});
