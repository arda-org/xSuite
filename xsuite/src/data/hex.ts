import { BytesEncodable } from "./BytesEncodable";
import { Encodable } from "./Encodable";
import { enc } from "./encoding";

export type Hex = string | Encodable;

export const hexToBytes = (hex: Hex) => {
  if (typeof hex === "string") {
    hex = enc.Bytes(hex);
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
