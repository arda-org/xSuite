import { AddressEncodable } from "./AddressEncodable";
import { e } from "./encoding";

export type Address = string | Uint8Array | AddressEncodable;

export const addressToAddressEncodable = (address: Address) => {
  if (address instanceof AddressEncodable) {
    return address;
  }
  return e.Addr(address);
};

export const addressToBech32 = (address: Address) =>
  addressToAddressEncodable(address).toString();
