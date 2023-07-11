import { Hex, hexToHexString } from "./hex";

export type RawPairs = Record<string, string>;

export type Pairs = (Pair | Pair[])[] | RawPairs;

export type Pair = [key: Hex, value: Hex];

export const pairsToRawPairs = (pairs: Pairs): RawPairs => {
  if (!Array.isArray(pairs)) {
    return pairs;
  }
  const rawPairs: RawPairs = {};
  for (const [k, v] of flattenPairs(pairs)) {
    rawPairs[hexToHexString(k)] = hexToHexString(v);
  }
  return rawPairs;
};

const flattenPairs = (pairs: (Pair | Pair[])[]): Pair[] => {
  return pairs.flatMap((pair) => (isPair(pair) ? [pair] : pair));
};

const isPair = (x: Pair | Pair[]): x is Pair => {
  return x.length === 2 && !Array.isArray(x[0]);
};
