import { describe, it, expect } from "vitest";
import { computeShard, numberToBytesAddress } from "./utils";

describe("numberToBytesAddress", () => {
  it("should throw an error for non-positive numbers", () => {
    expect(() => numberToBytesAddress(0, false)).toThrow(
      "Number must be positive.",
    );
    expect(() => numberToBytesAddress(-1, true)).toThrow(
      "Number must be positive.",
    );
  });

  it("should return correct address bytes for non-scenario", () => {
    expect(numberToBytesAddress(123, false)).toEqual(
      Uint8Array.from([
        0, 0, 0, 123, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    );
  });

  it("should return correct address bytes for scenario", () => {
    expect(numberToBytesAddress(456, true)).toEqual(
      Uint8Array.from([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    );
  });
});

describe("computeShard", () => {
  it("should return 0 when passing a shard 0 wallet", () => {
    expect(
      computeShard(
        "f67c3f46fd547424a73f42d7b4389f5766efff17b1dbeb651d7670fcd75c1fc4",
      ),
    ).toBe(0);
  });

  it("should return 1 when passing a shard 1 wallet", () => {
    expect(
      computeShard(
        "00000000000000000500bef4edd3e3f6f8e949394d6029adb901f362fae676d3",
      ),
    ).toBe(1);
  });

  it("should return 2 when passing a shard 2 wallet", () => {
    expect(
      computeShard(
        "021f72ecde1ef37d9a24798be25f3b4097f83396e4b22196d3d89dc81a701332",
      ),
    ).toBe(2);
  });
});
