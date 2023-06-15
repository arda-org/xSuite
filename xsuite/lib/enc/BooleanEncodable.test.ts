import { describe, expect, it } from "@jest/globals";
import { BooleanEncodable } from "./BooleanEncodable";

describe("BooleanEncodable", () => {
  describe("top encoding", () => {
    it("should correctly encode true", () => {
      expect(new BooleanEncodable(true).toTopHex()).toEqual("01");
    });

    it("should correctly encode false", () => {
      expect(new BooleanEncodable(false).toTopHex()).toEqual("00");
    });
  });

  describe("nest encoding", () => {
    it("should correctly encode true", () => {
      expect(new BooleanEncodable(true).toNestHex()).toEqual("01");
    });

    it("should correctly encode false", () => {
      expect(new BooleanEncodable(false).toNestHex()).toEqual("00");
    });
  });
});
