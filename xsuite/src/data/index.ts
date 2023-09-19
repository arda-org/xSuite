import { enc } from "./encoding";
import { kvsEnc } from "./kvsEncoding";

export { d } from "./decoding";
export const e = { ...enc, kvs: kvsEnc };
