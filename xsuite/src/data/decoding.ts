import { PreserveDefinedness, Prettify } from "../helpers";
import { Account } from "./account";
import { addressByteLength, u8aAddressToBechAddress } from "./address";
import { addressLikeToHexAddress } from "./addressLike";
import { Bytes, bytesToU8A } from "./bytes";
import {
  CodeProperty,
  e,
  ESDTRolesMessage,
  ESDTSystemMessage,
  Role,
} from "./encoding";
import { Kvs } from "./kvs";
import { hexToU8A, safeBigintToNumber, u8aToBase64, u8aToHex } from "./utils";

type VsDecoderParams = Decoder[];
type DecodableVs = Bytes[];

type KvsDecoderParams = {
  esdts?: EsdtDecoderParams[];
  mappers?: MapperDecoderParams[];
};
type EsdtDecoderParams = {
  id: string;
  nonce?: number | bigint | ((nonce: number) => boolean);
  attrs: Decoder | ((nonce: number) => Decoder);
};
type MapperDecoderParams = {
  key: MapperKeyDecoderParams;
} & (
  | { value: Decoder }
  | { unorderedSet: Decoder }
  | { set: Decoder }
  | { map: [Decoder, Decoder] }
  | { vec: Decoder }
  | { user: true }
);
type MapperKeyDecoderParams = [name: string, ...varDecoders: Decoder[]];
type DecodableKvs = Kvs;
type DecodedKvs = {
  esdts?: DecodedEsdt[];
  mappers?: DecodedMapper[];
  extraKvs?: Kvs;
};
type DecodedEsdt = {
  id: string;
  roles?: Role[];
  lastNonce?: number;
  amount?: bigint;
  variants?: DecodedEsdtVariant[];
};
type DecodedEsdtVariant = {
  nonce: number;
  amount?: bigint;
  attrs?: any;
  creator?: string;
  uris?: string[];
  hash?: string;
  royalties?: number;
  name?: string;
};
type DecodedMapper = { key: DecodedMapperKey } & DecodedMapperData;
type DecodedMapperKey = [name: string, ...vars: any[]];
type DecodedMapperData =
  | { value: any }
  | { unorderedSet: any[] }
  | { set: [index: number, value: any][] }
  | { map: [index: number, key: any, value: any][] }
  | { vec: any[] }
  | { user: any[] };

type AccountDecoderParams = KvsDecoderParams;
type DecodableAccount = Omit<Account, "balance"> & {
  balance?: string | number | bigint;
};
type DecodedAccount = {
  address: string;
  nonce?: number;
  balance?: bigint;
  code?: string;
  codeHash?: string;
  codeMetadata?: CodeProperty[];
  owner?: string;
  kvs?: DecodedKvs;
};

const decoderSymbol = Symbol.for("xsuite.Decoder");

export abstract class Decoder<T = any> {
  __kind = decoderSymbol;

  abstract _fromTop(consumer: BytesConsumer): T;

  abstract _fromNest(consumer: BytesConsumer): T;

  fromTop(bytes: Bytes): T {
    const consumer = new BytesConsumer(bytes);
    const data = this._fromTop(consumer);
    consumer.assertConsumed();
    return data;
  }

  fromNest(bytes: Bytes): T {
    const consumer = new BytesConsumer(bytes);
    const data = this._fromNest(consumer);
    consumer.assertConsumed();
    return data;
  }

  then<U>(f: (x: T) => U): Decoder<U> {
    return newDecoder(
      (consumer) => f(this._fromTop(consumer)),
      (consumer) => f(this._fromNest(consumer)),
    );
  }

  /**
   * @deprecated Use `.fromTop` instead.
   */
  topDecode(bytes: Bytes): T {
    return this.fromTop(bytes);
  }

  /**
   * @deprecated Use `.fromNest` instead.
   */
  nestDecode(bytes: Bytes): T {
    return this.fromNest(bytes);
  }
}

export const isDecoder = (value: unknown): value is Decoder =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === decoderSymbol;

export const d = {
  Buffer: () => {
    const decoder = newDecoder(
      (r) => r.consumeRemaining(),
      (r) => r.consumeExact(decodeLength(r)),
    );
    return Object.assign(decoder, {
      toHex: () => decoder.then(u8aToHex),
      toB64: () => decoder.then(u8aToBase64),
    });
  },
  TopBuffer: () => {
    const decoder = newDecoder(d.Buffer()._fromTop);
    return Object.assign(decoder, {
      toHex: () => decoder.then(u8aToHex),
      toB64: () => decoder.then(u8aToBase64),
    });
  },
  Str: () => {
    return d.Buffer().then((b) => new TextDecoder().decode(b));
  },
  TopStr: () => {
    return newDecoder(d.Str()._fromTop);
  },
  Addr: () => {
    const decoder = newDecoder((r) =>
      u8aAddressToBechAddress(r.consumeExact(addressByteLength)),
    );
    return Object.assign(decoder, {
      toHex() {
        return decoder.then((a) => addressLikeToHexAddress(a));
      },
    });
  },
  Bool: () => d.U8().then(Boolean),
  U8: () => dUX(1),
  U16: () => dUX(2),
  U32: () => dUX(4),
  Usize: () => d.U32(),
  U64: () => dUX(8),
  U: () => {
    const decoder = newDecoder(
      (r) => u8aToBiguint(r.consumeRemaining()),
      (r) => u8aToBiguint(r.consumeExact(decodeLength(r))),
    );
    return Object.assign(decoder, {
      toNum() {
        return decoder.then(safeBigintToNumber);
      },
      toStr() {
        return decoder.then(String);
      },
    });
  },
  TopU: () => {
    return newDecoder(d.U()._fromTop);
  },
  I8: () => dIX(1),
  I16: () => dIX(2),
  I32: () => dIX(4),
  Isize: () => d.I32(),
  I64: () => dIX(8),
  I: () => {
    const decoder = newDecoder(
      (r) => u8aToBigint(r.consumeRemaining()),
      (r) => u8aToBigint(r.consumeExact(decodeLength(r))),
    );
    return Object.assign(decoder, {
      toNum() {
        return decoder.then(safeBigintToNumber);
      },
      toStr() {
        return decoder.then(String);
      },
    });
  },
  TopI: () => {
    return newDecoder(d.I()._fromTop);
  },
  Tuple: <T extends Decoder[] | [Record<string, Decoder>]>(
    ...params: T
  ): T extends Decoder[]
    ? Decoder<DecodersToValues<T>>
    : T extends [Record<string, Decoder>]
    ? Decoder<DecodersToValues<T[0]>>
    : never => {
    if (params.length !== 1 || isDecoder(params[0])) {
      return dTupleList(params as any) as any;
    }
    return dTupleMap(params[0] as any) as any;
  },
  List: <T>(decoder: Decoder<T>) => {
    return newDecoder(
      (r) => {
        const result = [];
        while (!r.isConsumed()) {
          result.push(decoder._fromNest(r));
        }
        return result;
      },
      (r) => {
        const length = decodeLength(r);
        const result = [];
        for (let i = 0; i < length; i++) {
          result.push(decoder._fromNest(r));
        }
        return result;
      },
    );
  },
  Option: <T>(decoder: Decoder<T>) => {
    return newDecoder(
      (r) => {
        if (r.isConsumed()) {
          return null;
        }
        if (r.consumeExact(1)[0] === 1) {
          return decoder._fromNest(r);
        } else {
          throw new Error("Invalid Option top-encoding.");
        }
      },
      (r) => {
        const byte = r.consumeExact(1)[0];
        if (byte === 0) {
          return null;
        } else if (byte === 1) {
          return decoder._fromNest(r);
        } else {
          throw new Error("Invalid Option nest-encoding.");
        }
      },
    );
  },
  vs: <const T extends VsDecoderParams>(params: T) => {
    return {
      from: (vs: DecodableVs): DecodersToValues<T> => {
        if (params.length !== vs.length) {
          throw new Error("Not the same number of values and decoders.");
        }
        const result: any = [];
        for (const [i, v] of vs.entries()) {
          result.push(params[i].fromTop(v));
        }
        return result;
      },
    };
  },
  kvs: (params?: KvsDecoderParams) => {
    return {
      from: (kvs: DecodableKvs): DecodedKvs => {
        const consumer = new KvsConsumer(kvs);
        const esdts = dKvsEsdts(params?.esdts ?? [])._from(consumer);
        const mappers = dKvsMappers(params?.mappers ?? [])._from(consumer);
        const extraKvs = consumer.remainingKvs;
        const decKvs: DecodedKvs = {};
        if (esdts.length > 0) {
          decKvs.esdts = esdts;
        }
        if (mappers.length > 0) {
          decKvs.mappers = mappers;
        }
        if (Object.keys(extraKvs).length > 0) {
          decKvs.extraKvs = extraKvs;
        }
        return decKvs;
      },
    };
  },
  account: (params?: AccountDecoderParams) => {
    return {
      from: <T extends DecodableAccount>(
        account: T,
      ): Prettify<PreserveDefinedness<T, DecodedAccount>> => {
        const decAccount: DecodedAccount = {
          address: account.address,
        };
        if (account.nonce !== undefined) {
          decAccount.nonce = account.nonce;
        }
        if (account.balance !== undefined) {
          decAccount.balance = BigInt(account.balance);
        }
        if (account.code !== undefined) {
          decAccount.code = account.code;
        }
        if (account.codeHash !== undefined) {
          decAccount.codeHash = account.codeHash;
        }
        if (account.codeMetadata !== undefined) {
          decAccount.codeMetadata = dCodeMetadata(account.codeMetadata);
        }
        if (account.kvs !== undefined) {
          decAccount.kvs = d.kvs(params).from(account.kvs);
        }
        if (account.owner !== undefined) {
          decAccount.owner = account.owner;
        }
        return decAccount as PreserveDefinedness<T, DecodedAccount>;
      },
    };
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  Bytes: () => {
    return d.TopBuffer();
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  CstBuffer: () => {
    return d.TopBuffer();
  },
};

const dUX = (byteLength: number) => {
  const decoder = newDecoder((r) => u8aToBiguint(r.consumeAtMost(byteLength)));
  return Object.assign(decoder, {
    toNum: () => decoder.then(safeBigintToNumber),
    toStr: () => decoder.then(String),
  });
};

const dIX = (byteLength: number) => {
  const decoder = newDecoder((r) => u8aToBigint(r.consumeAtMost(byteLength)));
  return Object.assign(decoder, {
    toNum: () => decoder.then(safeBigintToNumber),
    toStr: () => decoder.then(String),
  });
};

const dTupleList = <T extends Decoder[]>(decoders: T) => {
  return newDecoder<DecodersToValues<T>>((r) => {
    const result: any = [];
    for (const decoder of decoders) {
      result.push(decoder._fromNest(r));
    }
    return result;
  });
};

const dTupleMap = <T extends Record<string, Decoder>>(decoders: T) => {
  return newDecoder<DecodersToValues<T>>((r) => {
    const result: any = {};
    for (const key in decoders) {
      result[key] = decoders[key]._fromNest(r);
    }
    return result;
  });
};

const dKvsMappers = (
  params: MapperDecoderParams[],
): KvsDecoder<DecodedMapper[]> => ({
  _from: (consumer) => {
    const decMappers: DecodedMapper[] = [];
    for (const { key, ...rest } of params) {
      if (Object.keys(rest).length !== 1) {
        throw new Error("More than one mapper defined.");
      }
      const newDecMappers =
        "value" in rest
          ? dKvsMapperValue(key, rest.value)._from(consumer)
          : "unorderedSet" in rest
          ? dKvsMapperUnorderedSet(key, rest.unorderedSet)._from(consumer)
          : "set" in rest
          ? dKvsMapperSet(key, rest.set)._from(consumer)
          : "map" in rest
          ? dKvsMapperMap(key, ...rest.map)._from(consumer)
          : "vec" in rest
          ? dKvsMapperVec(key, rest.vec)._from(consumer)
          : "user" in rest
          ? dKvsMapperUser(key)._from(consumer)
          : [];
      decMappers.push(...newDecMappers);
    }
    return decMappers;
  },
});

const dKvsMapperValue = <T>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  valueDecoder: Decoder<T>,
) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperValueSeparators,
    (separatedKvs) => ({ value: getMapperValue(separatedKvs, valueDecoder) }),
  );

const dKvsMapperVec = <T>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  valueDecoder: Decoder<T>,
) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperVecSeparators,
    (separatedKvs) => ({ vec: getMapperVec(separatedKvs, valueDecoder) }),
  );

const dKvsMapperUnorderedSet = <T>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  valueDecoder: Decoder<T>,
) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperUnorderedSetSeparators,
    (separatedKvs) => ({
      unorderedSet: getMapperUnorderedSet(separatedKvs, valueDecoder),
    }),
  );

const dKvsMapperSet = <T>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  valueDecoder: Decoder<T>,
) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperSetSeparators,
    (separatedKvs: SeparatedKvs) => ({
      set: getMapperSet(separatedKvs, valueDecoder),
    }),
  );

const dKvsMapperMap = <U, V>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  keyDecoder: Decoder<U>,
  valueDecoder: Decoder<V>,
) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperMapSeparators,
    (separatedKvs: SeparatedKvs) => ({
      map: getMapperMap(separatedKvs, keyDecoder, valueDecoder),
    }),
  );

const dKvsMapperUser = (mapperKeyDecoderParams: MapperKeyDecoderParams) =>
  newMapperKvsDecoder(
    mapperKeyDecoderParams,
    mapperUserSeparators,
    (separatedKvs: SeparatedKvs) => ({ user: getMapperUser(separatedKvs) }),
  );

const dKvsEsdts = (params: EsdtDecoderParams[]): KvsDecoder<DecodedEsdt[]> => ({
  _from: (consumer) => {
    const data: Record<string, Omit<DecodedEsdt, "id">> = {};
    for (const k in consumer.remainingKvs) {
      const decK = d.Str().fromTop(k);
      if (decK.startsWith("ELRONDnonce")) {
        const id = decK.slice("ELRONDnonce".length);
        if (data[id] === undefined) {
          data[id] = {};
        }
        data[id].lastNonce = d.U32().toNum().fromTop(consumer.consumeV(k));
      }
      if (decK.startsWith("ELRONDroleesdt")) {
        const id = decK.slice("ELRONDroleesdt".length);
        if (data[id] === undefined) {
          data[id] = {};
        }
        const message = ESDTRolesMessage.decode(
          d.Buffer().fromTop(consumer.consumeV(k)),
        );
        const object = ESDTRolesMessage.toObject(message);
        if (object?.Roles !== undefined) {
          data[id].roles = object.Roles;
        }
      }
      if (decK.startsWith("ELRONDesdt")) {
        const [p1, p2] = decK.slice("ELRONDesdt".length).split("-");
        const id = p1 + "-" + p2.slice(0, 6);
        if (data[id] === undefined) {
          data[id] = {};
        }
        const message = ESDTSystemMessage.decode(
          d.Buffer().fromTop(consumer.consumeV(k)),
        );
        const object = ESDTSystemMessage.toObject(message);
        const encNonce = k.slice(("ELRONDesdt".length + id.length) * 2);
        const nonce = d.U().toNum().fromTop(encNonce);
        const amount = d.U().fromTop(object.Value);
        if (nonce === 0) {
          if (amount > 0) {
            data[id].amount = amount;
          }
        } else {
          const variant: DecodedEsdtVariant = { nonce };
          if (amount > 0) {
            variant.amount = amount;
          }
          if (object?.Metadata?.Attributes !== undefined) {
            let attrsDecoder: Decoder | undefined;
            for (const { id: _id, nonce: _nonce, attrs } of params) {
              if (_id !== id) {
                continue;
              }
              if (
                _nonce !== undefined &&
                ((typeof _nonce === "function" && !_nonce(nonce)) ||
                  (typeof _nonce !== "function" && _nonce != nonce))
              ) {
                continue;
              }
              attrsDecoder = typeof attrs === "function" ? attrs(nonce) : attrs;
            }
            if (attrsDecoder !== undefined) {
              variant.attrs = attrsDecoder.fromTop(object.Metadata.Attributes);
            } else {
              variant.attrs = u8aToHex(object.Metadata.Attributes);
            }
          }
          if (object?.Metadata?.Creator !== undefined) {
            variant.creator = d.Addr().fromTop(object.Metadata.Creator);
          }
          if (object?.Metadata?.Name !== undefined) {
            variant.name = d.Str().fromTop(object.Metadata.Name);
          }
          if (object?.Metadata?.Hash !== undefined) {
            variant.hash = u8aToHex(object.Metadata.Hash);
          }
          if (
            object?.Metadata?.URIs !== undefined &&
            (object.Metadata.URIs.length !== 1 ||
              object.Metadata.URIs[0] !== "")
          ) {
            variant.uris = object.Metadata.URIs;
          }
          if (object?.Metadata?.Royalties) {
            const royalties = parseInt(object.Metadata.Royalties, 10);
            if (royalties > 0) {
              variant.royalties = royalties;
            }
          }
          const variants = data[id].variants ?? [];
          variants.push(variant);
          data[id].variants = variants;
        }
      }
    }
    return Object.entries(data).map(([id, v]) => ({ id, ...v }));
  },
});

const dCodeMetadata = (codeMetadata: string): CodeProperty[] => {
  const u8a = hexToU8A(codeMetadata);
  const byte0 = u8a[0];
  const byte1 = u8a[1];
  const codeProperties: CodeProperty[] = [];
  if (byte0 & 1) {
    codeProperties.push("upgradeable");
  }
  if (byte0 & 4) {
    codeProperties.push("readable");
  }
  if (byte1 & 2) {
    codeProperties.push("payable");
  }
  if (byte1 & 4) {
    codeProperties.push("payableBySc");
  }
  return codeProperties;
};

const newDecoder = <T>(
  _fromTop: (consumer: BytesConsumer) => T,
  _fromNest?: (consumer: BytesConsumer) => T,
): Decoder<T> => {
  class NewDecoder extends Decoder<T> {
    _fromTop = _fromTop;
    _fromNest = _fromNest ?? _fromTop;
  }
  return new NewDecoder();
};

class BytesConsumer {
  #u8a: Uint8Array;
  #offset: number;

  constructor(bytes: Bytes, offset = 0) {
    this.#u8a = bytesToU8A(bytes);
    if (offset < 0 || offset > this.#u8a.length) {
      throw new Error("Invalid offset.");
    }
    this.#offset = offset;
  }

  consumeExact(size: number): Uint8Array {
    if (size > this.remainingLength()) {
      throw new Error("No enough byte to read.");
    }
    const result = this.#u8a.slice(this.#offset, this.#offset + size);
    this.#offset += size;
    return result;
  }

  consumeAtMost(size: number): Uint8Array {
    return this.consumeExact(Math.min(size, this.remainingLength()));
  }

  consumeRemaining(): Uint8Array {
    return this.consumeExact(this.remainingLength());
  }

  consumed() {
    return this.#u8a.slice(0, this.#offset);
  }

  isConsumed(): boolean {
    return this.#offset === this.#u8a.byteLength;
  }

  assertConsumed() {
    if (!this.isConsumed()) {
      throw new Error("Not all bytes have been read.");
    }
  }

  remaining() {
    return this.#u8a.slice(this.#offset);
  }

  remainingLength() {
    return this.#u8a.byteLength - this.#offset;
  }

  clone() {
    return new BytesConsumer(this.#u8a, this.#offset);
  }
}

const decodeLength = (consumer: BytesConsumer) => {
  return Number(d.U32()._fromNest(consumer));
};

const u8aToBiguint = (u8a: Uint8Array): bigint => {
  let value = 0n;
  for (const byte of u8a) {
    value = BigInt(value) * 256n + BigInt(byte);
  }
  return value;
};

const u8aToBigint = (u8a: Uint8Array): bigint => {
  if (u8a.byteLength === 0) {
    return 0n;
  }
  let u = u8aToBiguint(u8a);
  if (u >= 2n ** (8n * BigInt(u8a.byteLength)) / 2n) {
    u -= 2n ** (8n * BigInt(u8a.byteLength));
  }
  return u;
};

const newMapperKvsDecoder = <T extends DecodedMapperData>(
  mapperKeyDecoderParams: MapperKeyDecoderParams,
  separators: KvsSeparator[],
  getDecodedMapperData: (separatedKvs: SeparatedKvs) => T,
): KvsDecoder<Prettify<{ key: DecodedMapperKey } & T>[]> => ({
  _from: (consumer) => {
    const decMapperKeys: Record<string, DecodedMapperKey> = {};
    const mappersSeparatedKvs = new Map<string, SeparatedKvs>();

    const set4 = (
      encMapperKey: string,
      separator: string,
      subKey: string,
      value: string,
    ) => {
      const map1 = mappersSeparatedKvs.get(encMapperKey) ?? new SeparatedKvs();
      const map2 = map1.get(separator) ?? new Map();
      map2.set(subKey, value);
      map1.set(separator, map2);
      mappersSeparatedKvs.set(encMapperKey, map1);
    };

    for (const k in consumer.remainingKvs) {
      const cons = new BytesConsumer(k);
      const decMapperKey = consumeSegments(cons, mapperKeyDecoderParams);
      if (decMapperKey === undefined) continue;
      const encMapperKey = u8aToHex(cons.consumed());
      for (const [sepName, sepKeyed] of separators) {
        const cons2 = cons.clone();
        if (sepKeyed) {
          const rest = consumeSegments(cons2, [sepName, d.TopBuffer().toHex()]);
          if (rest !== undefined && cons2.isConsumed()) {
            const [, subKey] = rest;
            decMapperKeys[encMapperKey] = decMapperKey;
            set4(encMapperKey, sepName, subKey, consumer.consumeV(k));
            continue;
          }
        } else {
          const rest = consumeSegments(cons2, [sepName]);
          if (rest !== undefined && cons2.isConsumed()) {
            decMapperKeys[encMapperKey] = decMapperKey;
            set4(encMapperKey, sepName, emptySubKey, consumer.consumeV(k));
            continue;
          }
        }
      }
    }
    const mappers: ({ key: DecodedMapperKey } & T)[] = [];
    for (const [encMapperKey, separatedKvs] of mappersSeparatedKvs.entries()) {
      const decMapperKey = decMapperKeys[encMapperKey];
      try {
        const data = getDecodedMapperData(separatedKvs);
        mappers.push({ key: decMapperKey, ...data });
      } catch (error: unknown) {
        if (error instanceof DecodeMapperDataError) {
          throw new Error(`Mapper ${decMapperKey}: ${error.message}`);
        } else {
          throw error;
        }
      }
    }
    return mappers;
  },
});

class KvsConsumer {
  remainingKvs: Kvs;

  constructor(kvs: Kvs) {
    this.remainingKvs = { ...kvs };
  }

  consumeV(k: string) {
    if (!(k in this.remainingKvs)) {
      throw new Error("Key not found.");
    }
    const v = this.remainingKvs[k];
    delete this.remainingKvs[k];
    return v;
  }
}

class SeparatedKvs extends Map<string, Map<string, string>> {
  getSeparatorKvs(separator: string) {
    const map = this.get(separator);
    if (map === undefined) {
      throw new Error("separator not found.");
    }
    return map;
  }

  getSeparatorValue(separator: string, subKey: string = emptySubKey) {
    const map = this.getSeparatorKvs(separator);
    const value = map.get(subKey);
    if (value === undefined) {
      throw new Error("subKey not found.");
    }
    return value;
  }
}

const emptySubKey = "";

const consumeSegments = <const T extends readonly (string | Decoder)[]>(
  consumer: BytesConsumer,
  segs: T,
):
  | { [P in keyof T]: T[P] extends Decoder<infer U> ? U : string }
  | undefined => {
  const decSegs: any = [];
  for (const seg of segs) {
    if (typeof seg === "string") {
      const segHex = e.Str(seg).toTopHex();
      try {
        const nextHex = u8aToHex(consumer.consumeExact(seg.length));
        if (segHex !== nextHex) return;
        decSegs.push(seg);
      } catch {
        return;
      }
    } else {
      try {
        decSegs.push(seg._fromNest(consumer));
      } catch {
        return;
      }
    }
  }
  return decSegs;
};

class DecodeMapperDataError extends Error {}

const mapperValueSeparators: KvsSeparator[] = [["", false]];
const getMapperValue = <T>(
  separatedKvs: SeparatedKvs,
  valueDecoder: Decoder<T>,
) => {
  const v = separatedKvs.getSeparatorValue("");
  return valueDecoder.fromTop(v);
};

const mapperVecSeparators: KvsSeparator[] = [
  [".len", false],
  [".item", true],
];
const getMapperVec = <T>(
  separatedKvs: SeparatedKvs,
  valueDecoder: Decoder<T>,
) => {
  const len = d.U32().toNum().fromTop(separatedKvs.getSeparatorValue(".len"));
  const vec: T[] = new Array(len);
  const itemMap = separatedKvs.getSeparatorKvs(".item");
  if (itemMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of itemMap.");
  }
  for (const [encIndex, encValue] of itemMap.entries()) {
    const index = d.U32().toNum().fromNest(encIndex);
    vec[index - 1] = valueDecoder.fromTop(encValue);
  }
  return vec;
};

const mapperUnorderedSetSeparators: KvsSeparator[] = [
  ...mapperVecSeparators,
  [".index", true],
];
const getMapperUnorderedSet = <T>(
  separatedKvs: SeparatedKvs,
  valueDecoder: Decoder<T>,
) => {
  const unorderedSet = getMapperVec(separatedKvs, valueDecoder);
  const indexMap = separatedKvs.getSeparatorKvs(".index");
  if (indexMap.size !== unorderedSet.length) {
    throw new DecodeMapperDataError("Invalid size of indexMap.");
  }
  return unorderedSet;
};

const mapperSetSeparators: KvsSeparator[] = [
  [".info", false],
  [".value", true],
  [".node_id", true],
  [".node_links", true],
];
const getMapperSet = <T>(
  separatedKvs: SeparatedKvs,
  valueDecoder: Decoder<T>,
) => {
  const [len] = d
    .Tuple(d.U32().toNum(), d.TopBuffer())
    .fromTop(separatedKvs.getSeparatorValue(".info"));
  const set: [number, T][] = [];
  const valueMap = separatedKvs.getSeparatorKvs(".value");
  if (valueMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of valueMap.");
  }
  const nodeIdMap = separatedKvs.getSeparatorKvs(".node_id");
  if (nodeIdMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of nodeIdMap.");
  }
  const nodeLinksMap = separatedKvs.getSeparatorKvs(".node_links");
  if (nodeLinksMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of nodeLinksMap.");
  }
  for (const [encIndex, encValue] of valueMap.entries()) {
    const index = d.U32().toNum().fromNest(encIndex);
    set.push([index, valueDecoder.fromTop(encValue)]);
  }
  return set;
};

const mapperMapSeparators: KvsSeparator[] = [
  [".info", false],
  [".value", true],
  [".node_id", true],
  [".node_links", true],
  [".mapped", true],
];
const getMapperMap = <U, V>(
  separatedKvs: SeparatedKvs,
  keyDecoder: Decoder<U>,
  valueDecoder: Decoder<V>,
) => {
  const [len] = d
    .Tuple(d.U32().toNum(), d.TopBuffer())
    .fromTop(separatedKvs.getSeparatorValue(".info"));
  const valueMap = separatedKvs.getSeparatorKvs(".value");
  if (valueMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of valueMap.");
  }
  const nodeIdMap = separatedKvs.getSeparatorKvs(".node_id");
  if (nodeIdMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of nodeIdMap.");
  }
  const nodeLinksMap = separatedKvs.getSeparatorKvs(".node_links");
  if (nodeLinksMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of nodeLinksMap.");
  }
  const mappedMap = separatedKvs.getSeparatorKvs(".mapped");
  if (mappedMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of mappedMap.");
  }
  const map: [number, U, V][] = [];
  for (const [encKey, encValue] of mappedMap.entries()) {
    const encIndex = nodeIdMap.get(encKey);
    if (encIndex === undefined) {
      throw new DecodeMapperDataError("Index not found.");
    }
    map.push([
      d.U32().toNum().fromTop(encIndex),
      keyDecoder.fromNest(encKey),
      valueDecoder.fromTop(encValue),
    ]);
  }
  return map;
};

const mapperUserSeparators: KvsSeparator[] = [
  ["_count", false],
  ["_id_to_address", true],
  ["_address_to_id", true],
];
const getMapperUser = (separatedKvs: SeparatedKvs) => {
  const len = d.U32().toNum().fromTop(separatedKvs.getSeparatorValue("_count"));
  const user: string[] = new Array(len);
  const idToAddressMap = separatedKvs.getSeparatorKvs("_id_to_address");
  if (idToAddressMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of idToAddressMap.");
  }
  const addressToIdMap = separatedKvs.getSeparatorKvs("_address_to_id");
  if (addressToIdMap.size !== len) {
    throw new DecodeMapperDataError("Invalid size of addressToIdMap.");
  }
  for (const [encIndex, encValue] of idToAddressMap.entries()) {
    const index = d.U32().toNum().fromNest(encIndex);
    user[index - 1] = d.Addr().fromTop(encValue);
  }
  return user;
};

type DecodersToValues<T> = Prettify<{
  -readonly [K in keyof T]: T[K] extends Decoder<infer U> ? U : never;
}>;

type KvsDecoder<T> = { _from: (consumer: KvsConsumer) => T };

type KvsSeparator = [value: string, keyed: boolean];
