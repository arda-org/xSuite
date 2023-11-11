import { describe, it, expect } from "@jest/globals";
import { AddressDecoder } from "./AddressDecoder";
import { addressByteLength, bytesToBechAddress } from "./AddressEncodable";

describe("AddressDecoder", () => {
  describe("topDecode", () => {
    it("should decode bytes into the correct bech32 address", () => {
      const bytes = new Uint8Array(addressByteLength);
      const result = new AddressDecoder().topDecode(bytes);
      expect(result).toBe(bytesToBechAddress(bytes));
    });
  });

  describe("nestDecode", () => {
    it("should decode bytes into the correct bech32 address", () => {
      const bytes = new Uint8Array(addressByteLength);
      const result = new AddressDecoder().nestDecode(bytes);
      expect(result).toBe(bytesToBechAddress(bytes));
    });
  });
});
