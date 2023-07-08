import { expect, test } from "@jest/globals";
import { e, Encodable, p } from "./index";

test("s", () => {
  expect(p.SingleValueMapper("key", [])).toEqual([]);
});

test("Encodable", () => {
  const encodable = e.Bytes([65, 66, 67]);
  expect(encodable).toBeInstanceOf(Encodable);
});
