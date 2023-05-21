import assert from "node:assert";
import { Encodable } from "../enc";
import { Pair, Esdt, getEsdtsPairs } from "../pairs";
import { Proxy } from "../proxy";

export const assertAccountWithPairs = (
  account: AccountWithPairs,
  {
    code,
    nonce,
    balance,
    containsEsdts,
    containsStorage,
  }: AccountWithPairsAssert
) => {
  if (code !== undefined) {
    assert.strictEqual(account.code, code);
  }
  if (nonce !== undefined) {
    assert.strictEqual(account.nonce, nonce);
  }
  if (balance !== undefined) {
    assert.strictEqual(account.balance, balance);
  }
  if (containsEsdts !== undefined) {
    getEsdtsPairs(...containsEsdts).forEach(([k, v]) =>
      assert.strictEqual(account.pairs[k.toTopHex()], v.toTopHex())
    );
  }
  if (containsStorage !== undefined) {
    containsStorage.forEach(([k, v]) =>
      assert.strictEqual(account.pairs[k.toTopHex()], v.toTopHex())
    );
  }
};

export const assertTxReturnData = (
  data: string[],
  expectedData: Encodable[]
) => {
  const encExpectedData = expectedData.map((v) => v.toTopHex());
  assert.deepStrictEqual(data, encExpectedData);
};

type AccountWithPairs = Awaited<ReturnType<typeof Proxy.getAccountWithPairs>>;

type AccountWithPairsAssert = {
  code?: string;
  nonce?: number;
  balance?: bigint;
  containsEsdts?: Esdt[];
  containsStorage?: Pair[];
};
