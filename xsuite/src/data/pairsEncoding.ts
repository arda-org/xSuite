import { Field, Type } from "protobufjs";
import { Encodable } from "./Encodable";
import { Address, addressToBytes } from "./address";
import { e } from "./encoding";
import { hexToEncodable, Hex, hexToBytes } from "./hex";
import { Pair } from "./pairs";

export const p = {
  SingleValueMapper: (baseKey: string, map: Pair[]) => {
    return getSingleValueMapperPairs(baseKey, map);
  },
  SetMapper: (
    baseKey: string,
    map: [index: number | bigint, value: Encodable][]
  ) => {
    return getSetMapperPairs(baseKey, map);
  },
  MapMapper: (
    baseKey: string,
    map: [index: number | bigint, key: Encodable, value: Encodable][]
  ) => {
    return getMapMapperPairs(baseKey, map);
  },
  VecMapper: (baseKey: string, vec: Encodable[]) => {
    return getVecMapperPairs(baseKey, vec);
  },
  Esdts: (esdts: Esdt[]) => {
    return getEsdtsPairs(esdts);
  },
};

const getSingleValueMapperPairs = (baseKey: string, map: Pair[]): Pair[] => {
  const baseKeyEnc = e.Bytes(e.Str(baseKey).toTopBytes());
  return map.map(([k, v]) => [e.List(baseKeyEnc, hexToEncodable(k)), v]);
};

const getSetMapperPairs = (
  baseKey: string,
  map: [number | bigint, Encodable][]
): Pair[] => {
  if (map.length === 0) return [];
  map.sort(([a], [b]) => (a <= b ? -1 : 1));
  const indexPairs: Pair[] = [];
  const valuePairs: Pair[] = [];
  const linksPairs: Pair[] = [];
  let maxIndex: number | bigint = 0n;
  for (let i = 0; i < map.length; i++) {
    const [index, v] = map[i];
    if (index <= 0) {
      throw new Error("Negative id not allowed.");
    }
    indexPairs.push([v, e.U32(index)]);
    valuePairs.push([e.U32(index), v]);
    const prevI = i === 0 ? 0n : map[i - 1][0];
    const nextI = i === map.length - 1 ? 0n : map[i + 1][0];
    linksPairs.push([e.U32(index), e.Tuple(e.U32(prevI), e.U32(nextI))]);
    if (index >= maxIndex) {
      maxIndex = index;
    }
  }
  const firstI = map[0][0];
  const lastI = map[map.length - 1][0];
  return [
    [
      e.Str(baseKey + ".info"),
      e.Tuple(e.U32(map.length), e.U32(firstI), e.U32(lastI), e.U32(maxIndex)),
    ],
    ...getSingleValueMapperPairs(baseKey + ".node_id", indexPairs),
    ...getSingleValueMapperPairs(baseKey + ".value", valuePairs),
    ...getSingleValueMapperPairs(baseKey + ".node_links", linksPairs),
  ];
};

const getMapMapperPairs = (
  baseKey: string,
  map: [number | bigint, Encodable, Encodable][]
): Pair[] => {
  return [
    ...getSetMapperPairs(
      baseKey,
      map.map(([i, k]) => [i, k])
    ),
    ...getSingleValueMapperPairs(
      baseKey + ".mapped",
      map.map(([, k, v]) => [k, v])
    ),
  ];
};

const getVecMapperPairs = (baseKey: string, map: Encodable[]): Pair[] => {
  if (map.length === 0) return [];
  return [
    ...getSingleValueMapperPairs(
      baseKey + ".item",
      map.map((v, i) => [e.U32(BigInt(i + 1)), v])
    ),
    [e.Str(baseKey + ".len"), e.U32(BigInt(map.length))],
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
    let esdtKey = e.Str(`ELRONDesdt${id}`).toTopHex();
    const message: Record<string, any> = {};
    if (nonce !== undefined && nonce !== 0) {
      esdtKey += e.U64(nonce).toTopHex();
    }
    const metadata: [string, any][] = [];
    if (metadataNonce && nonce !== undefined) {
      metadata.push(["Nonce", nonce.toString()]);
    }
    if (name !== undefined) {
      metadata.push(["Name", e.Str(name).toTopBytes()]);
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
    if (amount !== undefined && (amount !== 0n || metadata.length > 0)) {
      if (nonce !== undefined && nonce !== 0) {
        message["Type"] = "1";
      }
      if (properties !== undefined) {
        message["Properties"] = hexToBytes(properties);
      }
      const bytes = amount > 0 ? e.U(amount).toTopBytes() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    if (metadata.length > 0) {
      message["Metadata"] = Object.fromEntries(metadata);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    pairs.push([e.Bytes(esdtKey), e.Bytes(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    pairs.push([e.Str(`ELRONDnonce${id}`), e.U(lastNonce)]);
  }
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    pairs.push([e.Str(`ELRONDroleesdt${id}`), e.Bytes(messageBytes)]);
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

export type Esdt = {
  id: string;
  nonce?: number;
  amount?: bigint;
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
