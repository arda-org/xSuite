import { enc } from "./encoding";
import { pEnc } from "./pairsEncoding";

export { d } from "./decoding";
export const e = { ...enc, p: pEnc };
