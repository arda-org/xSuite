import assert from "node:assert";
import { hexToHexString, Esdt, Kv, getEsdtsKvs, Hex } from "../data";
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
  const kvs = [
    ...(containsEsdts ? getEsdtsKvs(containsEsdts) : []),
    ...(containsStorage ?? []),
  ];
  if (kvs.length > 0) {
    kvs.forEach(([k, v]) =>
      assert.strictEqual(
        actualAccount.pairs?.[hexToHexString(k)] ?? "",
        hexToHexString(v)
      )
    );
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
  containsEsdts?: Esdt[];
  containsStorage?: Kv[];
};
