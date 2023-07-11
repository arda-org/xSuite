import assert from "node:assert";
import { hexToHexString, Pairs, Hex, pairsToRawPairs } from "../data";
import { Proxy } from "../proxy";

export const assertHexList = (actualHexList: Hex[], expectedHexList: Hex[]) => {
  assert.deepStrictEqual(
    actualHexList.map((v) => hexToHexString(v)),
    expectedHexList.map((v) => hexToHexString(v))
  );
};

export const assertHasPairs = (actualPairs: Pairs, hasPairs: Pairs) => {
  const rawActualPairs = pairsToRawPairs(actualPairs);
  const rawHasPairs = pairsToRawPairs(hasPairs);
  for (const k in rawHasPairs) {
    assert.strictEqual(rawActualPairs[k] ?? "", rawHasPairs[k] ?? "");
  }
};

export const assertAllPairs = (actualPairs: Pairs, allPairs: Pairs) => {
  const rawActualPairs = pairsToRawPairs(actualPairs);
  const rawAllPairs = pairsToRawPairs(allPairs);
  const keys = new Set([
    ...Object.keys(rawActualPairs),
    ...Object.keys(rawAllPairs),
  ]);
  for (const k of keys) {
    assert.strictEqual(rawActualPairs[k] ?? "", rawAllPairs[k] ?? "");
  }
};

export const assertAccount = (
  actualAccount: ActualAccount,
  { code, nonce, balance, hasPairs, allPairs }: ExpectedAccount
) => {
  if (code !== undefined) {
    assert.strictEqual(actualAccount.code, code);
  }
  if (nonce !== undefined) {
    assert.strictEqual(actualAccount.nonce, nonce);
  }
  if (balance !== undefined) {
    assert.strictEqual(actualAccount.balance, balance);
  }
  if (hasPairs !== undefined) {
    assertHasPairs(actualAccount.pairs ?? {}, hasPairs);
  }
  if (allPairs !== undefined) {
    assertAllPairs(actualAccount.pairs ?? {}, allPairs);
  }
};

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.getAccountWithPairs>>
>;

type ExpectedAccount = {
  code?: string;
  nonce?: number;
  balance?: bigint;
  hasPairs?: Pairs;
  allPairs?: Pairs;
};
