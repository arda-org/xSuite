import { Encodable } from "./Encodable";
import { e } from "./encoding";

export type Hex = string | Encodable;

export const broadHexToBytes = (broadHex: Hex) => {
  if (typeof broadHex === "string") {
    broadHex = e.Buffer(broadHex);
  }
  return broadHex.toTopBytes();
};

export const broadHexToHex = (broadHex: Hex) => {
  if (typeof broadHex === "string") {
    return broadHex;
  }
  return broadHex.toTopHex();
};
