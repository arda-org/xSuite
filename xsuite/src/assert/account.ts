import assert from "node:assert";
import { Kvs, kvsToRawKvs } from "../data/kvs";
import { Proxy } from "../proxy";

export const assertHasKvs = (actualKvs: Kvs, hasKvs: Kvs) => {
  const rawActualKvs = kvsToRawKvs(actualKvs);
  const rawHasKvs = kvsToRawKvs(hasKvs);
  for (const k in rawHasKvs) {
    assert.strictEqual(rawActualKvs[k] ?? "", rawHasKvs[k] ?? "");
  }
};

export const assertAllKvs = (actualKvs: Kvs, allKvs: Kvs) => {
  const rawActualKvs = kvsToRawKvs(actualKvs);
  const rawAllKvs = kvsToRawKvs(allKvs);
  const keys = new Set([
    ...Object.keys(rawActualKvs),
    ...Object.keys(rawAllKvs),
  ]);
  for (const k of keys) {
    assert.strictEqual(rawActualKvs[k] ?? "", rawAllKvs[k] ?? "");
  }
};

export const assertAccount = (
  actualAccount: ActualAccount,
  { code, nonce, balance, hasKvs, allKvs }: ExpectedAccount,
) => {
  if (code !== undefined) {
    assert.strictEqual(actualAccount.code, code);
  }
  if (nonce !== undefined) {
    assert.strictEqual(actualAccount.nonce, nonce);
  }
  if (balance !== undefined) {
    assert.strictEqual(actualAccount.balance, BigInt(balance));
  }
  if (hasKvs !== undefined) {
    assertHasKvs(actualAccount.kvs ?? {}, hasKvs);
  }
  if (allKvs !== undefined) {
    assertAllKvs(actualAccount.kvs ?? {}, allKvs);
  }
};

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.getAccountWithKvs>>
>;

type ExpectedAccount = {
  code?: string;
  nonce?: number;
  balance?: number | bigint;
  hasKvs?: Kvs;
  allKvs?: Kvs;
};
