import assert from "node:assert";
import { BytesLike } from "../data";
import { bytesLikeToHex } from "../data/bytesLike";

export const assertHexList = (
  actualHexList: BytesLike[],
  expectedHexList: BytesLike[],
) => {
  assert.deepStrictEqual(
    [...actualHexList.map(bytesLikeToHex)],
    [...expectedHexList.map(bytesLikeToHex)],
  );
};
