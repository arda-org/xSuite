import { bech32 } from "bech32";

export type Address = string | Uint8Array;

export const isAddress = (value: unknown): value is Address =>
  typeof value === "string" || value instanceof Uint8Array;

export const u8aAddressToBechAddress = (u8aAddress: Uint8Array): string => {
  if (u8aAddress.length === 0) return "";
  return bech32.encode(HRP, bech32.toWords(u8aAddress));
};

export const addressByteLength = 32;

export const HRP = "erd";
