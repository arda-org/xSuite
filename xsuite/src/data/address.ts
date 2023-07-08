import { AddressEncodable } from "./AddressEncodable";
import { enc } from "./encoding";

export type Address = string | AddressEncodable;

export const addressToBytes = (address: Address) => {
  if (typeof address === "string") {
    address = enc.Addr(address);
  }
  return address.toTopBytes();
};

export const addressToHexString = (address: Address) => {
  if (typeof address === "string") {
    address = enc.Addr(address);
  }
  return address.toTopHex();
};
