import { Encodable, e } from "../enc";
import { Pair } from "./pairs";

export const s = {
  SingleValueMapper: (baseKey: string, map: Pair[]) => {
    return getSingleValueMapperPairs(baseKey, map);
  },
  SetMapper: (baseKey: string, map: [bigint, Encodable][]) => {
    return getSetMapperPairs(baseKey, map);
  },
  MapMapper: (baseKey: string, map: [bigint, Encodable, Encodable][]) => {
    return getMapMapperPairs(baseKey, map);
  },
  VecMapper: (baseKey: string, vec: Encodable[]) => {
    return getVecMapperPairs(baseKey, vec);
  },
};

const getSingleValueMapperPairs = (baseKey: string, pairs: Pair[]): Pair[] => {
  const baseKeyHex = e.Bytes(e.Str(baseKey).toTopBytes());
  return pairs.map(([k, v]) => [e.List(baseKeyHex, k), v]);
};

const getSetMapperPairs = (
  baseKey: string,
  set: [bigint, Encodable][]
): Pair[] => {
  if (set.length === 0) return [];
  const idPairs: Pair[] = [];
  const valuePairs: Pair[] = [];
  const linksPairs: Pair[] = [];
  let maxId = 0n;
  for (let i = 0; i < set.length; i++) {
    const [id, v] = set[i];
    if (id <= 0) {
      throw new Error("0 not allowed for set id");
    }
    idPairs.push([v, e.U32(id)]);
    valuePairs.push([e.U32(id), v]);
    const prevId = i === 0 ? 0n : set[i - 1][0];
    const nextId = i === set.length - 1 ? 0n : set[i + 1][0];
    linksPairs.push([e.U32(id), e.Tuple(e.U32(prevId), e.U32(nextId))]);
    maxId = id >= maxId ? id : maxId;
  }
  const firstId = set[0][0];
  const lastId = set[set.length - 1][0];
  return [
    [
      e.Str(baseKey + ".info"),
      e.Tuple(e.U32(set.length), e.U32(firstId), e.U32(lastId), e.U32(maxId)),
    ],
    ...getSingleValueMapperPairs(baseKey + ".node_id", idPairs),
    ...getSingleValueMapperPairs(baseKey + ".value", valuePairs),
    ...getSingleValueMapperPairs(baseKey + ".node_links", linksPairs),
  ];
};

const getMapMapperPairs = (
  baseKey: string,
  map: [bigint, Encodable, Encodable][]
): Pair[] => {
  return [
    ...getSetMapperPairs(
      baseKey,
      map.map(([id, k]) => [id, k])
    ),
    ...getSingleValueMapperPairs(
      baseKey + ".mapped",
      map.map(([, k, v]) => [k, v])
    ),
  ];
};

const getVecMapperPairs = (baseKey: string, vec: Encodable[]): Pair[] => {
  return [
    ...getSingleValueMapperPairs(
      baseKey + ".item",
      vec.map((v, i) => [e.U32(BigInt(i + 1)), v])
    ),
    [e.Str(baseKey + ".len"), e.U32(BigInt(vec.length))],
  ];
};
