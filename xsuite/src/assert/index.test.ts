import { test, expect } from "@jest/globals";
import {
  assertHexList,
  assertAccount,
  assertHasPairs,
  assertAllPairs,
} from "./index";

test("assertHexList - matching", () => {
  assertHexList(["00"], ["00"]);
});

test("assertHexList - not matching", () => {
  expect(() => assertHexList(["00"], ["01"])).toThrow();
});

test("assertHasPairs - matching", () => {
  assertHasPairs({ "01": "01", "03": "03" }, { "01": "01", "02": "" });
});

test("assertHasPairs - value not maching", () => {
  expect(() =>
    assertHasPairs({ "01": "01", "02": "02" }, { "01": "01", "02": "" }),
  ).toThrow();
});

test("assertHasPairs - value missing", () => {
  expect(() =>
    assertHasPairs({ "01": "01" }, { "01": "01", "03": "03" }),
  ).toThrow();
});

test("assertAllPairs - matching", () => {
  assertAllPairs({ "01": "01" }, { "01": "01", "02": "" });
});

test("assertAllPairs - value not maching", () => {
  expect(() =>
    assertAllPairs({ "01": "01", "02": "" }, { "01": "01", "02": "02" }),
  ).toThrow();
});

test("assertAllPairs - value missing", () => {
  expect(() =>
    assertAllPairs({ "01": "01" }, { "01": "01", "03": "03" }),
  ).toThrow();
});

test("assertAllPairs - value in excess", () => {
  expect(() =>
    assertAllPairs({ "01": "01", "02": "02" }, { "01": "01" }),
  ).toThrow();
});

test("assertAccount", () => {
  assertAccount(
    {
      balance: 10n,
      pairs: {
        "01": "01",
      },
    },
    {
      balance: 10n,
      hasPairs: [
        ["01", "01"],
        ["02", ""],
      ],
    },
  );
});
