import { test, expect } from "@jest/globals";
import { assertKvs, assertHasKvs, assertAccount } from "./account";
import { assertHexList } from "./hexList";

test("assertHexList - matching", () => {
  assertHexList(["00"], ["00"]);
});

test("assertHexList - not matching", () => {
  expect(() => assertHexList(["00"], ["01"])).toThrow();
});

test("assertKvs - matching", () => {
  assertKvs({ "01": "01" }, { "01": "01", "02": "" });
});

test("assertKvs - value not maching", () => {
  expect(() =>
    assertKvs({ "01": "01", "02": "" }, { "01": "01", "02": "02" }),
  ).toThrow();
});

test("assertKvs - value missing", () => {
  expect(() => assertKvs({ "01": "01" }, { "01": "01", "03": "03" })).toThrow();
});

test("assertKvs - value in excess", () => {
  expect(() => assertKvs({ "01": "01", "02": "02" }, { "01": "01" })).toThrow();
});

test("assertHasKvs - matching", () => {
  assertHasKvs({ "01": "01", "03": "03" }, { "01": "01", "02": "" });
});

test("assertHasKvs - value not maching", () => {
  expect(() =>
    assertHasKvs({ "01": "01", "02": "02" }, { "01": "01", "02": "" }),
  ).toThrow();
});

test("assertHasKvs - value missing", () => {
  expect(() =>
    assertHasKvs({ "01": "01" }, { "01": "01", "03": "03" }),
  ).toThrow();
});

test("assertAccount", () => {
  assertAccount(
    {
      balance: 10n,
      code: "010203",
      codeMetadata: "0400",
      owner: "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu",
      kvs: {
        "01": "01",
        "02": "02",
      },
    },
    {
      balance: 10n,
      code: "010203",
      codeMetadata: ["readable"],
      owner: "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu",
      kvs: [
        ["01", "01"],
        ["02", "02"],
        ["03", ""],
      ],
      hasKvs: [
        ["01", "01"],
        ["03", ""],
      ],
    },
  );
});
