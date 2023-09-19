import { Hex, hexToHexString } from "./hex";

export type RawKvs = Record<string, string>;

export type Kvs = (Kv | Kv[])[] | RawKvs;

export type Kv = [key: Hex, value: Hex];

export const kvsToRawKvs = (kvs: Kvs): RawKvs => {
  if (!Array.isArray(kvs)) {
    return kvs;
  }
  const rawKvs: RawKvs = {};
  for (const [k, v] of flattenKvs(kvs)) {
    rawKvs[hexToHexString(k)] = hexToHexString(v);
  }
  return rawKvs;
};

const flattenKvs = (kvs: (Kv | Kv[])[]): Kv[] => {
  return kvs.flatMap((p) => (isKv(p) ? [p] : p));
};

const isKv = (x: Kv | Kv[]): x is Kv => {
  return x.length === 2 && !Array.isArray(x[0]);
};
