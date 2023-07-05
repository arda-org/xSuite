import { expect, test } from "@jest/globals";
import { e, Encodable, s } from "./index";

test("s", () => {
  expect(s.SingleValueMapper("key", [])).toEqual([]);
});

test("Encodable", () => {
  const encodable = e.Bytes([65, 66, 67]);
  expect(encodable).toBeInstanceOf(Encodable);
});
