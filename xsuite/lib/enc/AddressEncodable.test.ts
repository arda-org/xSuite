import { describe, it, test, expect } from "@jest/globals";
import { AddressEncodable } from "./AddressEncodable";

describe("AddressEncodable", () => {
  test("constructor - topEncode", () => {
    const address = new Uint8Array(32);
    expect(new AddressEncodable(address).toTopBytes()).toEqual(address);
  });

  test("constructor - nestEncode", () => {
    const address = new Uint8Array(32);
    expect(new AddressEncodable(address).toNestBytes()).toEqual(address);
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
