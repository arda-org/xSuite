import { test, expect } from "vitest";
import { computeShard, numberToU8AAddress } from "./utils";

test("numberToU8AAddress - non-positive number", () => {
  expect(() => numberToU8AAddress(0, false)).toThrow(
    "Number must be positive.",
  );
  expect(() => numberToU8AAddress(-1, true)).toThrow(
    "Number must be positive.",
  );
});

test("numberToU8AAddress - wallet", () => {
  expect(numberToU8AAddress(123, false)).toEqual(
    Uint8Array.from([
      0, 0, 0, 123, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  );
});

test("numberToU8AAddress - contract", () => {
  expect(numberToU8AAddress(456, true)).toEqual(
    Uint8Array.from([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  );
});

test("computeShard - address on shard 0", () => {
  expect(
    computeShard(
      "f67c3f46fd547424a73f42d7b4389f5766efff17b1dbeb651d7670fcd75c1fc4",
    ),
  ).toEqual(0);
});

test("computeShard - address on shard 1", () => {
  expect(
    computeShard(
      "00000000000000000500bef4edd3e3f6f8e949394d6029adb901f362fae676d3",
    ),
  ).toEqual(1);
});

test("computeShard - address on shard 2", () => {
  expect(
    computeShard(
      "021f72ecde1ef37d9a24798be25f3b4097f83396e4b22196d3d89dc81a701332",
    ),
  ).toEqual(2);
});
