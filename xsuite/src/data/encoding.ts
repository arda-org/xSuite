import { Field, Type } from "protobufjs";
import { AddressEncodable } from "./AddressEncodable";
import { BufferEncodable } from "./BufferEncodable";
import { BytesEncodable } from "./BytesEncodable";
import { Encodable } from "./Encodable";
import { IntEncodable } from "./IntEncodable";
import { ListEncodable } from "./ListEncodable";
import { OptionEncodable } from "./OptionEncodable";
import { TupleEncodable } from "./TupleEncodable";
import { UintEncodable } from "./UintEncodable";
import { Address, addressToAddressEncodable } from "./address";
import { Hex, broadHexToBytes } from "./broadHex";
import { Kv } from "./kvs";
import { narrowBytes } from "./utils";

function Buffer(
  bytes: string | number[] | Uint8Array,
  encoding?: "hex",
): BufferEncodable;
function Buffer(bytes: string, encoding: "b64"): BufferEncodable;
function Buffer(
  bytes: string | number[] | Uint8Array,
  encoding?: "hex" | "b64",
): BufferEncodable {
  return new BufferEncodable(narrowBytes(bytes, encoding));
}

function TopBuffer(
  bytes: string | number[] | Uint8Array,
  encoding?: "hex",
): BytesEncodable;
function TopBuffer(bytes: string, encoding: "b64"): BytesEncodable;
function TopBuffer(
  bytes: string | number[] | Uint8Array,
  encoding?: "hex" | "b64",
): BytesEncodable {
  return new BytesEncodable(narrowBytes(bytes, encoding));
}

export const e = {
  Buffer,
  TopBuffer,
  Str: (string: string) => {
    return e.Buffer(new TextEncoder().encode(string));
  },
  TopStr: (string: string) => {
    return new BytesEncodable(e.Str(string).toTopBytes());
  },
  Addr: (address: string | Uint8Array) => {
    return new AddressEncodable(address);
  },
  Bool: (boolean: boolean) => {
    return e.U8(Number(boolean));
  },
  U8: (uint: number | bigint) => {
    return new UintEncodable(uint, 1);
  },
  U16: (uint: number | bigint) => {
    return new UintEncodable(uint, 2);
  },
  U32: (uint: number | bigint) => {
    return new UintEncodable(uint, 4);
  },
  Usize: (uint: number | bigint) => {
    return new UintEncodable(uint, 4);
  },
  U64: (uint: number | bigint) => {
    return new UintEncodable(uint, 8);
  },
  U: (uint: number | bigint) => {
    return new UintEncodable(uint);
  },
  TopU: (uint: number | bigint) => {
    return e.TopBuffer(e.U(uint).toTopBytes());
  },
  I8: (int: number | bigint) => {
    return new IntEncodable(int, 1);
  },
  I16: (int: number | bigint) => {
    return new IntEncodable(int, 2);
  },
  I32: (int: number | bigint) => {
    return new IntEncodable(int, 4);
  },
  Isize: (int: number | bigint) => {
    return new IntEncodable(int, 4);
  },
  I64: (int: number | bigint) => {
    return new IntEncodable(int, 8);
  },
  I: (int: number | bigint) => {
    return new IntEncodable(int);
  },
  TopI: (int: number | bigint) => {
    return e.TopBuffer(e.I(int).toTopBytes());
  },
  Tuple: (...values: Encodable[]) => {
    return new TupleEncodable(values);
  },
  ListN: (...values: Encodable[]) => {
    return new TupleEncodable(values);
  },
  List: (...values: Encodable[]) => {
    return new ListEncodable(values);
  },
  Option: (optValue: Encodable | null) => {
    return new OptionEncodable(optValue);
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  Bytes: (bytes: string | number[] | Uint8Array) => {
    return e.TopBuffer(bytes);
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  CstBuffer: (bytes: string | number[] | Uint8Array) => {
    return e.TopBuffer(bytes);
  },
  /**
   * @deprecated Use `.TopStr` instead.
   */
  CstStr: (string: string) => {
    return e.TopStr(string);
  },
  kvs: {
    Mapper: (name: string, ...keys: Encodable[]) => {
      const baseKey = e.Tuple(e.TopStr(name), ...keys);
      return {
        Value: (data: Encodable | null) => {
          return getValueMapperKvs(baseKey, data);
        },
        UnorderedSet: (data: Encodable[] | null) => {
          return getUnorderedSetMapperKvs(baseKey, data);
        },
        Set: (data: [index: number | bigint, value: Encodable][] | null) => {
          return getSetMapperKvs(baseKey, data);
        },
        Map: (
          data:
            | [index: number | bigint, key: Encodable, value: Encodable][]
            | null,
        ) => {
          return getMapMapperKvs(baseKey, data);
        },
        Vec: (data: Encodable[] | null) => {
          return getVecMapperKvs(baseKey, data);
        },
        User: (data: Encodable[] | null) => {
          return getUserMapperKvs(baseKey, data);
        },
      };
    },
    Esdts: (esdts: Esdt[]) => {
      return getEsdtsKvs(esdts);
    },
  },
};

const getValueMapperKvs = (
  baseKey: Encodable,
  value: Encodable | null,
): Kv[] => {
  return [[baseKey, value ?? ""]];
};

const getUnorderedSetMapperKvs = (
  baseKey: Encodable,
  data: Encodable[] | null,
) => {
  data ??= [];
  return [
    ...getVecMapperKvs(baseKey, data),
    ...data.map(
      (v, i): Kv => [e.Tuple(baseKey, e.TopStr(".index"), v), e.U32(i + 1)],
    ),
  ];
};

const getSetMapperKvs = (
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

const getMapMapperKvs = (
  baseKey: Encodable,
  data: [number | bigint, Encodable, Encodable][] | null,
): Kv[] => {
  data ??= [];
  return [
    ...getSetMapperKvs(
      baseKey,
      data.map(([i, k]) => [i, k]),
    ),
    ...data.map(
      ([, k, v]): Kv => [e.Tuple(baseKey, e.TopStr(".mapped"), k), v],
    ),
  ];
};

const getVecMapperKvs = (
  baseKey: Encodable,
  data: Encodable[] | null,
): Kv[] => {
  data ??= [];
  return [
    ...data.map(
      (v, i): Kv => [e.Tuple(baseKey, e.TopStr(".item"), e.U32(i + 1)), v],
    ),
    [e.Tuple(baseKey, e.TopStr(".len")), e.U32(data.length)],
  ];
};

const getUserMapperKvs = (
  baseKey: Encodable,
  data: Encodable[] | null,
): Kv[] => {
  data ??= [];
  return [
    ...data.flatMap((v, i): Kv[] => [
      [e.Tuple(baseKey, e.TopStr("_id_to_address"), e.U32(i + 1)), v],
      [e.Tuple(baseKey, e.TopStr("_address_to_id"), v), e.U32(i + 1)],
    ]),
    [e.Tuple(baseKey, e.TopStr("_count")), e.U32(data.length)],
  ];
};

const getEsdtsKvs = (esdts: Esdt[]) => {
  return esdts.flatMap(getEsdtKvs);
};

const getEsdtKvs = ({
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
      metadata.push(["Name", e.Str(name).toTopBytes()]);
    }
    if (creator !== undefined) {
      metadata.push([
        "Creator",
        addressToAddressEncodable(creator).toTopBytes(),
      ]);
    }
    if (royalties !== undefined) {
      metadata.push(["Royalties", royalties.toString()]);
    }
    if (hash !== undefined) {
      metadata.push(["Hash", broadHexToBytes(hash)]);
    }
    if (uris !== undefined) {
      metadata.push(["URIs", uris]);
    }
    if (attrs !== undefined) {
      metadata.push(["Attributes", broadHexToBytes(attrs)]);
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
      const bytes = amount > 0 ? e.U(amount).toTopBytes() : [0];
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
  hash?: Hex;
  uris?: string[];
  attrs?: Hex;
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
