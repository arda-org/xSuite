import { Hex, hexToHexString } from "./hex";

export type Pairs = Record<string, string>;

export type Kv = [key: Hex, value: Hex];

export const kvsToPairs = (kvs: Kv[]) => {
  return Object.fromEntries(
    kvs.map(([k, v]) => [hexToHexString(k), hexToHexString(v)])
  );
};
