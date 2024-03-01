import { u8aToBase64 } from "./utils";

const b64Symbol = Symbol.for("xsuite.B64");

export type b64 = {
  __kind: typeof b64Symbol;
  base64: string;
  toString: () => string;
};

export const B64 = (base64: string): b64 => ({
  __kind: b64Symbol,
  base64,
  toString: () => `B64(${JSON.stringify(base64)})`,
});

export const isB64 = (value: unknown): value is b64 =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === b64Symbol;

export const u8aToB64 = (u8a: Uint8Array) => {
  return B64(u8aToBase64(u8a));
};
