import { AddressEncodable } from "./AddressEncodable";
import { enc } from "./encoding";

export type Address = string | Uint8Array | AddressEncodable;

export const addressToAddressEncodable = (address: Address) => {
  if (address instanceof AddressEncodable) {
    return address;
  }
  return enc.Addr(address);
};
