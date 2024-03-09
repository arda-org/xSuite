/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */

import assert from "node:assert";
import prettyFormat, { Config, NewPlugin, Printer, Refs } from "pretty-format";
import { test } from "vitest";
import {
  addressToHexAddress,
  addressToU8AAddress,
  isBechAddress,
  isHexAddress,
} from "../data/address";
import { B64, b64, isB64, u8aToB64 } from "../data/b64";
import { Bytes } from "../data/bytes";
// import { BytesConsumer, d, dIX, dUX } from "../data/decoding";
import { e } from "../data/encoding";
import { safeBigintToNumber, u8aToHex } from "../data/utils";

type BytesConsumer = any;

// NOTE: est-ce que les matchers devraient être renommés asserters ? par exemple, quoi faire pour assertAccount, etc ?
// NOTE: mieux organiser le fichier
// NOTE: voir pour simplifier les concepts d'assert / matcher:
// - voir si le concept de matcher ne devrait pas être renommé en "Asserter"
// - voir pour simplifier un max les APIs assertAccount, assertVs, m.*
// NOTE: faire en sorte que rares n'ai pas à utiliser hasKvs à cause du storage "ELRONDVM@ASYNC"
// NOTE: ne plus utiliser du tout de assertAccount ou assertVs
// NOTE: s'assurer que si ca matche pas, on a le plus de contexte possible

const fnObjectSymbol = Symbol.for("xsuite.FnObject");
const matcherSymbol = Symbol.for("xsuite.Matcher");

class FnObject {
  __kind = fnObjectSymbol;
  name: string;
  args: any[];

  constructor(name: string, args: any[]) {
    this.name = name;
    this.args = args;
  }
}

const newFnObject = (name: string, args: any[]) => new FnObject(name, args);

const matcherPlugin: NewPlugin = {
  test: (val) => isFnObject(val),
  serialize: (
    { name, args }: FnObject,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: Printer,
  ) => {
    if (++depth > config.maxDepth) {
      return `[${name}]`;
    }
    return (
      `${name}(` +
      printer(args, config, indentation, depth, refs).slice(7, -1) +
      ")"
    );
  },
};

const b64Plugin: NewPlugin = {
  test: (val) => isB64(val),
  serialize: (b64: b64) => b64.toString(),
};

const assertFnObjectsEqual = (...fnObjects: ActualExpected) => {
  assert.deepStrictEqual(
    prettyFormatFnObject(fnObjects[0]),
    prettyFormatFnObject(fnObjects[1]),
  );
};

const prettyFormatFnObject = (fnObject: FnObject) =>
  prettyFormat(fnObject, { plugins: [matcherPlugin, b64Plugin] });

abstract class Matcher {
  __kind = matcherSymbol;

  abstract name: string;

  abstract __fromTop(consumer: BytesConsumer): ActualExpectedArgs;

  abstract __fromNest(consumer: BytesConsumer): ActualExpectedArgs;

  _fromTop(consumer: BytesConsumer): ActualExpected {
    const [actualArgs, expectedArgs] = this.__fromTop(consumer);
    return [
      newFnObject(this.name, actualArgs),
      newFnObject(this.name, expectedArgs),
    ];
  }

  _fromNest(consumer: BytesConsumer): ActualExpected {
    const [actualArgs, expectedArgs] = this.__fromNest(consumer);
    return [
      newFnObject(this.name, actualArgs),
      newFnObject(this.name, expectedArgs),
    ];
  }

  fromTop(bytes: Bytes) {
    const consumer = new BytesConsumer(bytes);
    const actualExpected = this._fromTop(consumer);
    consumer.assertConsumed();
    assertFnObjectsEqual(...actualExpected);
  }

  fromNest(bytes: Bytes) {
    const consumer = new BytesConsumer(bytes);
    const actualExpected = this._fromNest(consumer);
    consumer.assertConsumed();
    assertFnObjectsEqual(...actualExpected);
  }
}

export const isFnObject = (value: unknown): value is FnObject =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === fnObjectSymbol;

export const isMatcher = (value: unknown): value is Matcher =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === matcherSymbol;

const m = {
  Buffer: (bytes: Bytes) => {
    const getActualExpected = (decoded: Uint8Array): ActualExpectedArgs => {
      let actual: Bytes;
      if (typeof bytes === "string") {
        actual = u8aToHex(decoded);
      } else if (bytes instanceof Uint8Array) {
        actual = decoded;
      } else if (isB64(bytes)) {
        actual = u8aToB64(decoded);
      } else {
        throw new Error("Invalid bytes type.");
      }
      return [[actual], [bytes]];
    };
    return newMatcher(
      "Buffer",
      (r) => getActualExpected(d.Buffer()._fromTop(r)),
      (r) => getActualExpected(d.Buffer()._fromNest(r)),
    );
  },
  TopBuffer: (bytes: Bytes) => {
    return newMatcher("TopBuffer", m.Buffer(bytes).__fromTop);
  },
  Str: (string: string) => {
    return newMatcher(
      "Str",
      (r) => [[d.Str()._fromTop(r)], [string]],
      (r) => [[d.Str()._fromNest(r)], [string]],
    );
  },
  TopStr: (string: string) => {
    return newMatcher("TopStr", m.Str(string).__fromTop);
  },
  Addr: (address: string | Uint8Array) => {
    return newMatcher("Addr", (r) => {
      const decoded = d.Addr()._fromTop(r);
      let actual: string | Uint8Array;
      if (isHexAddress(address)) {
        actual = addressToHexAddress(decoded);
      } else if (isBechAddress(address)) {
        actual = decoded;
      } else if (address instanceof Uint8Array) {
        actual = addressToU8AAddress(decoded);
      } else {
        throw new Error("Invalid address type.");
      }
      return [[actual], [address]];
    });
  },
  Bool: (boolean: boolean) => {
    return newMatcher(
      "Bool",
      (r) => [[d.Bool()._fromTop(r)], [boolean]],
      (r) => [[d.Bool()._fromNest(r)], [boolean]],
    );
  },
  U8: (uint: number | bigint) => mUX(uint, 1),
  U16: (uint: number | bigint) => mUX(uint, 2),
  U32: (uint: number | bigint) => mUX(uint, 3),
  Usize: (uint: number | bigint) => m.U32(uint),
  U64: (uint: number | bigint) => mUX(uint, 4),
  U: (uint: number | bigint) => {
    if (uint < 0) {
      throw new Error("Number is negative.");
    }
    return newMatcher(
      "U",
      (r) => getBigintActualExpected(d.U()._fromTop(r), uint),
      (r) => getBigintActualExpected(d.U()._fromNest(r), uint),
    );
  },
  TopU: (uint: number | bigint) => {
    return newMatcher("TopU", m.U(uint).__fromTop);
  },
  I8: (int: number | bigint) => mIX(int, 1),
  I16: (int: number | bigint) => mIX(int, 2),
  I32: (int: number | bigint) => mIX(int, 4),
  Isize: (int: number | bigint) => m.I32(int),
  I64: (int: number | bigint) => mIX(int, 8),
  I: (int: number | bigint) => {
    return newMatcher(
      "I",
      (r) => getBigintActualExpected(d.I()._fromTop(r), int),
      (r) => getBigintActualExpected(d.I()._fromNest(r), int),
    );
  },
  TopI: (int: number | bigint) => {
    return newMatcher("TopI", m.I(int).__fromTop);
  },
  Tuple: (...matchers: Matcher[]) => {
    return newMatcher("Tuple", (r) => {
      const actual: any[] = [];
      const expected: any[] = [];
      for (const matcher of matchers) {
        const [_actual, _expected] = matcher._fromNest(r);
        actual.push(_actual);
        expected.push(_expected);
      }
      return [actual, expected];
    });
  },
  List: (...matchers: Matcher[]) => {
    return newMatcher("List", m.Tuple(...matchers).__fromTop, (r) => {
      if (d.U32()._fromNest(r) !== BigInt(matchers.length)) {
        throw new Error("List not of correct length.");
      }
      return m.Tuple(...matchers).__fromNest(r);
    });
  },
  Option: (optMatcher: Matcher | null) => {
    if (optMatcher === null) {
      return newMatcher(
        "Option",
        (r) => {
          if (r.isConsumed()) {
            return [[null], [null]];
          } else {
            throw new Error("Option not null.");
          }
        },
        (r) => {
          if (r.consumeExact(1)[0] === 0) {
            return [[null], [null]];
          } else {
            throw new Error("Option not null.");
          }
        },
      );
    } else {
      return newMatcher("Option", (r) => {
        if (r.consumeExact(1)[0] === 1) {
          const [_actual, _expected] = optMatcher._fromNest(r);
          return [[_actual], [_expected]];
        } else {
          throw new Error("Option not non-null.");
        }
      });
    }
  },
};

const newMatcher = (
  name: string,
  __fromTop: (consumer: BytesConsumer) => ActualExpectedArgs,
  __fromNest?: (consumer: BytesConsumer) => ActualExpectedArgs,
) => {
  class NewMatcher extends Matcher {
    name = name;
    __fromTop = __fromTop;
    __fromNest = __fromNest ?? __fromTop;
  }
  return new NewMatcher();
};

const mUX = (uint: number | bigint, byteLength: number) => {
  if (uint < 0) {
    throw new Error("Number is negative.");
  }
  if (uint >= 2n ** (8n * BigInt(byteLength))) {
    throw new Error("Number above maximal value allowed.");
  }
  const name = `U${byteLength * 8}`;
  return newMatcher(
    name,
    (r) => getBigintActualExpected(dUX(byteLength)._fromTop(r), uint),
    (r) => getBigintActualExpected(dUX(byteLength)._fromNest(r), uint),
  );
};

const mIX = (int: number | bigint, byteLength: number) => {
  if (int >= 2n ** (8n * BigInt(byteLength) - 1n)) {
    throw new Error("Number above maximal value allowed.");
  }
  if (int < -(2n ** (8n * BigInt(byteLength) - 1n))) {
    throw new Error("Number below minimal value allowed.");
  }
  const name = `I${byteLength * 8}`;
  return newMatcher(
    name,
    (r) => getBigintActualExpected(dIX(byteLength)._fromTop(r), int),
    (r) => getBigintActualExpected(dIX(byteLength)._fromNest(r), int),
  );
};

const getBigintActualExpected = (
  decoded: bigint,
  int: number | bigint,
): ActualExpectedArgs => {
  const actual =
    typeof int === "number" ? safeBigintToNumber(decoded) : decoded;
  return [[actual], [int]];
};

test.only("", () => {
  m.Tuple(
    m.U8(16),
    m.List(m.Str("bonjour"), m.Str("aurevoir")),
    m.Buffer(B64("EREQ")),
    m.Option(m.U8(10)),
  ).fromTop(
    e
      .Tuple(
        e.U8(16),
        e.List(e.Str("bonjour"), e.Str("aurevoir")),
        e.Buffer(B64("EREQ")),
        e.Option(e.U8(10)),
      )
      .toTopHex(),
  );
});

type ActualExpectedArgs = [actual: any[], expected: any[]];

type ActualExpected = [actual: FnObject, expected: FnObject];

/* Design doc for matcher */

type m_vs = (params: VsMatcherParams) => { from: (vs: MatchableVs) => void };
type VsMatcherParams = (BytesLike | Matcher)[];
type MatchableVs = EncodedVs;

type m_kvs = (params: KvsMatcherParams) => {
  from: (kvs: MatchableKvs) => void;
};
type KvsMatcherParams =
  | EncodedKvs
  | CategorizedKvsMatcherParams
  | (
      | KvMatcherParams
      | KvMatcherParams[]
      | EncodedKvs
      | CategorizedKvsMatcherParams
    )[];
type CategorizedKvsMatcherParams = {
  esdts?: EsdtMatcherParams[];
  mappers?: MapperMatcherParams[];
  extraKvs?: ExtraKvsMatcherParams;
};
type EsdtMatcherParams = {
  id: string;
  roles?: Role[];
  lastNonce?: number | bigint;
} & (EsdtVariantMatcherParams | { variants: EsdtVariantMatcherParams[] });
type EsdtVariantMatcherParams = {
  nonce?: number | bigint;
  amount?: number | bigint;
  name?: string;
  creator?: Address;
  royalties?: number;
  hash?: Bytes;
  uris?: string[];
  attrs?: BytesLike | Matcher;
};
type MapperMatcherParams = {
  key: [name: string, ...vars: (Encodable | Matcher)[]];
} & (
  | { value: Encodable | Matcher | null }
  | { unorderedSet: (Encodable | Matcher)[] | null }
  | { set: [index: number | bigint, value: Encodable | Matcher][] | null }
  | {
      map:
        | [
            index: number | bigint,
            key: Encodable | Matcher,
            value: Encodable | Matcher,
          ][]
        | null;
    }
  | { vec: (Encodable | Matcher)[] | null }
  | { user: (Encodable | Matcher)[] | null }
);
type ExtraKvsMatcherParams = KvsMatcherParams;
type KvMatcherParams = [key: Encodable | Matcher, value: Encodable | Matcher];
type MatchableKvs = EncodedKvs;

type m_hasKvs = (params: HasKvsMatcherParams) => {
  from: (kvs: MatchableKvs) => void;
};
type HasKvsMatcherParams = KvsMatcherParams;

type m_account = (params: AccountMatcherParams) => {
  from: (account: MatchableAccount) => void;
};
type AccountMatcherParams = {
  address?: Address;
  nonce?: number | bigint;
  balance?: number | bigint | string;
  code?: string;
  codeMetadata?: CodeMetadata;
  owner?: Address;
  kvs?: KvsMatcherParams;
  hasKvs?: HasKvsMatcherParams;
};
type MatchableAccount = EncodedAccount;

type assertVs = (vs: MatchableVs, vsMatcherParams: VsMatcherParams) => void;

type assertAccount = (
  account: MatchableAccount,
  accountMatcherParams: AccountMatcherParams,
) => void;
