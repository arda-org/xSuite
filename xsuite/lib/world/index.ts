import fs from "node:fs";
import path from "node:path";

export const readFileHex = (...paths: string[]) => {
  return fs.readFileSync(path.join(...paths), "hex");
};

export { FWorld, FWorldContract, FWorldWallet } from "./fworld";
export { World } from "./world";
export { UserSigner } from "./signer";
