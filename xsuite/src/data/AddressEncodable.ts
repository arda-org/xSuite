import { bech32 } from "bech32";
import { Encodable } from "./Encodable";
import { hexToBytes } from "./utils";

export class AddressEncodable extends Encodable {
  #bytes: Uint8Array;

  constructor(address: string | Uint8Array) {
    super();
    if (typeof address === "string") {
      address = strAddressToBytes(address);
    }
    if (address.byteLength !== addressByteLength) {
      throw new Error("Invalid address length.");
    }
    this.#bytes = address;
  }

  toTopBytes(): Uint8Array {
    return this.#bytes;
  }

  toNestBytes(): Uint8Array {
    return this.toTopBytes();
  }

  toString(): string {
    return bytesToBechAddress(this.#bytes);
  }
}

export const bytesToBechAddress = (bytes: Uint8Array): string => {
  const words = bech32.toWords(bytes);
  return bech32.encode(HRP, words);
};

export const bechAddressToBytes = (bechAddress: string): Uint8Array => {
  const { prefix, words } = bech32.decode(bechAddress);
  if (prefix !== HRP) {
    throw new Error(`Invalid address HRP.`);
  }
  return Uint8Array.from(bech32.fromWords(words));
};

const strAddressToBytes = (strAddress: string): Uint8Array => {
  if (strAddress.length === 2 * addressByteLength) {
    return hexToBytes(strAddress);
  }
  return bechAddressToBytes(strAddress);
};

export const addressByteLength = 32;

const HRP = "erd";
