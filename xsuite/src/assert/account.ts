import assert from "node:assert";
import { Kvs, kvsToRawKvs } from "../data/kvs";
import { Proxy } from "../proxy";
import { codeMetadataToHexString } from "../proxy/proxy";
import { Account } from "../proxy/sproxy";
import { expandCode } from "../world/world";

export const assertKvs = (actualKvs: Kvs, expectedKvs: Kvs) => {
  const rawActualKvs = kvsToRawKvs(actualKvs);
  const rawExpectedKvs = kvsToRawKvs(expectedKvs);
  const keys = new Set([
    ...Object.keys(rawActualKvs),
    ...Object.keys(rawExpectedKvs),
  ]);
  for (const k of keys) {
    assert.strictEqual(rawActualKvs[k] ?? "", rawExpectedKvs[k] ?? "");
  }
};

export const assertHasKvs = (actualKvs: Kvs, hasKvs: Kvs) => {
  const rawActualKvs = kvsToRawKvs(actualKvs);
  const rawHasKvs = kvsToRawKvs(hasKvs);
  for (const k in rawHasKvs) {
    assert.strictEqual(rawActualKvs[k] ?? "", rawHasKvs[k] ?? "");
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
    kvs,
    allKvs,
    hasKvs,
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
  if (kvs !== undefined) {
    assertKvs(actualAccount.kvs ?? {}, kvs);
  }
  if (allKvs !== undefined) {
    assertKvs(actualAccount.kvs ?? {}, allKvs);
  }
  if (hasKvs !== undefined) {
    assertHasKvs(actualAccount.kvs ?? {}, hasKvs);
  }
};

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.getAccountWithKvs>>
>;

type ExpectedAccount = Omit<Account, "address"> & {
  /**
   * @deprecated `.kvs` should be used instead.
   */
  allKvs?: Kvs;
  hasKvs?: Kvs;
};
