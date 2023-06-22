import { describe, test, it, expect } from "@jest/globals";
import { OptionDecoder } from "./OptionDecoder";
import { UintDecoder } from "./UintDecoder";

describe("OptionDecoder", () => {
  describe("topDecode", () => {
    test("topDecode option of BigUint that is none", () => {
      expect(new OptionDecoder(new UintDecoder()).topDecode([])).toBeNull();
    });

    test("topDecode option of BigUint that is some", () => {
      expect(
        new OptionDecoder(new UintDecoder()).topDecode(
          new Uint8Array([1, 0, 0, 0, 1, 1])
        )
      ).toEqual(1n);
    });

    test("topDecode option of U8 that is none", () => {
      expect(new OptionDecoder(new UintDecoder()).topDecode([])).toBeNull();
    });

    test("topDecode option of U8 that is some", () => {
      expect(new OptionDecoder(new UintDecoder(1)).topDecode([1, 1])).toEqual(
        1n
      );
    });

    it("should throw error if first byte is not 1", () => {
      expect(() =>
        new OptionDecoder(new UintDecoder(1)).topDecode([2, 0])
      ).toThrow(Error("Invalid Option top-encoding."));
    });
  });

  describe("nestDecode", () => {
    test("nestDecode option of BigUint that is none", () => {
      expect(new OptionDecoder(new UintDecoder()).nestDecode([0])).toBeNull();
    });

    test("nestDecode option of BigUint that is some", () => {
      expect(
        new OptionDecoder(new UintDecoder()).nestDecode([1, 0, 0, 0, 1, 1])
      ).toEqual(1n);
    });

    test("nestDecode option of U8 that is none", () => {
      expect(new OptionDecoder(new UintDecoder()).nestDecode([0])).toBeNull();
    });

    test("nestDecode option of U8 that is some", () => {
      expect(new OptionDecoder(new UintDecoder(1)).nestDecode([1, 1])).toEqual(
        1n
      );
    });

    it("should throw error if first byte is not 0 or 1", () => {
      expect(() =>
        new OptionDecoder(new UintDecoder(1)).nestDecode([2, 0])
      ).toThrow("Invalid Option nest-encoding.");
    });
  });
});
