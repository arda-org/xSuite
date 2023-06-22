import { describe, beforeEach, it, expect } from "@jest/globals";
import { ByteReader } from "./ByteReader";

describe("ByteReader", () => {
  let byteReader: ByteReader;
  let bytes: Uint8Array;

  beforeEach(() => {
    bytes = new Uint8Array([1, 2, 3, 4, 5]);
    byteReader = new ByteReader(bytes);
  });

  it("reads exactly the specified amount of bytes correctly", () => {
    expect(byteReader.readExact(3)).toEqual(new Uint8Array([1, 2, 3]));
    expect(byteReader.length()).toEqual(2);
  });

  it("throws error when reading beyond available bytes", () => {
    expect(() => byteReader.readExact(6)).toThrow("No remaining byte to read.");
  });

  it("reads at most the specified amount of bytes correctly", () => {
    byteReader.readExact(2);
    expect(byteReader.readAtMost(3)).toEqual(new Uint8Array([3, 4, 5]));
    expect(byteReader.readAtMost(3)).toEqual(new Uint8Array([]));
    expect(byteReader.length()).toEqual(0);
  });

  it("reads all remaining bytes correctly", () => {
    byteReader.readExact(2);
    expect(byteReader.readAll()).toEqual(new Uint8Array([3, 4, 5]));
    expect(byteReader.length()).toEqual(0);
  });

  it("checks if all bytes have been consumed", () => {
    expect(byteReader.isConsumed()).toEqual(false);
    byteReader.readAll();
    expect(byteReader.isConsumed()).toEqual(true);
  });
});
