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

export const numberToU8AAddress = (
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

const calculateMasks = (numOfShards: number) => {
  const n = Math.ceil(Math.log2(numOfShards));
  const mask1 = (1 << n) - 1;
  const mask2 = (1 << (n - 1)) - 1;
  return [mask1, mask2];
};

// https://github.com/multiversx/mx-sdk-nestjs/blob/8209a33d01dfb2a09085479444112192c8342aa9/packages/common/src/utils/address.utils.ts#L40
export const computeShard = (hexPubKey: string): number => {
  const [maskHigh, maskLow] = calculateMasks(totalShards);
  const pubKey = Buffer.from(hexPubKey, "hex");
  const lastByteOfPubKey = pubKey[addressByteLength - 1];
  let shard = lastByteOfPubKey & maskHigh;
  if (shard > totalShards - 1) {
    shard = lastByteOfPubKey & maskLow;
  }

  return shard;
};

export const totalShards = 3;

const addressByteLength = 32;
const contractAddressLeftShift = 8;
