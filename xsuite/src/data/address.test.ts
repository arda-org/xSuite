import { test, expect } from "@jest/globals";
import { addressToAddressEncodable } from "./address";

test("addressToAddressEncodable", () => {
  const bechAddress =
    "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";
  const hexAddress =
    "0000000000000000000000000000000000000000000000000000000000000000";
  expect(addressToAddressEncodable(bechAddress).toTopHex()).toEqual(hexAddress);
});
