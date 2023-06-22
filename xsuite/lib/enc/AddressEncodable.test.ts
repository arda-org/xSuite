import { describe, it, test, expect } from "@jest/globals";
import {
  AddressEncodable,
  addressByteLength,
  bytesToBech32,
} from "./AddressEncodable";

describe("AddressEncodable", () => {
  test("top encoding from address", () => {
    const bechAddress =
      "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
    const bytesAddress = new Uint8Array(32);
    expect(new AddressEncodable(bechAddress).toTopBytes()).toEqual(
      bytesAddress
    );
  });

  test("top encoding from bytes", () => {
    const address = new Uint8Array(32);
    expect(new AddressEncodable(address).toTopBytes()).toEqual(address);
  });

  test("nest encoding from bytes", () => {
    const address = new Uint8Array(32);
    expect(new AddressEncodable(address).toNestBytes()).toEqual(address);
  });

  test("bytesToBech32", () => {
    const bechAddress =
      "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
    expect(bytesToBech32(new Uint8Array(32))).toEqual(bechAddress);
  });

  test("correct address length", () => {
    expect(addressByteLength).toEqual(32);
  });

  it("should throw error if address HRP invalid", () => {
    const address =
      "btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5mhdvz";
    expect(() => new AddressEncodable(address)).toThrow(
      'Address HRP is not "erd".'
    );
  });

  it("should throw error if address length too short", () => {
    const address = new Uint8Array(31);
    expect(() => new AddressEncodable(address)).toThrow(
      "Invalid address length."
    );
  });

  it("should throw error if address length too long", () => {
    const address = new Uint8Array(33);
    expect(() => new AddressEncodable(address)).toThrow(
      "Invalid address length."
    );
  });
});
