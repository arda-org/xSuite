import { Field, Type } from "protobufjs";
import { Encodable, e } from "../enc";
import { Pair } from "./pairs";

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

export const getEsdtsPairs = (...esdts: Esdt[]): Pair[] => {
  return esdts.flatMap(getEsdtPairs);
};

const getEsdtPairs = ({
  id,
  nonce,
  amount,
  roles,
  lastNonce,
  attrs,
}: Esdt): Pair[] => {
  const pairs: Pair[] = [];
  if (amount !== undefined || attrs !== undefined) {
    pairs.push(getEsdtAmountOrAttributesPair(id, nonce, amount, attrs));
  }
  if (lastNonce !== undefined) {
    pairs.push(getEsdtLastNoncePair(id, lastNonce));
  }
  if (roles !== undefined) {
    pairs.push(getEsdtRolesPair(id, roles));
  }
  return pairs;
};

const getEsdtAmountOrAttributesPair = (
  id: string,
  nonce?: number,
  amount?: bigint,
  attrs?: Encodable
): Pair => {
  let esdtKey = e.Str(`ELRONDesdt${id}`).toTopHex();
  const message: Record<string, any> = {};
  if (amount !== undefined && amount > 0) {
    const hex =
      amount >= 0
        ? "00" + e.U(amount).toTopHex()
        : "01" + e.U(-amount).toTopHex();
    message["Value"] = e.Bytes(hex).toTopBytes();
  }
  if (nonce !== undefined && nonce >= 1) {
    esdtKey += e.U64(nonce).toTopHex();
    message["Type"] = "1";
    if (attrs !== undefined) {
      message["Metadata"] = { Attributes: attrs.toTopBytes() };
    }
  }
  const messageBytes = ESDTSystemMessage.encode(message).finish();
  return [e.Bytes(esdtKey), e.Bytes(messageBytes)];
};

const getEsdtLastNoncePair = (id: string, lastNonce: number): Pair => {
  return [e.Str(`ELRONDnonce${id}`), e.U(lastNonce)];
};

const getEsdtRolesPair = (id: string, roles: string[]): Pair => {
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
