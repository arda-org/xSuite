import { describe, expect, test } from "@jest/globals";
import { TupleEncodable } from "./TupleEncodable";
import { UintEncodable } from "./UintEncodable";

describe("TupleEncodable", () => {
  test("u8 tuple", () => {
    const tuple = new TupleEncodable([
      new UintEncodable(1, 1),
      new UintEncodable(2, 1),
    ]);
    expect(tuple.toTopHex()).toEqual("0102");
    expect(tuple.toNestHex()).toEqual("0102");
  });

  test("mixed (u8, u16) tuple", () => {
    const tuple = new TupleEncodable([
      new UintEncodable(1, 1),
      new UintEncodable(2, 2),
    ]);
    expect(tuple.toTopHex()).toEqual("010002");
    expect(tuple.toNestHex()).toEqual("010002");
  });
});
