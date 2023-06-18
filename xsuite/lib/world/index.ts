import fs from "node:fs";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
};

export { FWorld, FWorldContract, FWorldWallet } from "./fworld";
export { World } from "./world";
export { UserSigner, inputHidden } from "./signer";
