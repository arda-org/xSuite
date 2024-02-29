import assert from "node:assert";
import { addressToBech32 } from "../data/address";
import { Kvs, kvsToRawKvs } from "../data/kvs";
import { Optional } from "../helpers";
import { Proxy } from "../proxy";
import { codeMetadataToHex } from "../proxy/proxy";
import { Account } from "../proxy/sproxy";
import { expandCode } from "../world/world";

export const assertKvs = (actualKvs: Kvs, expectedKvs: Kvs) => {
  const rawActualKvs = { ...kvsToRawKvs(actualKvs) };
  const rawExpectedKvs = { ...kvsToRawKvs(expectedKvs) };
  for (const k of Object.keys(rawActualKvs)) {
    if (!rawActualKvs[k]) {
      delete rawActualKvs[k];
    }
  }
  for (const k of Object.keys(rawExpectedKvs)) {
    if (!(k in rawActualKvs)) {
      rawActualKvs[k] = "";
    }
  }
  assert.deepStrictEqual(rawActualKvs, rawExpectedKvs);
};

export const assertHasKvs = (actualKvs: Kvs, hasKvs: Kvs) => {
  const rawActualKvs = { ...kvsToRawKvs(actualKvs) };
  const rawHasKvs = { ...kvsToRawKvs(hasKvs) };
  for (const k of Object.keys(rawActualKvs)) {
    if (!rawActualKvs[k] || !(k in rawHasKvs)) {
      delete rawActualKvs[k];
    }
  }
  for (const k of Object.keys(rawHasKvs)) {
    if (!(k in rawActualKvs)) {
      rawActualKvs[k] = "";
    }
  }
  assert.deepStrictEqual(rawActualKvs, rawHasKvs);
};

export const assertAccount = (
  actualAccount: ActualAccount,
  {
    address,
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
  if (address !== undefined) {
    assert.strictEqual(actualAccount.address, addressToBech32(address));
  }
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
      actualAccount.codeMetadata == null ? "" : actualAccount.codeMetadata,
      codeMetadata == null ? "" : codeMetadataToHex(codeMetadata),
    );
  }
  if (owner !== undefined) {
    assert.strictEqual(
      actualAccount.owner,
      owner == null ? owner : addressToBech32(owner),
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

type ExpectedAccount = Optional<Account, "address"> & {
  /**
   * @deprecated Use `.kvs` instead.
   */
  allKvs?: Kvs;
  hasKvs?: Kvs;
};
