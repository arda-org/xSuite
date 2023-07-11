import { Field, Type } from "protobufjs";
import { Encodable } from "./Encodable";
import { Address, addressToBytes } from "./address";
import { enc } from "./encoding";
import { hexToEncodable, Hex, hexToBytes } from "./hex";
import { Pair } from "./pairs";

export const pEnc = {
  Mapper: (name: string, ...keys: Encodable[]) => {
    const baseKey = enc.Tuple(enc.CstStr(name), ...keys);
    return {
      Value: (data: Hex | null) => {
        return getValueMapperPairs(baseKey, data);
      },
      Set: (data: [index: number | bigint, value: Hex][] | null) => {
        return getSetMapperPairs(baseKey, data);
      },
      Map: (
        data: [index: number | bigint, key: Encodable, value: Hex][] | null
      ) => {
        return getMapMapperPairs(baseKey, data);
      },
      Vec: (data: Hex[] | null) => {
        return getVecMapperPairs(baseKey, data);
      },
    };
  },
  Esdts: (esdts: Esdt[]) => {
    return getEsdtsPairs(esdts);
  },
};

const getValueMapperPairs = (baseKey: Encodable, data: Hex | null): Pair[] => {
  return [[baseKey, data ?? ""]];
};

const getSetMapperPairs = (
  baseKey: Encodable,
  data: [number | bigint, Hex][] | null
): Pair[] => {
  data ??= [];
  data.sort(([a], [b]) => (a <= b ? -1 : 1));
  const pairs: Pair[] = [];
  let maxIndex: number | bigint = 0n;
  for (let i = 0; i < data.length; i++) {
    const [index, v] = data[i];
    if (index <= 0) {
      throw new Error("Negative id not allowed.");
    }
    pairs.push([
      enc.Tuple(baseKey, enc.CstStr(".node_id"), hexToEncodable(v)),
      enc.U32(index),
    ]);
    pairs.push([enc.Tuple(baseKey, enc.CstStr(".value"), enc.U32(index)), v]);
    const prevI = i === 0 ? 0n : data[i - 1][0];
    const nextI = i === data.length - 1 ? 0n : data[i + 1][0];
    pairs.push([
      enc.Tuple(baseKey, enc.CstStr(".node_links"), enc.U32(index)),
      enc.Tuple(enc.U32(prevI), enc.U32(nextI)),
    ]);
    if (index >= maxIndex) {
      maxIndex = index;
    }
  }
  pairs.push([
    enc.Tuple(baseKey, enc.CstStr(".info")),
    data.length > 0
      ? enc.Tuple(
          enc.U32(data.length),
          enc.U32(data[0][0]),
          enc.U32(data[data.length - 1][0]),
          enc.U32(maxIndex)
        )
      : "",
  ]);
  return pairs;
};

const getMapMapperPairs = (
  baseKey: Encodable,
  data: [number | bigint, Encodable, Hex][] | null
): Pair[] => {
  data ??= [];
  return [
    ...getSetMapperPairs(
      baseKey,
      data.map(([i, k]) => [i, k])
    ),
    ...data.map(
      ([, k, v]): Pair => [enc.Tuple(baseKey, enc.CstStr(".mapped"), k), v]
    ),
  ];
};

const getVecMapperPairs = (baseKey: Encodable, data: Hex[] | null): Pair[] => {
  data ??= [];
  return [
    ...data.map(
      (v, i): Pair => [
        enc.Tuple(baseKey, enc.CstStr(".item"), enc.U32(i + 1)),
        v,
      ]
    ),
    [
      enc.Tuple(baseKey, enc.CstStr(".len")),
      data.length > 0 ? enc.U32(BigInt(data.length)) : "",
    ],
  ];
};

const getEsdtsPairs = (esdts: Esdt[]) => {
  return esdts.flatMap(getEsdtPairs);
};

const getEsdtPairs = ({
  id,
  nonce,
  amount,
  roles,
  lastNonce,
  properties,
  metadataNonce,
  name,
  creator,
  royalties,
  hash,
  uris,
  attrs,
}: Esdt): Pair[] => {
  const pairs: Pair[] = [];
  if (
    amount !== undefined ||
    properties !== undefined ||
    metadataNonce !== undefined ||
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
    if (metadataNonce && nonce !== undefined) {
      metadata.push(["Nonce", nonce.toString()]);
    }
    if (name !== undefined) {
      metadata.push(["Name", enc.Str(name).toTopBytes()]);
    }
    if (creator !== undefined) {
      metadata.push(["Creator", addressToBytes(creator)]);
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
    if (amount !== undefined && (amount != 0 || metadata.length > 0)) {
      if (nonce !== undefined && nonce !== 0) {
        message["Type"] = "1";
      }
      if (properties !== undefined) {
        message["Properties"] = hexToBytes(properties);
      }
      const bytes = amount > 0 ? enc.U(amount).toTopBytes() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    if (metadata.length > 0) {
      message["Metadata"] = Object.fromEntries(metadata);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    pairs.push([enc.Bytes(esdtKey), enc.Bytes(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    pairs.push([enc.Str(`ELRONDnonce${id}`), enc.U(lastNonce)]);
  }
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    pairs.push([enc.Str(`ELRONDroleesdt${id}`), enc.Bytes(messageBytes)]);
  }
  return pairs;
};

const ESDTRolesMessage = new Type("ESDTRoles").add(
  new Field("Roles", 1, "string", "repeated")
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
  metadataNonce?: boolean;
  properties?: Hex;
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
