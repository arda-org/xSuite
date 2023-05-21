import { describe, it, expect } from "@jest/globals";
import { numberToBytesAddress } from "./utils";

describe("numberToBytesAddress", () => {
  it("should throw an error for non-positive numbers", () => {
    expect(() => numberToBytesAddress(0, false)).toThrow(
      "Number must be positive."
    );
    expect(() => numberToBytesAddress(-1, true)).toThrow(
      "Number must be positive."
    );
  });

  it("should return correct address bytes for non-scenario", () => {
    expect(numberToBytesAddress(123, false)).toEqual(
      Uint8Array.from([
        0, 0, 0, 123, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ])
    );
  });

  it("should return correct address bytes for scenario", () => {
    expect(numberToBytesAddress(456, true)).toEqual(
      Uint8Array.from([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ])
    );
  });
});
