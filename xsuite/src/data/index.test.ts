import { expect, test } from "@jest/globals";
import { e, Encodable, hexToB64String } from "./index";

test("Encodable", () => {
  const encodable = e.Bytes([65, 66, 67]);
  expect(encodable).toBeInstanceOf(Encodable);
});

test("hexToB64String", () => {
  expect(hexToB64String("00")).toEqual("AA==");
});
