import { describe, expect, test } from "@jest/globals";

import { OptionEncodable } from "./OptionEncodable";
import { U16Encodable, UintEncodable } from "./UintEncodable";

describe("OptionEncodable", () => {
  test("Some(u16) - 5", () => {
    const encodable = new OptionEncodable(new U16Encodable(5));
    expect(encodable.toTopHex()).toEqual("010005");
    expect(encodable.toNestHex()).toEqual("010005");
  });

  test("Some(u16) - 0", () => {
    const encodable = new OptionEncodable(new U16Encodable(0));
    expect(encodable.toTopHex()).toEqual("010000");
    expect(encodable.toNestHex()).toEqual("010000");
  });

  test("None(u16)", () => {
    const encodable = new OptionEncodable(null);
    expect(encodable.toTopHex()).toEqual("");
    expect(encodable.toNestHex()).toEqual("00");
  });

  test("Some(BigUint) - 256", () => {
    const encodable = new OptionEncodable(new UintEncodable(256n));
    expect(encodable.toTopHex()).toEqual("01000000020100");
    expect(encodable.toNestHex()).toEqual("01000000020100");
  });
});
