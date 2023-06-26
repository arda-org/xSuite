import { describe, expect, test } from "@jest/globals";
import { ListEncodable } from "./ListEncodable";
import { UintEncodable } from "./UintEncodable";

describe("ListEncodable", () => {
  test("u8 list", () => {
    const list = new ListEncodable([
      new UintEncodable(1, 1),
      new UintEncodable(2, 1),
    ]);
    expect(list.toTopHex()).toEqual("0102");
    expect(list.toNestHex()).toEqual("000000020102");
  });

  test("mixed (u8, u16) list", () => {
    const list = new ListEncodable([
      new UintEncodable(1, 1),
      new UintEncodable(2, 2),
    ]);
    expect(list.toTopHex()).toEqual("010002");
    expect(list.toNestHex()).toEqual("00000002010002");
  });
});
