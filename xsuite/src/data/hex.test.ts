import { test, expect } from "@jest/globals";
import { enc } from "./encoding";
import { hexToBytes, hexToHexString } from "./hex";

test("hexToBytes", () => {
  expect(hexToBytes("12")).toEqual(new Uint8Array([18]));
  expect(hexToBytes(enc.Bool(true))).toEqual(new Uint8Array([1]));
});

test("hexToHexString", () => {
  expect(hexToHexString("12")).toEqual("12");
});
