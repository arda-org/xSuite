import { test, expect } from "@jest/globals";
import { assertAllKvs, assertHasKvs, assertAccount } from "./account";
import { assertHexList } from "./hexList";

test("assertHexList - matching", () => {
  assertHexList(["00"], ["00"]);
});

test("assertHexList - not matching", () => {
  expect(() => assertHexList(["00"], ["01"])).toThrow();
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

test("assertAllKvs - matching", () => {
  assertAllKvs({ "01": "01" }, { "01": "01", "02": "" });
});

test("assertAllKvs - value not maching", () => {
  expect(() =>
    assertAllKvs({ "01": "01", "02": "" }, { "01": "01", "02": "02" }),
  ).toThrow();
});

test("assertAllKvs - value missing", () => {
  expect(() =>
    assertAllKvs({ "01": "01" }, { "01": "01", "03": "03" }),
  ).toThrow();
});

test("assertAllKvs - value in excess", () => {
  expect(() =>
    assertAllKvs({ "01": "01", "02": "02" }, { "01": "01" }),
  ).toThrow();
});

test("assertAccount", () => {
  assertAccount(
    {
      balance: 10n,
      kvs: {
        "01": "01",
      },
    },
    {
      balance: 10n,
      hasKvs: [
        ["01", "01"],
        ["02", ""],
      ],
    },
  );
});
