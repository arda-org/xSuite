import { describe, it, expect } from "@jest/globals";
import { b64ToHexString, bytesToHexString, hexStringToBytes } from "./utils";

describe("bytesToHexString", () => {
  it("should convert bytes to a hex string", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    const expectedHexString = "48656c6c6f";
    expect(bytesToHexString(bytes)).toEqual(expectedHexString);
  });

  it("should return an empty string for an empty input", () => {
    const bytes = new Uint8Array([]);
    const expectedHexString = "";
    expect(bytesToHexString(bytes)).toEqual(expectedHexString);
  });
});

describe("hexStringToBytes", () => {
  it("should convert a hex string to bytes", () => {
    const hexString = "48656c6c6f";
    const expectedBytes = new Uint8Array([72, 101, 108, 108, 111]);
    expect(hexStringToBytes(hexString)).toEqual(expectedBytes);
  });

  it("should throw an error for an odd length hex string", () => {
    const hexString = "48656c6c6";
    expect(() => hexStringToBytes(hexString)).toThrow("Odd hex string length.");
  });

  it("should throw an error for an invalid hex string", () => {
    const hexString = "48656c6c6g";
    expect(() => hexStringToBytes(hexString)).toThrow("Invalid hex string.");
  });

  it("should return an empty Uint8Array for an empty input", () => {
    const hexString = "";
    const expectedBytes = new Uint8Array([]);
    expect(hexStringToBytes(hexString)).toEqual(expectedBytes);
  });
});

describe("b64ToHexString", () => {
  it("should convert a base64 string to hex string", () => {
    const actualHex = b64ToHexString("aGVsbG8=");
    const expectedHex = "68656c6c6f";
    expect(actualHex).toEqual(expectedHex);
  });
});
