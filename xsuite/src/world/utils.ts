import fs from "node:fs";
import { addressByteLength } from "../data/address";
import { AddressLike, addressLikeToHexAddress } from "../data/addressLike";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
};

export const isContractAddress = (address: AddressLike) => {
  return addressLikeToHexAddress(address).startsWith("0000000000000000");
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
  let shift = 0;
  if (isContract) {
    shift += contractAddressLeftShift;
    view.setUint8(shift, 5);
    shift += 2;
  } else {
    view.setUint8(shift, 1);
    shift += 1;
  }
  view.setUint32(shift, n);
  return new Uint8Array(buffer);
};

const contractAddressLeftShift = 8;

export const generateWalletU8AAddress = () => {
  walletCounter += 1;
  return numberToU8AAddress(walletCounter, false);
};

let walletCounter = 0;

export const generateContractU8AAddress = () => {
  contractCounter += 1;
  return numberToU8AAddress(contractCounter, true);
};

let contractCounter = 0;

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

const calculateMasks = (numOfShards: number) => {
  const n = Math.ceil(Math.log2(numOfShards));
  const mask1 = (1 << n) - 1;
  const mask2 = (1 << (n - 1)) - 1;
  return [mask1, mask2];
};

export const totalShards = 3;
