import { describe, it, expect } from "@jest/globals";
import { StringEncodable } from "./StringEncodable";

describe("StringEncodable", () => {
  describe("topEncode", () => {
    it("should return a Uint8Array of character codes for the given string", () => {
      const str = "Hello";
      expect(new StringEncodable(str).toTopHex()).toEqual("48656c6c6f");
    });

    it("should handle an empty string", () => {
      const str = "";
      expect(new StringEncodable(str).toTopHex()).toEqual("");
    });
  });

  describe("nestEncode", () => {
    it("should return a Uint8Array with the length prefix and character codes for the given string", () => {
      const str = "Hello";
      expect(new StringEncodable(str).toNestHex()).toEqual(
        "0000000548656c6c6f"
      );
    });

    it("should handle unicode characters correctly", () => {
      const str = "こんにちは";
      expect(new StringEncodable(str).toNestHex()).toEqual(
        "0000000fe38193e38293e381abe381a1e381af"
      );
    });

    it("should handle an empty string", () => {
      const str = "";
      expect(new StringEncodable(str).toNestHex()).toEqual("00000000");
    });
  });
});
