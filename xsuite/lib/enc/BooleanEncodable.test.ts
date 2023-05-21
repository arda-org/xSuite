import { describe, expect, it } from "@jest/globals";
import { BooleanEncodable } from "./BooleanEncodable";

describe("BooleanEncodable", () => {
  describe("topEncode", () => {
    it("should correctly encode", () => {
      expect(new BooleanEncodable(true).toTopHex()).toEqual("01");
      expect(new BooleanEncodable(false).toTopHex()).toEqual("00");
    });
  });

  describe("nestEncode", () => {
    it("should correctly encode", () => {
      expect(new BooleanEncodable(true).toNestHex()).toEqual("01");
      expect(new BooleanEncodable(false).toNestHex()).toEqual("00");
    });
  });
});
