import fs from "node:fs";
import { addressByteLength } from "../data/address";
import { AddressType, makeU8AAddress } from "../data/utils";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
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

export const generateU8AAddress = ({
  type,
  shard,
}: {
  type: AddressType;
  shard?: number;
}) => {
  addressCounter += 1;
  return makeU8AAddress({ counter: addressCounter, type, shard });
};

let addressCounter = 0;
