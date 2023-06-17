import assert from "node:assert";
import { Encodable } from "../enc";
import { Pair, Esdt, getEsdtsPairs } from "../pairs";
import { Proxy } from "../proxy";

export const assertAccount = (
  actualAccount: ActualAccount,
  { code, nonce, balance, containsEsdts, containsStorage }: ExpectedAccount
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
  if (containsEsdts !== undefined) {
    getEsdtsPairs(...containsEsdts).forEach(([k, v]) =>
      assert.strictEqual(actualAccount.pairs?.[k.toTopHex()], v.toTopHex())
    );
  }
  if (containsStorage !== undefined) {
    containsStorage.forEach(([k, v]) =>
      assert.strictEqual(actualAccount.pairs?.[k.toTopHex()], v.toTopHex())
    );
  }
};

export const assertTxReturnData = (
  actualData: string[],
  expectedData: Encodable[]
) => {
  const encExpectedData = expectedData.map((v) => v.toTopHex());
  assert.deepStrictEqual(actualData, encExpectedData);
};

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.getAccountWithPairs>>
>;

type ExpectedAccount = {
  code?: string;
  nonce?: number;
  balance?: bigint;
  containsEsdts?: Esdt[];
  containsStorage?: Pair[];
};
