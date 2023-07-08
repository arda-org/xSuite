import assert from "node:assert";
import { hexToHexString, Pairs, Hex, pairsToRawPairs } from "../data";
import { Proxy } from "../proxy";

export const assertAccount = (
  actualAccount: ActualAccount,
  { code, nonce, balance, hasPairs }: ExpectedAccount
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
    const rawPairs = pairsToRawPairs(hasPairs);
    for (const k in rawPairs) {
      assert.strictEqual(actualAccount.pairs?.[k] ?? "", rawPairs[k]);
    }
  }
};

export const assertTxReturnData = (
  actualData: string[],
  expectedData: Hex[]
) => {
  assert.deepStrictEqual(
    actualData,
    expectedData.map((v) => hexToHexString(v))
  );
};

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.getAccountWithPairs>>
>;

type ExpectedAccount = {
  code?: string;
  nonce?: number;
  balance?: bigint;
  hasPairs?: Pairs;
};
