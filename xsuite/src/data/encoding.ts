import { Field, Type } from "protobufjs";
import { PreserveDefinedness, Prettify } from "../helpers";
import { Account } from "./account";
import { Address } from "./address";
import {
  AddressLike,
  addressLikeToU8A,
  addressLikeToBech,
} from "./addressLike";
import { Bytes, bytesToU8A } from "./bytes";
import {
  BytesLike,
  bytesLikeToHex,
  bytesLikeToU8A,
  isBytesLike,
} from "./bytesLike";
import { Kvs } from "./kvs";
import { safeBigintToNumber, u8aToBase64, u8aToHex } from "./utils";
import { Vs } from "./vs";

export type EncodableVs = Vs | BytesLike[];

export type EncodableKvs =
  | Kvs
  | EncodableCategorizedKvs
  | (EncodableKv | EncodableKvs)[];
type EncodableCategorizedKvs = {
  esdts?: EncodableEsdt[];
  mappers?: EncodableMapper[];
  extraKvs?: EncodableKvs;
};
export type EncodableEsdt = {
  id: string;
  roles?: Role[];
  lastNonce?: number | bigint;
} & (
  | { amount?: number | bigint }
  | EncodableEsdtVariant
  | { variants: EncodableEsdtVariant[] }
);
type EncodableEsdtVariant = {
  nonce: number | bigint;
  amount?: number | bigint;
  name?: string;
  creator?: AddressLike;
  royalties?: number;
  hash?: Bytes;
  attrs?: BytesLike;
  uris?: string[];
};
export type EncodableMapper = { key: EncodableMapperKey } & (
  | { value: Encodable | null }
  | { unorderedSet: Encodable[] | null }
  | { set: [index: number | bigint, value: Encodable][] | null }
  | { map: [index: number | bigint, key: Encodable, value: Encodable][] | null }
  | { vec: Encodable[] | null }
  | { user: Encodable[] | null }
);
type EncodableMapperKey = string | EncodableMapperKeyArgs;
type EncodableMapperKeyArgs = [name: string, ...vars: Encodable[]];
type EncodableKv = [key: BytesLike, value: BytesLike];

export type EncodableAccount = {
  address: AddressLike;
  nonce?: number | bigint;
  balance?: number | bigint | string;
  code?: string;
  codeHash?: string;
  codeMetadata?: EncodableCodeMetadata;
  owner?: AddressLike;
  kvs?: EncodableKvs;
};
export type EncodableCodeMetadata = BytesLike | CodeProperty[];
export type CodeProperty =
  | "upgradeable"
  | "readable"
  | "payable"
  | "payableBySc";

const encodableSymbol = "xsuite.Encodable";

export abstract class Encodable {
  __kind = encodableSymbol;

  abstract toTopU8A(): Uint8Array;

  abstract toNestU8A(): Uint8Array;

  toTopHex(): string {
    return u8aToHex(this.toTopU8A());
  }

  toNestHex(): string {
    return u8aToHex(this.toNestU8A());
  }

  toTopB64(): string {
    return u8aToBase64(this.toTopU8A());
  }

  toNestB64(): string {
    return u8aToBase64(this.toNestU8A());
  }

  /**
   * @deprecated Use `.toTopU8A` instead.
   */
  toTopBytes(): Uint8Array {
    return this.toTopU8A();
  }

  /**
   * @deprecated Use `.toNestU8A` instead.
   */
  toNestBytes(): Uint8Array {
    return this.toNestU8A();
  }
}

export const isEncodable = (value: unknown): value is Encodable =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === encodableSymbol;

export const e = {
  Buffer: (bytes: Bytes) => {
    const u8a = bytesToU8A(bytes);
    const toTop = () => u8a;
    const toNest = () => prependLength(u8a);
    return newEncodable(toTop, toNest);
  },
  TopBuffer: (bytes: Bytes) => {
    return newEncodable(e.Buffer(bytes).toTopU8A);
  },
  Str: (string: string) => {
    return e.Buffer(new TextEncoder().encode(string));
  },
  TopStr: (string: string) => {
    return newEncodable(e.Str(string).toTopU8A);
  },
  Addr: (address: Address) => {
    address = addressLikeToU8A(address);
    return newEncodable(() => address);
  },
  Bool: (boolean: boolean) => e.U8(Number(boolean)),
  U8: (uint: number | bigint) => eUX(uint, 1),
  U16: (uint: number | bigint) => eUX(uint, 2),
  U32: (uint: number | bigint) => eUX(uint, 4),
  Usize: (uint: number | bigint) => e.U32(uint),
  U64: (uint: number | bigint) => eUX(uint, 8),
  U: (uint: number | bigint) => {
    if (typeof uint === "number") {
      uint = BigInt(uint);
    }
    if (uint < 0) {
      throw new Error("Number is negative.");
    }
    const toTop = () => biguintToU8A(uint);
    const toNest = () => prependLength(toTop());
    return newEncodable(toTop, toNest);
  },
  TopU: (uint: number | bigint) => {
    return newEncodable(e.U(uint).toTopU8A);
  },
  I8: (int: number | bigint) => eIX(int, 1),
  I16: (int: number | bigint) => eIX(int, 2),
  I32: (int: number | bigint) => eIX(int, 4),
  Isize: (int: number | bigint) => e.I32(int),
  I64: (int: number | bigint) => eIX(int, 8),
  I: (int: number | bigint) => {
    if (typeof int === "number") {
      int = BigInt(int);
    }
    const toTop = () => bigintToU8A(int);
    const toNest = () => prependLength(toTop());
    return newEncodable(toTop, toNest);
  },
  TopI: (int: number | bigint) => {
    return newEncodable(e.I(int).toTopU8A);
  },
  Tuple: (...encodables: Encodable[]) => {
    return newEncodable(() => {
      return new Uint8Array(
        encodables.flatMap((e) => Array.from(e.toNestU8A())),
      );
    });
  },
  List: (...encodables: Encodable[]) => {
    const toTop = e.Tuple(...encodables).toTopU8A;
    const toNest = (): Uint8Array => {
      return prependLength(toTop(), encodables.length);
    };
    return newEncodable(toTop, toNest);
  },
  Option: (optEncodable: Encodable | null) => {
    if (optEncodable === null) {
      return newEncodable(
        () => new Uint8Array([]),
        () => new Uint8Array([0]),
      );
    }
    return newEncodable(() => new Uint8Array([1, ...optEncodable.toNestU8A()]));
  },
  MapperKey: (...args: EncodableMapperKeyArgs) => {
    const [name, ...vars] = args;
    return e.Tuple(e.TopStr(name), ...vars);
  },
  EsdtKey: (id: string, nonce?: number | bigint) =>
    nonce
      ? e.Tuple(e.TopStr(`ELRONDesdt${id}`), e.TopU(nonce))
      : e.TopStr(`ELRONDesdt${id}`),
  EsdtRolesKey: (id: string) => e.TopStr(`ELRONDroleesdt${id}`),
  EsdtLastNonceKey: (id: string) => e.TopStr(`ELRONDnonce${id}`),
  vs: (encodableVs: EncodableVs): Vs => {
    return encodableVs.map(bytesLikeToHex);
  },
  kvs: Object.assign(
    (encodableKvs: EncodableKvs) => filterKvs(eKvsUnfiltered(encodableKvs)),
    {
      Mapper: (...args: EncodableMapperKeyArgs) => ({
        Value: curryEKvsMapper(eKvsMapperValue)(args),
        UnorderedSet: curryEKvsMapper(eKvsMapperUnorderedSet)(args),
        Set: curryEKvsMapper(eKvsMapperSet)(args),
        Map: curryEKvsMapper(eKvsMapperMap)(args),
        Vec: curryEKvsMapper(eKvsMapperVec)(args),
        User: curryEKvsMapper(eKvsMapperUser)(args),
      }),
      Esdts: (esdts: EncodableEsdt[]) => eKvsEsdts(esdts),
    },
  ),
  account: <T extends EncodableAccount>(encodableAccount: T) => {
    const account = eAccountUnfiltered(encodableAccount);
    if (account.kvs !== undefined) {
      account.kvs = filterKvs(account.kvs);
    }
    return account;
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  Bytes: (bytes: Bytes) => e.TopBuffer(bytes),
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  CstBuffer: (bytes: Bytes) => e.TopBuffer(bytes),
  /**
   * @deprecated Use `.TopStr` instead.
   */
  CstStr: (string: string) => e.TopStr(string),
};

const eUX = (uint: number | bigint, byteLength: number) => {
  if (typeof uint === "number") {
    uint = BigInt(uint);
  }
  if (uint < 0) {
    throw new Error("Number is negative.");
  }
  if (uint >= 2n ** (8n * BigInt(byteLength))) {
    throw new Error("Number above maximal value allowed.");
  }
  const toTop = () => biguintToU8A(uint);
  const toNest = () => {
    const b = toTop();
    const nB = new Uint8Array(byteLength);
    nB.set(b, byteLength - b.byteLength);
    return nB;
  };
  return newEncodable(toTop, toNest);
};

const eIX = (int: number | bigint, byteLength: number) => {
  if (typeof int === "number") {
    int = BigInt(int);
  }
  if (int >= 2n ** (8n * BigInt(byteLength) - 1n)) {
    throw new Error("Number above maximal value allowed.");
  }
  if (int < -(2n ** (8n * BigInt(byteLength) - 1n))) {
    throw new Error("Number below minimal value allowed.");
  }
  const toTop = () => bigintToU8A(int);
  const toNest = () => complementOfTwo(int, byteLength);
  return newEncodable(toTop, toNest);
};

export const eKvsUnfiltered = (kvs: EncodableKvs): Kvs => {
  if (Array.isArray(kvs)) {
    let encodedKvs: Kvs = {};
    for (const kv of kvs) {
      if (isEncodableKv(kv)) {
        const [k, v] = kv;
        encodedKvs[bytesLikeToHex(k)] = bytesLikeToHex(v);
      } else {
        encodedKvs = { ...encodedKvs, ...eKvsUnfiltered(kv) };
      }
    }
    return encodedKvs;
  } else if (isEncodableCategorizedKvs(kvs)) {
    return {
      ...(kvs.esdts ? e.kvs.Esdts(kvs.esdts) : {}),
      ...(kvs.mappers ? eKvsMappers(kvs.mappers) : {}),
      ...(kvs.extraKvs ? eKvsUnfiltered(kvs.extraKvs) : {}),
    };
  } else {
    return kvs;
  }
};

const filterKvs = (unfilteredKvs: Kvs): Kvs => {
  const kvs = { ...unfilteredKvs };
  for (const k in kvs) if (kvs[k] === "") delete kvs[k];
  return kvs;
};

const eKvsMappers = (mappers: EncodableMapper[]): Kvs => {
  let kvs: Kvs = {};
  for (const { key, ...rest } of mappers) {
    if (Object.keys(rest).length !== 1) {
      throw new Error("More than one mapper defined.");
    }
    const args: EncodableMapperKeyArgs = typeof key === "string" ? [key] : key;
    const newKvs =
      "value" in rest
        ? e.kvs.Mapper(...args).Value(rest.value)
        : "vec" in rest
        ? e.kvs.Mapper(...args).Vec(rest.vec)
        : "unorderedSet" in rest
        ? e.kvs.Mapper(...args).UnorderedSet(rest.unorderedSet)
        : "set" in rest
        ? e.kvs.Mapper(...args).Set(rest.set)
        : "map" in rest
        ? e.kvs.Mapper(...args).Map(rest.map)
        : "user" in rest
        ? e.kvs.Mapper(...args).User(rest.user)
        : {};
    kvs = { ...kvs, ...newKvs };
  }
  return kvs;
};

const eKvsMapperValue = (baseKey: Encodable, value: Encodable | null): Kvs => {
  return eKvsUnfiltered([[baseKey, value ?? ""]]);
};

const eKvsMapperVec = (baseKey: Encodable, data: Encodable[] | null): Kvs => {
  data ??= [];
  return eKvsUnfiltered([
    ...data.map(
      (v, i): EncodableKv => [
        e.Tuple(baseKey, e.TopStr(".item"), e.U32(i + 1)),
        v,
      ],
    ),
    [e.Tuple(baseKey, e.TopStr(".len")), e.U32(data.length)],
  ]);
};

const eKvsMapperUnorderedSet = (
  baseKey: Encodable,
  data: Encodable[] | null,
): Kvs => {
  data ??= [];
  return {
    ...eKvsMapperVec(baseKey, data),
    ...eKvsUnfiltered(
      data.map(
        (v, i): EncodableKv => [
          e.Tuple(baseKey, e.TopStr(".index"), v),
          e.U32(i + 1),
        ],
      ),
    ),
  };
};

const eKvsMapperSet = (
  baseKey: Encodable,
  data: [number | bigint, Encodable][] | null,
): Kvs => {
  data ??= [];
  data.sort(([a], [b]) => (a <= b ? -1 : 1));
  const kvs: EncodableKv[] = [];
  let maxIndex: number | bigint = 0n;
  for (let i = 0; i < data.length; i++) {
    const [index, v] = data[i];
    if (index <= 0) {
      throw new Error("Non-positive id not allowed.");
    }
    kvs.push([e.Tuple(baseKey, e.TopStr(".node_id"), v), e.U32(index)]);
    kvs.push([e.Tuple(baseKey, e.TopStr(".value"), e.U32(index)), v]);
    const prevI = i === 0 ? 0n : data[i - 1][0];
    const nextI = i === data.length - 1 ? 0n : data[i + 1][0];
    kvs.push([
      e.Tuple(baseKey, e.TopStr(".node_links"), e.U32(index)),
      e.Tuple(e.U32(prevI), e.U32(nextI)),
    ]);
    if (index >= maxIndex) {
      maxIndex = index;
    }
  }
  kvs.push([
    e.Tuple(baseKey, e.TopStr(".info")),
    data.length > 0
      ? e.Tuple(
          e.U32(data.length),
          e.U32(data[0][0]),
          e.U32(data[data.length - 1][0]),
          e.U32(maxIndex),
        )
      : "",
  ]);
  return eKvsUnfiltered(kvs);
};

const eKvsMapperMap = (
  baseKey: Encodable,
  data: [number | bigint, Encodable, Encodable][] | null,
): Kvs => {
  data ??= [];
  return {
    ...eKvsMapperSet(
      baseKey,
      data.map(([i, k]) => [i, k]),
    ),
    ...eKvsUnfiltered(
      data.map(
        ([, k, v]): EncodableKv => [
          e.Tuple(baseKey, e.TopStr(".mapped"), k),
          v,
        ],
      ),
    ),
  };
};

const eKvsMapperUser = (baseKey: Encodable, data: Encodable[] | null): Kvs => {
  data ??= [];
  return eKvsUnfiltered([
    ...data.flatMap((v, i): EncodableKv[] => [
      [e.Tuple(baseKey, e.TopStr("_id_to_address"), e.U32(i + 1)), v],
      [e.Tuple(baseKey, e.TopStr("_address_to_id"), v), e.U32(i + 1)],
    ]),
    [e.Tuple(baseKey, e.TopStr("_count")), e.U32(data.length)],
  ]);
};

const eKvsEsdts = (esdts: EncodableEsdt[]) => {
  let kvs: Kvs = {};
  for (const esdt of esdts) {
    kvs = { ...kvs, ...eKvsEsdt(esdt) };
  }
  return kvs;
};

const eKvsEsdt = ({ id, roles, lastNonce, ...rest }: EncodableEsdt): Kvs => {
  const kvs: EncodableKv[] = [];
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    kvs.push([e.EsdtRolesKey(id), e.Buffer(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    kvs.push([e.EsdtLastNonceKey(id), e.U(lastNonce)]);
  }
  let variants: EncodableEsdtVariant[];
  if ("variants" in rest) {
    variants = rest.variants;
  } else if ("nonce" in rest) {
    variants = [rest];
  } else if ("amount" in rest) {
    variants = [{ nonce: 0, ...rest }];
  } else {
    variants = [];
  }
  for (const { nonce, amount, ...rest } of variants) {
    const message: Record<string, any> = {};
    const metadata: [string, any][] = [];
    if (nonce) {
      const { name, creator, royalties, hash, attrs, uris } = rest;
      if (name !== undefined && name.length > 0) {
        metadata.push(["Name", e.Str(name).toTopU8A()]);
      }
      if (creator !== undefined) {
        metadata.push(["Creator", addressLikeToU8A(creator)]);
      }
      if (royalties !== undefined && royalties > 0) {
        metadata.push(["Royalties", royalties.toString()]);
      }
      if (hash !== undefined) {
        const u8a = bytesLikeToU8A(hash);
        if (u8a.length > 0) {
          metadata.push(["Hash", u8a]);
        }
      }
      if (attrs !== undefined) {
        const u8a = bytesLikeToU8A(attrs);
        if (u8a.length > 0) {
          metadata.push(["Attributes", u8a]);
        }
      }
      if (metadata.length > 0 || uris !== undefined) {
        const _uris = uris === undefined || uris.length === 0 ? [""] : uris;
        metadata.push(["URIs", _uris]);
      }
      if (metadata.length > 0 || amount) {
        message["Type"] = "1";
      }
      if (metadata.length > 0) {
        metadata.push(["Nonce", nonce.toString()]);
        message["Metadata"] = Object.fromEntries(metadata);
        message["Reserved"] = new Uint8Array([1]);
      }
    } else {
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) {
          throw new Error(`${k} is not undefined.`);
        }
      }
    }
    if (metadata.length > 0 || amount) {
      const _amount = amount ?? 0;
      const bytes = _amount > 0 ? e.U(_amount).toTopU8A() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    kvs.push([e.EsdtKey(id, nonce), messageBytes]);
  }
  return eKvsUnfiltered(kvs);
};

export const eCodeMetadata = (codeMetadata: EncodableCodeMetadata): string => {
  if (isBytesLike(codeMetadata)) {
    return bytesLikeToHex(codeMetadata);
  }
  const bytes: number[] = [];
  let byte0 = 0;
  if (codeMetadata.includes("upgradeable")) {
    byte0 |= 1;
  }
  if (codeMetadata.includes("readable")) {
    byte0 |= 4;
  }
  let byte1 = 0;
  if (codeMetadata.includes("payable")) {
    byte1 |= 2;
  }
  if (codeMetadata.includes("payableBySc")) {
    byte1 |= 4;
  }
  if (byte0 > 0 || byte1 > 0) {
    bytes.push(byte0, byte1);
  }
  return e.Buffer(new Uint8Array(bytes)).toTopHex();
};

export const eAccountUnfiltered = <T extends EncodableAccount>(
  encodableAccount: T,
): Prettify<PreserveDefinedness<T, Account>> => {
  const account: Account = {
    address: addressLikeToBech(encodableAccount.address),
  };
  if (encodableAccount.nonce !== undefined) {
    account.nonce = safeBigintToNumber(BigInt(encodableAccount.nonce));
  }
  if (encodableAccount.balance !== undefined) {
    account.balance = encodableAccount.balance.toString();
  }
  if (encodableAccount.code !== undefined) {
    account.code = encodableAccount.code;
  }
  if (encodableAccount.codeHash !== undefined) {
    account.codeHash = encodableAccount.codeHash;
  }
  if (encodableAccount.codeMetadata !== undefined) {
    account.codeMetadata = eCodeMetadata(encodableAccount.codeMetadata);
  }
  if (encodableAccount.kvs !== undefined) {
    account.kvs = eKvsUnfiltered(encodableAccount.kvs);
  }
  if (encodableAccount.owner !== undefined) {
    account.owner = addressLikeToBech(encodableAccount.owner);
  }
  return account as PreserveDefinedness<T, Account>;
};

const newEncodable = (
  toTop: () => Uint8Array,
  toNest?: () => Uint8Array,
): Encodable => {
  class NewEncodable extends Encodable {
    toTopU8A = toTop;
    toNestU8A = toNest ?? toTop;
  }
  return new NewEncodable();
};

function curryEKvsMapper<T2, R>(fn: (baseKey: Encodable, data: T2) => R) {
  return function ([name, ...vars]: EncodableMapperKeyArgs): (data: T2) => R {
    return function (data: T2): R {
      return fn(e.MapperKey(name, ...vars), data);
    };
  };
}

const isEncodableKv = (value: unknown): value is EncodableKv =>
  Array.isArray(value) &&
  value.length === 2 &&
  isBytesLike(value[0]) &&
  isBytesLike(value[1]);

const isEncodableCategorizedKvs = (
  value: unknown,
): value is EncodableCategorizedKvs =>
  !!value &&
  typeof value === "object" &&
  Object.entries(value).every(
    ([k, v]) =>
      ["esdts", "mappers", "extraKvs"].includes(k) && typeof v !== "string",
  );

const biguintToU8A = (uint: bigint) => {
  const res: number[] = [];
  while (uint > 0) {
    res.unshift(Number(uint % 256n));
    uint = uint / 256n;
  }
  return new Uint8Array(res);
};

const bigintToU8A = (int: bigint) => {
  return complementOfTwo(int, getUnambiguousNumBytes(int));
};

const complementOfTwo = (n: bigint, numBytes: number) => {
  let u = n;
  if (u < 0) {
    u += 2n ** (8n * BigInt(numBytes));
  }
  return eUX(u, numBytes).toNestU8A();
};

const getUnambiguousNumBytes = (n: bigint): number => {
  if (n === 0n) {
    return 0;
  }
  if (n < 0n) {
    n = -n - 1n;
  }
  let bytes = 1;
  while (n >= 128n) {
    n >>= 8n;
    bytes++;
  }
  return bytes;
};

const prependLength = (u8a: Uint8Array, length?: number) => {
  length = length ?? u8a.byteLength;
  return new Uint8Array([...e.U32(length).toNestU8A(), ...u8a]);
};

export const ESDTRolesMessage = new Type("ESDTRoles").add(
  new Field("Roles", 1, "string", "repeated"),
);

export const ESDTSystemMessage = new Type("ESDTSystem")
  .add(new Field("Type", 1, "uint64"))
  .add(new Field("Value", 2, "bytes"))
  .add(new Field("Properties", 3, "bytes"))
  .add(new Field("Metadata", 4, "ESDTMetadata"))
  .add(new Field("Reserved", 5, "bytes"))
  .add(
    new Type("ESDTMetadata")
      .add(new Field("Nonce", 1, "uint64"))
      .add(new Field("Name", 2, "bytes"))
      .add(new Field("Creator", 3, "bytes"))
      .add(new Field("Royalties", 4, "uint64"))
      .add(new Field("Hash", 5, "bytes"))
      .add(new Field("URIs", 6, "string", "repeated"))
      .add(new Field("Attributes", 7, "bytes")),
  );

export type Role =
  | "ESDTRoleLocalMint"
  | "ESDTRoleLocalBurn"
  | "ESDTTransferRole"
  | "ESDTRoleNFTCreate"
  | "ESDTRoleNFTBurn"
  | "ESDTRoleNFTUpdateAttributes"
  | "ESDTRoleNFTAddURI"
  | "ESDTRoleNFTAddQuantity";
