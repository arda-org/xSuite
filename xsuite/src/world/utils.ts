import fs from "node:fs";
import { Address, addressToAddressEncodable } from "../data/address";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
};

export const isContractAddress = (address: Address) => {
  return addressToAddressEncodable(address)
    .toTopHex()
    .startsWith("0000000000000000");
};

export const numberToBytesAddress = (
  n: number,
  isContract: boolean,
): Uint8Array => {
  if (n <= 0) {
    throw new Error("Number must be positive.");
  }
  const buffer = new ArrayBuffer(addressByteLength);
  const view = new DataView(buffer);
  view.setUint32(isContract ? contractAddressLeftShift : 0, n);
  return new Uint8Array(buffer);
};

const addressByteLength = 32;
const contractAddressLeftShift = 8;
