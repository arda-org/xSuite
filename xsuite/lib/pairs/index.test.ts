import { expect, test } from "@jest/globals";
import { getEsdtsKvs, kvsToPairs, s } from "./index";

test("s.SingleValueMapper", () => {
  expect(s.SingleValueMapper("mapper", [])).toEqual([]);
});

test("getEsdtsKvs", () => {
  expect(getEsdtsKvs([])).toEqual([]);
});

test("kvsToPairs", () => {
  expect(kvsToPairs([])).toEqual({});
});
