import { describe, it, test, expect } from "@jest/globals";
import {
  AddressEncodable,
  addressByteLength,
  bytesToBechAddress,
} from "./AddressEncodable";

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";
const zeroBytesAddress = new Uint8Array(32);

describe("AddressEncodable", () => {
  test("top encoding from bech address", () => {
    expect(new AddressEncodable(zeroBechAddress).toTopBytes()).toEqual(
      zeroBytesAddress,
    );
  });

  test("top encoding from hex address", () => {
    expect(new AddressEncodable(zeroHexAddress).toTopBytes()).toEqual(
      zeroBytesAddress,
    );
  });

  test("top encoding from bytes address", () => {
    expect(new AddressEncodable(zeroBytesAddress).toTopBytes()).toEqual(
      zeroBytesAddress,
    );
  });

  test("nest encoding from bytes", () => {
    const address = new Uint8Array(32);
    expect(new AddressEncodable(address).toNestBytes()).toEqual(address);
  });

  test("bytesToBechAddress", () => {
    expect(bytesToBechAddress(new Uint8Array(32))).toEqual(zeroBechAddress);
  });

  test("correct address length", () => {
    expect(addressByteLength).toEqual(32);
  });

  it("should throw error if address HRP invalid", () => {
    const address =
      "btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5mhdvz";
    expect(() => new AddressEncodable(address)).toThrow("Invalid address HRP.");
  });

  it("should throw error if address length too short", () => {
    const address = new Uint8Array(31);
    expect(() => new AddressEncodable(address)).toThrow(
      "Invalid address length.",
    );
  });

  it("should throw error if address length too long", () => {
    const address = new Uint8Array(33);
    expect(() => new AddressEncodable(address)).toThrow(
      "Invalid address length.",
    );
  });
});
