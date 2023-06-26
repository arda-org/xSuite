import { BytesEncodable } from "./BytesEncodable";
import { Encodable } from "./Encodable";
import { e } from "./encoding";

export type Hex = string | Encodable;

export const hexToBytes = (hex: Hex) => {
  if (typeof hex === "string") {
    hex = e.Bytes(hex);
  }
  return hex.toTopBytes();
};

export const hexToHexString = (hex: Hex) => {
  if (typeof hex === "string") {
    return hex;
  }
  return hex.toTopHex();
};

export const hexToEncodable = (hex: Hex) => {
  if (typeof hex === "string") {
    return new BytesEncodable(hex);
  }
  return hex;
};
