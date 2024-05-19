import { test, expect } from "vitest";
import { getShardOfU8AAddress } from "../data/utils";
import { numberToU8AAddress } from "./utils";

// TODO: déplacer dans data/utils.test.ts

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
    new Uint8Array([
      1, 0, 0, 0, 123, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  );
});

test("numberToU8AAddress - contract", () => {
  expect(numberToU8AAddress(456, true)).toEqual(
    new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  );
});

test("getShardOfU8AAddress - address on shard 0", () => {
  expect(
    getShardOfU8AAddress(
      new Uint8Array([
        246, 124, 63, 70, 253, 84, 116, 36, 167, 63, 66, 215, 180, 56, 159, 87,
        102, 239, 255, 23, 177, 219, 235, 101, 29, 118, 112, 252, 215, 92, 31,
        196,
      ]),
    ),
  ).toEqual(0);
});

test("getShardOfU8AAddress - address on shard 1", () => {
  expect(
    getShardOfU8AAddress(
      new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 190, 244, 237, 211, 227, 246, 248, 233,
        73, 57, 77, 96, 41, 173, 185, 1, 243, 98, 250, 230, 118, 211,
      ]),
    ),
  ).toEqual(1);
});

test("getShardOfU8AAddress - address on shard 2", () => {
  expect(
    getShardOfU8AAddress(
      new Uint8Array([
        2, 31, 114, 236, 222, 30, 243, 125, 154, 36, 121, 139, 226, 95, 59, 64,
        151, 248, 51, 150, 228, 178, 33, 150, 211, 216, 157, 200, 26, 112, 19,
        50,
      ]),
    ),
  ).toEqual(2);
});
