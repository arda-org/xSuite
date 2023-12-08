import assert from "node:assert";
import { Hex, broadHexToHex } from "../data/broadHex";

export const assertHexList = (actualHexList: Hex[], expectedHexList: Hex[]) => {
  assert.deepStrictEqual(
    [...actualHexList.map(broadHexToHex)],
    [...expectedHexList.map(broadHexToHex)],
  );
};
