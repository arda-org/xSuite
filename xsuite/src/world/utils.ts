import fs from "node:fs";
import { AddressType, makeU8AAddress } from "../data/utils";

export const readFileHex = (path: string) => {
  return fs.readFileSync(path, "hex");
};

export const createU8AAddress = ({
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
