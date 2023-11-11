import { AddressEncodable } from "./AddressEncodable";
import { enc } from "./encoding";

export type Address = string | AddressEncodable;

export const addressToAddressEncodable = (address: Address) => {
  if (typeof address === "string") {
    address = enc.Addr(address);
  }
  return address;
};
