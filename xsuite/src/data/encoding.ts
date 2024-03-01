import { Field, Type } from "protobufjs";
import { Address, addressToU8AAddress } from "./address";
import { Bytes, bytesToU8A } from "./bytes";
import { BytesLike, bytesLikeToU8A } from "./bytesLike";
import { Kv } from "./kvs";
import { u8aToBase64, u8aToHex } from "./utils";

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
  Addr: (address: string | Uint8Array) => {
    address = addressToU8AAddress(address);
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
      return Uint8Array.from(
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
    return newEncodable(() =>
      Uint8Array.from([1, ...optEncodable.toNestU8A()]),
    );
  },
  kvs: {
    Mapper: (name: string, ...vars: Encodable[]) => {
      const baseKey = e.Tuple(e.TopStr(name), ...vars);
      return {
        Value: (data: Encodable | null) => {
          return eKvsMapperValue(baseKey, data);
        },
        UnorderedSet: (data: Encodable[] | null) => {
          return eKvsMapperUnorderedSet(baseKey, data);
        },
        Set: (data: [index: number | bigint, value: Encodable][] | null) => {
          return eKvsMapperSet(baseKey, data);
        },
        Map: (
          data:
            | [index: number | bigint, key: Encodable, value: Encodable][]
            | null,
        ) => {
          return eKvsMapperMap(baseKey, data);
        },
        Vec: (data: Encodable[] | null) => {
          return eKvsMapperVec(baseKey, data);
        },
        User: (data: Encodable[] | null) => {
          return eKvsMapperUser(baseKey, data);
        },
      };
    },
    Esdts: (esdts: Esdt[]) => {
      return eKvsEsdts(esdts);
    },
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

const eKvsMapperValue = (baseKey: Encodable, value: Encodable | null): Kv[] => {
  return [[baseKey, value ?? ""]];
};

const eKvsMapperUnorderedSet = (
  baseKey: Encodable,
  data: Encodable[] | null,
) => {
  data ??= [];
  return [
    ...eKvsMapperVec(baseKey, data),
    ...data.map(
      (v, i): Kv => [e.Tuple(baseKey, e.TopStr(".index"), v), e.U32(i + 1)],
    ),
  ];
};

const eKvsMapperSet = (
  baseKey: Encodable,
  data: [number | bigint, Encodable][] | null,
): Kv[] => {
  data ??= [];
  data.sort(([a], [b]) => (a <= b ? -1 : 1));
  const kvs: Kv[] = [];
  let maxIndex: number | bigint = 0n;
  for (let i = 0; i < data.length; i++) {
    const [index, v] = data[i];
    if (index <= 0) {
      throw new Error("Negative id not allowed.");
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
  return kvs;
};

const eKvsMapperMap = (
  baseKey: Encodable,
  data: [number | bigint, Encodable, Encodable][] | null,
): Kv[] => {
  data ??= [];
  return [
    ...eKvsMapperSet(
      baseKey,
      data.map(([i, k]) => [i, k]),
    ),
    ...data.map(
      ([, k, v]): Kv => [e.Tuple(baseKey, e.TopStr(".mapped"), k), v],
    ),
  ];
};

const eKvsMapperVec = (baseKey: Encodable, data: Encodable[] | null): Kv[] => {
  data ??= [];
  return [
    ...data.map(
      (v, i): Kv => [e.Tuple(baseKey, e.TopStr(".item"), e.U32(i + 1)), v],
    ),
    [e.Tuple(baseKey, e.TopStr(".len")), e.U32(data.length)],
  ];
};

const eKvsMapperUser = (baseKey: Encodable, data: Encodable[] | null): Kv[] => {
  data ??= [];
  return [
    ...data.flatMap((v, i): Kv[] => [
      [e.Tuple(baseKey, e.TopStr("_id_to_address"), e.U32(i + 1)), v],
      [e.Tuple(baseKey, e.TopStr("_address_to_id"), v), e.U32(i + 1)],
    ]),
    [e.Tuple(baseKey, e.TopStr("_count")), e.U32(data.length)],
  ];
};

const eKvsEsdts = (esdts: Esdt[]) => {
  return esdts.flatMap(eKvsEsdt);
};

const eKvsEsdt = ({
  id,
  nonce,
  amount,
  roles,
  lastNonce,
  name,
  creator,
  royalties,
  hash,
  uris,
  attrs,
}: Esdt): Kv[] => {
  const kvs: Kv[] = [];
  if (
    amount !== undefined ||
    name !== undefined ||
    creator !== undefined ||
    royalties !== undefined ||
    hash !== undefined ||
    uris !== undefined ||
    attrs !== undefined
  ) {
    const keyEncs: Encodable[] = [e.TopStr("ELRONDesdt"), e.TopStr(id)];
    const message: Record<string, any> = {};
    if (nonce !== undefined && nonce !== 0) {
      keyEncs.push(e.TopU(nonce));
    }
    const metadata: [string, any][] = [];
    if (name !== undefined) {
      metadata.push(["Name", e.Str(name).toTopU8A()]);
    }
    if (creator !== undefined) {
      metadata.push(["Creator", addressToU8AAddress(creator)]);
    }
    if (royalties !== undefined) {
      metadata.push(["Royalties", royalties.toString()]);
    }
    if (hash !== undefined) {
      metadata.push(["Hash", bytesLikeToU8A(hash)]);
    }
    if (uris !== undefined) {
      metadata.push(["URIs", uris]);
    }
    if (attrs !== undefined) {
      metadata.push(["Attributes", bytesLikeToU8A(attrs)]);
    }
    if (metadata.length > 0 && nonce) {
      metadata.push(["Nonce", nonce.toString()]);
    }
    if (nonce && (amount || metadata.length > 0)) {
      message["Type"] = "1";
    }
    if (metadata.length > 0) {
      message["Properties"] = new Uint8Array([1]);
    }
    if (metadata.length > 0 || amount) {
      amount ??= 0;
      const bytes = amount > 0 ? e.U(amount).toTopU8A() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    if (metadata.length > 0) {
      message["Metadata"] = Object.fromEntries(metadata);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    kvs.push([e.Tuple(...keyEncs), e.Buffer(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    kvs.push([e.Str(`ELRONDnonce${id}`), e.U(lastNonce)]);
  }
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    kvs.push([e.Str(`ELRONDroleesdt${id}`), e.Buffer(messageBytes)]);
  }
  return kvs;
};

const biguintToU8A = (uint: bigint) => {
  const res: number[] = [];
  while (uint > 0) {
    res.unshift(Number(uint % 256n));
    uint = uint / 256n;
  }
  return Uint8Array.from(res);
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
  return Uint8Array.from([...e.U32(length).toNestU8A(), ...u8a]);
};

const ESDTRolesMessage = new Type("ESDTRoles").add(
  new Field("Roles", 1, "string", "repeated"),
);

const ESDTMetadataMessage = new Type("ESDTMetadata")
  .add(new Field("Nonce", 1, "uint64"))
  .add(new Field("Name", 2, "bytes"))
  .add(new Field("Creator", 3, "bytes"))
  .add(new Field("Royalties", 4, "uint64"))
  .add(new Field("Hash", 5, "bytes"))
  .add(new Field("URIs", 6, "string", "repeated"))
  .add(new Field("Attributes", 7, "bytes"));

const ESDTSystemMessage = new Type("ESDTSystem")
  .add(new Field("Type", 1, "uint64"))
  .add(new Field("Value", 2, "bytes"))
  .add(new Field("Properties", 3, "bytes"))
  .add(new Field("Metadata", 4, "ESDTMetadata"))
  .add(new Field("Reserved", 5, "bytes"))
  .add(ESDTMetadataMessage);

type Esdt = {
  id: string;
  nonce?: number;
  amount?: number | bigint;
  roles?: Role[];
  lastNonce?: number;
  name?: string;
  creator?: Address;
  royalties?: number;
  hash?: BytesLike;
  uris?: string[];
  attrs?: BytesLike;
};

type Role =
  | "ESDTRoleLocalMint"
  | "ESDTRoleLocalBurn"
  | "ESDTTransferRole"
  | "ESDTRoleNFTCreate"
  | "ESDTRoleNFTBurn"
  | "ESDTRoleNFTUpdateAttributes"
  | "ESDTRoleNFTAddURI"
  | "ESDTRoleNFTAddQuantity";
