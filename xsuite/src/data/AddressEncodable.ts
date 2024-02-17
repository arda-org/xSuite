import { bech32 } from "bech32";
import { Encodable } from "./Encodable";
import { hexToU8A } from "./utils";

export class AddressEncodable extends Encodable {
  #u8a: Uint8Array;

  constructor(address: string | Uint8Array) {
    super();
    if (typeof address === "string") {
      address = strAddressToU8AAddress(address);
    }
    if (address.byteLength !== addressByteLength) {
      throw new Error("Invalid address length.");
    }
    this.#u8a = address;
  }

  toTopU8A(): Uint8Array {
    return this.#u8a;
  }

  toNestU8A(): Uint8Array {
    return this.toTopU8A();
  }

  toString(): string {
    return u8aAddressToBechAddress(this.#u8a);
  }
}

export const u8aAddressToBechAddress = (u8a: Uint8Array): string => {
  const words = bech32.toWords(u8a);
  return bech32.encode(HRP, words);
};

export const bechAddressToU8AAddress = (bechAddress: string): Uint8Array => {
  const { prefix, words } = bech32.decode(bechAddress);
  if (prefix !== HRP) {
    throw new Error("Invalid address HRP.");
  }
  return Uint8Array.from(bech32.fromWords(words));
};

const strAddressToU8AAddress = (strAddress: string): Uint8Array => {
  if (strAddress.length === 2 * addressByteLength) {
    return hexToU8A(strAddress);
  }
  return bechAddressToU8AAddress(strAddress);
};

export const addressByteLength = 32;

const HRP = "erd";
