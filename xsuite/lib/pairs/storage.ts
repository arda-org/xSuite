import { Encodable, e, hexToEncodable } from "../enc";
import { Kv } from "./pairs";

export const s = {
  SingleValueMapper: (baseKey: string, map: Kv[]) => {
    return getSingleValueMapperKvs(baseKey, map);
  },
  SetMapper: (baseKey: string, map: [number | bigint, Encodable][]) => {
    return getSetMapperKvs(baseKey, map);
  },
  MapMapper: (
    baseKey: string,
    map: [number | bigint, Encodable, Encodable][]
  ) => {
    return getMapMapperKvs(baseKey, map);
  },
  VecMapper: (baseKey: string, vec: Encodable[]) => {
    return getVecMapperKvs(baseKey, vec);
  },
};

const getSingleValueMapperKvs = (baseKey: string, map: Kv[]): Kv[] => {
  const baseKeyEnc = e.Bytes(e.Str(baseKey).toTopBytes());
  return map.map(([k, v]) => [e.List(baseKeyEnc, hexToEncodable(k)), v]);
};

const getSetMapperKvs = (
  baseKey: string,
  map: [number | bigint, Encodable][]
): Kv[] => {
  if (map.length === 0) return [];
  map.sort(([a], [b]) => (a <= b ? -1 : 1));
  const indexKvs: Kv[] = [];
  const valueKvs: Kv[] = [];
  const linksKvs: Kv[] = [];
  let maxIndex: number | bigint = 0n;
  for (let i = 0; i < map.length; i++) {
    const [index, v] = map[i];
    if (index <= 0) {
      throw new Error("Negative id not allowed.");
    }
    indexKvs.push([v, e.U32(index)]);
    valueKvs.push([e.U32(index), v]);
    const prevI = i === 0 ? 0n : map[i - 1][0];
    const nextI = i === map.length - 1 ? 0n : map[i + 1][0];
    linksKvs.push([e.U32(index), e.Tuple(e.U32(prevI), e.U32(nextI))]);
    if (index >= maxIndex) {
      maxIndex = index;
    }
  }
  const firstI = map[0][0];
  const lastI = map[map.length - 1][0];
  return [
    [
      e.Str(baseKey + ".info"),
      e.Tuple(e.U32(map.length), e.U32(firstI), e.U32(lastI), e.U32(maxIndex)),
    ],
    ...getSingleValueMapperKvs(baseKey + ".node_id", indexKvs),
    ...getSingleValueMapperKvs(baseKey + ".value", valueKvs),
    ...getSingleValueMapperKvs(baseKey + ".node_links", linksKvs),
  ];
};

const getMapMapperKvs = (
  baseKey: string,
  map: [number | bigint, Encodable, Encodable][]
): Kv[] => {
  return [
    ...getSetMapperKvs(
      baseKey,
      map.map(([i, k]) => [i, k])
    ),
    ...getSingleValueMapperKvs(
      baseKey + ".mapped",
      map.map(([, k, v]) => [k, v])
    ),
  ];
};

const getVecMapperKvs = (baseKey: string, map: Encodable[]): Kv[] => {
  if (map.length === 0) return [];
  return [
    ...getSingleValueMapperKvs(
      baseKey + ".item",
      map.map((v, i) => [e.U32(BigInt(i + 1)), v])
    ),
    [e.Str(baseKey + ".len"), e.U32(BigInt(map.length))],
  ];
};
