import assert from "node:assert";
import { Hex, hexToHexString } from "../data/hex";

export const assertHexList = (actualHexList: Hex[], expectedHexList: Hex[]) => {
  assert.deepStrictEqual(
    actualHexList.map((v) => hexToHexString(v)),
    expectedHexList.map((v) => hexToHexString(v)),
  );
};
