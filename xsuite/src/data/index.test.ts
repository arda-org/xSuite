import { expect, test } from "@jest/globals";
import { d } from ".";

test("d", () => {
  expect(d.U().fromTop("01")).toEqual(1n);
});
