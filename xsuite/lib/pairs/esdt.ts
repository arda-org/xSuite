import { Field, Type } from "protobufjs";
import { Address, Hex, addressToBytes, e, hexToBytes } from "../enc";
import { Kv } from "./pairs";

export type Esdt = {
  id: string;
  nonce?: number;
  amount?: bigint;
  roles?: Role[];
  lastNonce?: number;
  saveNonce?: boolean;
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

export const getEsdtsKvs = (esdts: Esdt[]): Kv[] => {
  return esdts.flatMap(getEsdtKvs);
};

const getEsdtKvs = ({
  id,
  nonce,
  amount,
  roles,
  lastNonce,
  properties,
  saveNonce,
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
    properties !== undefined ||
    saveNonce !== undefined ||
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
      if (nonce < 0) {
        throw new Error("Non-positive nonce.");
      }
      esdtKey += e.U64(nonce).toTopHex();
      message["Type"] = "1";
    }
    if (amount !== undefined) {
      if (amount < 0) {
        throw new Error("Non-positive amount.");
      }
      const bytes = amount > 0 ? e.U(amount).toTopBytes() : [0];
      message["Value"] = new Uint8Array([0, ...bytes]);
    }
    if (properties !== undefined) {
      message["Properties"] = hexToBytes(properties);
    }
    const metadata: [string, any][] = [];
    if (saveNonce && nonce !== undefined) {
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
    if (metadata.length > 0) {
      message["Metadata"] = Object.fromEntries(metadata);
    }
    const messageBytes = ESDTSystemMessage.encode(message).finish();
    kvs.push([e.Bytes(esdtKey), e.Bytes(messageBytes)]);
  }
  if (lastNonce !== undefined) {
    kvs.push([e.Str(`ELRONDnonce${id}`), e.U(lastNonce)]);
  }
  if (roles !== undefined) {
    const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
    kvs.push([e.Str(`ELRONDroleesdt${id}`), e.Bytes(messageBytes)]);
  }
  return kvs;
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
