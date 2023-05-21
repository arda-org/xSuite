import { describe, expect, it } from "@jest/globals";
import { BytesEncodable } from "./BytesEncodable";

describe("HexEncodable", () => {
  describe("topEncode", () => {
    it("should correctly encode", () => {
      const bytes = new Uint8Array([255, 128, 63]);
      expect(new BytesEncodable(bytes).toTopBytes()).toEqual(bytes);
    });
  });

  describe("nestEncode", () => {
    it("should correctly encode", () => {
      const bytes = new Uint8Array([255, 128, 63]);
      expect(new BytesEncodable(bytes).toNestBytes()).toEqual(bytes);
    });
  });
});
