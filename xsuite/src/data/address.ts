import { bech32 } from "bech32";

export type Address = string | Uint8Array;

export const isAddress = (value: unknown): value is Address =>
  typeof value === "string" || value instanceof Uint8Array;

export const u8aAddressToBech = (u8aAddress: Uint8Array): string => {
  if (u8aAddress.length === 0) return "";
  return bech32.encode(HRP, bech32.toWords(u8aAddress));
};

export const addressByteLength = 32;

export const HRP = "erd";

export const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";

export const zeroHexAddress =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const zeroU8AAddress = new Uint8Array(32).fill(0);

export const fullBechAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";

export const fullU8AAddress = new Uint8Array(32).fill(255);
