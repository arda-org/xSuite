import { Field, Type } from "protobufjs";
import { Encodable } from "./Encodable";
import { Address, addressToAddressEncodable } from "./address";
import { enc } from "./encoding";
import { hexToEncodable, Hex, hexToBytes } from "./hex";
import { Kv } from "./kvs";

export const kvsEnc = {
  Mapper: (name: string, ...keys: Encodable[]) => {
    const baseKey = enc.Tuple(enc.CstStr(name), ...keys);
    return {
      Value: (data: Hex | null) => {
        return getValueMapperKvs(baseKey, data);
      },
      UnorderedSet: (data: Hex[] | null) => {
        return getUnorderedSetMapperKvs(baseKey, data);
      },
      Set: (data: [index: number | bigint, value: Hex][] | null) => {
        return getSetMapperKvs(baseKey, data);
      },
      Map: (
        data: [index: number | bigint, key: Encodable, value: Hex][] | null,
      ) => {
        return getMapMapperKvs(baseKey, data);
      },
      Vec: (data: Hex[] | null) => {
        return getVecMapperKvs(baseKey, data);
      },
    };
  },
  Esdts: (esdts: Esdt[]) => {
    return getEsdtsKvs(esdts);
  },
};

const getValueMapperKvs = (baseKey: Encodable, value: Hex | null): Kv[] => {
  return [[baseKey, value ?? ""]];
};

const getUnorderedSetMapperKvs = (baseKey: Encodable, data: Hex[] | null) => {
  data ??= [];
  return [
    ...getVecMapperKvs(baseKey, data),
    ...data.map(
      (v, i): Kv => [
        enc.Tuple(baseKey, enc.CstStr(".index"), hexToEncodable(v)),
        enc.U32(i + 1),
      ],
    ),
  ];
};

const getSetMapperKvs = (
  baseKey: Encodable,
  data: [number | bigint, Hex][] | null,
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
    kvs.push([
      enc.Tuple(baseKey, enc.CstStr(".node_id"), hexToEncodable(v)),
      enc.U32(index),
    ]);
    kvs.push([enc.Tuple(baseKey, enc.CstStr(".value"), enc.U32(index)), v]);
    const prevI = i === 0 ? 0n : data[i - 1][0];
    const nextI = i === data.length - 1 ? 0n : data[i + 1][0];
    kvs.push([
      enc.Tuple(baseKey, enc.CstStr(".node_links"), enc.U32(index)),
      enc.Tuple(enc.U32(prevI), enc.U32(nextI)),
    ]);
    if (index >= maxIndex) {
      maxIndex = index;
    }
  }
  kvs.push([
    enc.Tuple(baseKey, enc.CstStr(".info")),
    data.length > 0
      ? enc.Tuple(
          enc.U32(data.length),
          enc.U32(data[0][0]),
          enc.U32(data[data.length - 1][0]),
          enc.U32(maxIndex),
        )
      : "",
  ]);
  return kvs;
};

const getMapMapperKvs = (
  baseKey: Encodable,
  data: [number | bigint, Encodable, Hex][] | null,
): Kv[] => {
  data ??= [];
  return [
    ...getSetMapperKvs(
      baseKey,
      data.map(([i, k]) => [i, k]),
    ),
    ...data.map(
      ([, k, v]): Kv => [enc.Tuple(baseKey, enc.CstStr(".mapped"), k), v],
    ),
  ];
};

const getVecMapperKvs = (baseKey: Encodable, data: Hex[] | null): Kv[] => {
  data ??= [];
  return [
    ...data.map(
      (v, i): Kv => [
        enc.Tuple(baseKey, enc.CstStr(".item"), enc.U32(i + 1)),
        v,
      ],
    ),
    [
      enc.Tuple(baseKey, enc.CstStr(".len")),
      data.length > 0 ? enc.U32(BigInt(data.length)) : "",
    ],
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
    let esdtKey = enc.Str(`ELRONDesdt${id}`).toTopHex();
    const message: Record<string, any> = {};
    if (nonce !== undefined && nonce !== 0) {
      esdtKey += enc.U64(nonce).toTopHex();
    }
    const metadata: [string, any][] = [];
    if (name !== undefined) {
      metadata.push(["Name", enc.Str(name).toTopBytes()]);
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
      metadata.push(["Hash", hexToBytes(hash)]);
    }
    if (uris !== undefined) {
      metadata.push(["URIs", uris]);
    }
    if (attrs !== undefined) {
      metadata.push(["Attributes", hexToBytes(attrs)]);
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
      const bytes = amount > 0 ? enc.U(amount).toTopBytes() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    if (metadata.length > 0) {
      message["Metadata"] = Object.fromEntries(metadata);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    kvs.push([enc.Bytes(esdtKey), enc.Bytes(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    kvs.push([enc.Str(`ELRONDnonce${id}`), enc.U(lastNonce)]);
  }
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    kvs.push([enc.Str(`ELRONDroleesdt${id}`), enc.Bytes(messageBytes)]);
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
