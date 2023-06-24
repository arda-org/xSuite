import { Field, Type } from "protobufjs";
import { Encodable, e } from "../enc";
import { Kv } from "./pairs";

export type Esdt = {
  id: string;
  nonce?: number;
  amount?: bigint;
  roles?: Role[];
  lastNonce?: number;
  attrs?: Encodable;
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
  attrs,
}: Esdt): Kv[] => {
  const kvs: Kv[] = [];
  if (amount !== undefined || attrs !== undefined) {
    kvs.push(getEsdtAmountOrAttributesKv(id, nonce, amount, attrs));
  }
  if (lastNonce !== undefined) {
    kvs.push(getEsdtLastNonceKv(id, lastNonce));
  }
  if (roles !== undefined) {
    kvs.push(getEsdtRolesKv(id, roles));
  }
  return kvs;
};

const getEsdtAmountOrAttributesKv = (
  id: string,
  nonce?: number,
  amount?: bigint,
  attrs?: Encodable
): Kv => {
  let esdtKey = e.Str(`ELRONDesdt${id}`).toTopHex();
  const message: Record<string, any> = {};
  if (amount !== undefined) {
    if (amount <= 0) {
      throw new Error("Negative amount.");
    }
    message["Value"] = new Uint8Array([0, ...e.U(amount).toTopBytes()]);
  }
  if (nonce !== undefined && nonce !== 0) {
    if (nonce < 0) {
      throw new Error("Negative nonce.");
    }
    esdtKey += e.U64(nonce).toTopHex();
    message["Type"] = "1";
    if (attrs !== undefined) {
      message["Metadata"] = { Attributes: attrs.toTopBytes() };
    }
  }
  const messageBytes = ESDTSystemMessage.encode(message).finish();
  return [e.Bytes(esdtKey), e.Bytes(messageBytes)];
};

const getEsdtLastNonceKv = (id: string, lastNonce: number): Kv => {
  return [e.Str(`ELRONDnonce${id}`), e.U(lastNonce)];
};

const getEsdtRolesKv = (id: string, roles: string[]): Kv => {
  const messageBytes = ESDTRolesMessage.encode({ Roles: roles }).finish();
  return [e.Str(`ELRONDroleesdt${id}`), e.Bytes(messageBytes)];
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
