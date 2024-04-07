import { bech32 } from "bech32";
import { isEncodable, Encodable } from "./encoding";
import { hexToU8A, u8aToHex } from "./utils";

export type Address = string | Uint8Array | Encodable;

export const isHexAddress = (value: unknown): value is string =>
  typeof value === "string" && value.length === 2 * addressByteLength;

export const isBechAddress = (value: unknown): value is string =>
  typeof value === "string" && bech32.decodeUnsafe(value)?.prefix === HRP;

export const addressToU8AAddress = (address: Address): Uint8Array => {
  if (address === "") return new Uint8Array();
  if (isEncodable(address)) {
    address = address.toTopU8A();
  } else if (isHexAddress(address)) {
    address = hexToU8A(address);
  } else if (isBechAddress(address)) {
    const { words } = bech32.decode(address);
    address = Uint8Array.from(bech32.fromWords(words));
  } else if (typeof address === "string") {
    throw new Error("Invalid address format.");
  }
  if (address.byteLength !== addressByteLength) {
    throw new Error("Invalid address length.");
  }
  return address;
};

export const addressToHexAddress = (address: Address) => {
  return u8aToHex(addressToU8AAddress(address));
};

export const addressToBechAddress = (address: Address) =>
  u8aAddressToBechAddress(addressToU8AAddress(address));

export const u8aAddressToBechAddress = (u8aAddress: Uint8Array): string => {
  if (u8aAddress.length === 0) return "";
  return bech32.encode(HRP, bech32.toWords(u8aAddress));
};

export const addressByteLength = 32;

const HRP = "erd";
