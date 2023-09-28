import assert from "node:assert";
import { Address } from "../data/address";
import { Kvs, kvsToRawKvs } from "../data/kvs";
import { Proxy } from "../proxy";
import { CodeMetadata, codeMetadataToHexString } from "../proxy/proxy";
import { expandCode } from "../world/world";

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
  {
    nonce,
    balance,
    code,
    codeMetadata,
    owner,
    hasKvs,
    allKvs,
  }: ExpectedAccount,
) => {
  if (nonce !== undefined) {
    assert.strictEqual(actualAccount.nonce, nonce);
  }
  if (balance !== undefined) {
    assert.strictEqual(actualAccount.balance, BigInt(balance));
  }
  if (code !== undefined) {
    assert.strictEqual(
      actualAccount.code,
      code == null ? code : expandCode(code),
    );
  }
  if (codeMetadata !== undefined) {
    assert.strictEqual(
      actualAccount.codeMetadata,
      codeMetadata == null
        ? codeMetadata
        : codeMetadataToHexString(codeMetadata),
    );
  }
  if (owner !== undefined) {
    assert.strictEqual(
      actualAccount.owner,
      owner == null ? owner : owner.toString(),
    );
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
  nonce?: number;
  balance?: number | bigint;
  code?: string | null;
  codeMetadata?: CodeMetadata | null;
  owner?: Address | null;
  hasKvs?: Kvs;
  allKvs?: Kvs;
};
