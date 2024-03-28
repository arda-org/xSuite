import assert from "node:assert";
import { Address, addressToBechAddress } from "../data/address";
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
    codeMetadata,
    owner,
    kvs,
    allKvs,
    hasKvs,
  }: ExpectedAccount,
) => {
  if (address !== undefined) {
    assert.strictEqual(actualAccount.address, addressToBechAddress(address));
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
      code == null ? undefined : expandCode(code),
    );
  }
  if (codeMetadata !== undefined) {
    assert.strictEqual(
      actualAccount.codeMetadata == null ? "" : actualAccount.codeMetadata,
      codeMetadata == null ? "" : eCodeMetadata(codeMetadata),
    );
  }
  if (owner !== undefined) {
    assert.strictEqual(
      actualAccount.owner,
      owner == null ? undefined : addressToBechAddress(owner),
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

const assertKvs = (actualKvs: EncodableKvs, expectedKvs: EncodableKvs) => {
  assert.deepStrictEqual(e.kvs(actualKvs), e.kvs(expectedKvs));
};

const assertHasKvs = (actualKvs: EncodableKvs, hasKvs: EncodableKvs) => {
  const rawActualKvs = eKvsUnfiltered(actualKvs);
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
  Awaited<ReturnType<typeof Proxy.getAccountWithKvs>>
>;

type ExpectedAccount = {
  address?: Address;
  nonce?: number;
  balance?: number | bigint | string;
  code?: string | null;
  codeMetadata?: EncodableCodeMetadata | null;
  owner?: Address | null;
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
