import { test, expect } from "vitest";
import {
  getAddressType,
  getAddressShard,
  makeU8AAddress,
  numShards,
  metaShard,
} from "./utils";

test("getAddressType - wallet address", () => {
  expect(
    getAddressType(
      "erd1m6q83c433k4cv9eq982vy7n9jeql4xx0jfkwxxvyzr5admck88dqgk9wr3",
    ),
  ).toEqual("wallet");
});

test("getAddressType - vmContract address", () => {
  expect(
    getAddressType(
      "erd1qqqqqqqqqqqqqpgq2hmzw55mzjuukxz9uxfq9lwp8t00hw99m5pq3xydlv",
    ),
  ).toEqual("vmContract");
});

test("getAddressType - metaContract address", () => {
  expect(
    getAddressType(
      "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq6y6",
    ),
  ).toEqual("metaContract");
});

test("getAddressShard - address on shard 0", () => {
  expect(
    getAddressShard(
      "erd17e7r73ha236zffelgttmgwyl2anwllchk8d7kegawec0e46urlzqfcd6w7",
    ),
  ).toEqual(0);
});

test("getAddressShard - address on shard 1", () => {
  expect(
    getAddressShard(
      "erd1qqqqqqqqqqqqqpgqhm6wm5lr7muwjjfef4szntdeq8ek97hxwmfs9ufrw8",
    ),
  ).toEqual(1);
});

test("getAddressShard - address on shard 2", () => {
  expect(
    getAddressShard(
      "erd1qg0h9mx7rmehmx3y0x97yhemgztlsvukujezr9knmzwusxnszveqsw33ms",
    ),
  ).toEqual(2);
});

test("getAddressShard - address on metachain", () => {
  expect(
    getAddressShard(
      "erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq6y6",
    ),
  ).toEqual(metaShard);
});

for (let shard = 0; shard < numShards; shard++) {
  const counter = (shard * 100) % 57;

  test(`makeU8AAddress - wallet on shard ${shard}`, () => {
    const address = makeU8AAddress({ counter, type: "wallet", shard });
    expect(getAddressType(address)).toEqual("wallet");
    expect(getAddressShard(address)).toEqual(shard);
  });

  test(`makeU8AAddress - vmContract on shard ${shard}`, () => {
    const address = makeU8AAddress({ counter, type: "vmContract", shard });
    expect(getAddressType(address)).toEqual("vmContract");
    expect(getAddressShard(address)).toEqual(shard);
  });
}

test("makeU8AAddress - metaContract", () => {
  const address = makeU8AAddress({ counter: 0, type: "metaContract" });
  expect(getAddressType(address)).toEqual("metaContract");
  expect(getAddressShard(address)).toEqual(metaShard);
});

test("makeU8AAddress - negative counter", () => {
  expect(() => makeU8AAddress({ type: "wallet", counter: -1 })).toThrow(
    "Counter must be non-negative.",
  );
});

test("makeU8AAddress - negative shard", () => {
  expect(() =>
    makeU8AAddress({ type: "wallet", counter: 0, shard: -1 }),
  ).toThrow("Shard must be non-negative.");
});

test("makeU8AAddress - shard too big", () => {
  expect(() =>
    makeU8AAddress({ type: "wallet", counter: 0, shard: 4 }),
  ).toThrow("Shard must be smaller than 3.");
});

test("makeU8AAddress - metaContract with shard", () => {
  expect(() =>
    makeU8AAddress({ type: "metaContract", counter: 0, shard: 0 }),
  ).toThrow("Shard must be undefined or equal to 4294967295.");
});
