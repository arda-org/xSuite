import assert from "node:assert";
import { AddressLike, addressLikeToBechAddress } from "../data/addressLike";
import {
  e,
  eKvsUnfiltered,
  EncodableVs,
  EncodableKvs,
  eCodeMetadata,
  EncodableCodeMetadata,
} from "../data/encoding";
import { Proxy } from "../proxy";
import { expandCode } from "../world/world";

export const assertVs = (actualVs: EncodableVs, expectedVs: EncodableVs) => {
  assert.deepStrictEqual(e.vs(actualVs), e.vs(expectedVs));
};

export const assertAccount = (
  actualAccount: ActualAccount,
  {
    address,
    nonce,
    balance,
    code,
    codeHash,
    codeMetadata,
    owner,
    kvs,
    allKvs,
    hasKvs,
  }: ExpectedAccount,
) => {
  if (address !== undefined) {
    assert.strictEqual(
      actualAccount.address,
      addressLikeToBechAddress(address),
    );
  }
  if (nonce !== undefined) {
    assert.strictEqual(actualAccount.nonce, nonce);
  }
  if (balance !== undefined) {
    assert.strictEqual(actualAccount.balance, BigInt(balance));
  }
  if (code !== undefined) {
    assert.strictEqual(actualAccount.code, expandCode(code));
  }
  if (codeHash !== undefined) {
    assert.strictEqual(actualAccount.codeHash, codeHash);
  }
  if (codeMetadata !== undefined) {
    assert.strictEqual(actualAccount.codeMetadata, eCodeMetadata(codeMetadata));
  }
  if (owner !== undefined) {
    assert.strictEqual(actualAccount.owner, addressLikeToBechAddress(owner));
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

const assertKvs = (actualKvs: EncodableKvs, expectedKvs: EncodableKvs) => {
  assert.deepStrictEqual(e.kvs(actualKvs), e.kvs(expectedKvs));
};

const assertHasKvs = (actualKvs: EncodableKvs, hasKvs: EncodableKvs) => {
  const rawActualKvs = structuredClone(eKvsUnfiltered(actualKvs));
  const rawHasKvs = eKvsUnfiltered(hasKvs);
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

type ActualAccount = Partial<
  Awaited<ReturnType<typeof Proxy.prototype.getAccount>>
>;

type ExpectedAccount = {
  address?: AddressLike;
  nonce?: number;
  balance?: number | bigint | string;
  code?: string;
  codeHash?: string;
  codeMetadata?: EncodableCodeMetadata;
  owner?: AddressLike;
  kvs?: EncodableKvs;
  hasKvs?: EncodableKvs;
  /**
   * @deprecated Use `.kvs` instead.
   */
  allKvs?: EncodableKvs;
};

/**
 * @deprecated Use `assertVs` instead.
 */
export const assertHexList = (
  actualHexList: EncodableVs,
  expectedHexList: EncodableVs,
) => {
  assertVs(actualHexList, expectedHexList);
};
