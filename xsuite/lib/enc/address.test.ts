import { test, expect } from "@jest/globals";
import { addressToBytes, addressToHexString } from "./address";

test("addressToBytes", () => {
  const bechAddress =
    "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
  const bytesAddress = new Uint8Array(32);
  expect(addressToBytes(bechAddress)).toEqual(bytesAddress);
});

test("addressToHexString", () => {
  const bechAddress =
    "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
  const hexAddress =
    "0000000000000000000000000000000000000000000000000000000000000000";
  expect(addressToHexString(bechAddress)).toEqual(hexAddress);
});
