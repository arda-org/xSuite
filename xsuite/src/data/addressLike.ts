import { bech32 } from "bech32";
import {
  Address,
  addressByteLength,
  HRP,
  isAddress,
  u8aAddressToBech,
} from "./address";
import { Encodable, isEncodable } from "./encoding";
import { hexToU8A, u8aToHex } from "./utils";

export type AddressLike = Address | Encodable;

export const isAddressLike = (value: unknown): value is AddressLike =>
  isAddress(value) || isEncodable(value);

export const addressLikeToU8A = (addressLike: AddressLike): Uint8Array => {
  if (addressLike === "") return new Uint8Array();
  if (typeof addressLike === "string") {
    if (addressLike.length === 2 * addressByteLength) {
      addressLike = hexToU8A(addressLike);
    } else if (bech32.decodeUnsafe(addressLike)?.prefix === HRP) {
      const { words } = bech32.decode(addressLike);
      addressLike = new Uint8Array(bech32.fromWords(words));
    } else {
      throw new Error("Invalid address format.");
    }
  } else if (isEncodable(addressLike)) {
    addressLike = addressLike.toTopU8A();
  }
  if (addressLike.byteLength !== addressByteLength) {
    throw new Error("Invalid address length.");
  }
  return addressLike;
};

export const addressLikeToHex = (addressLike: AddressLike) => {
  return u8aToHex(addressLikeToU8A(addressLike));
};

export const addressLikeToBech = (addressLike: AddressLike) =>
  u8aAddressToBech(addressLikeToU8A(addressLike));
