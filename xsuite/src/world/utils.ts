import fs from "node:fs";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { AddressType, makeU8AAddress } from "../data/utils";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
};

export const createAddressLike = (
  type: AddressType,
  params?: AddressLikeParams,
) => {
  if (isAddressLike(params)) {
    return params;
  }
  counter += 1;
  const shard = params?.shard;
  return makeU8AAddress({ counter, type, shard });
};

let counter = 0;

export type AddressLikeParams = AddressLike | { shard?: number };
