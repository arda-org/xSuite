import { b64, isB64 } from "./b64";
import { base64ToU8A, hexToU8A } from "./utils";

export type Bytes = string | Uint8Array | b64;

export const isBytes = (value: unknown): value is Bytes =>
  isB64(value) || typeof value === "string" || value instanceof Uint8Array;

export const bytesToU8A = (bytes: Bytes): Uint8Array => {
  if (isB64(bytes)) {
    return base64ToU8A(bytes.base64);
  }
  if (typeof bytes === "string") {
    return hexToU8A(bytes);
  }
  return bytes;
};
