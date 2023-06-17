import { bech32 } from "bech32";
import { Encodable } from "./Encodable";

export class AddressEncodable extends Encodable {
  #bytes: Uint8Array;

  constructor(address: string | Uint8Array) {
    super();
    if (typeof address === "string") {
      address = bech32ToBytes(address);
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

  toBech32(): string {
    return bytesToBech32(this.#bytes);
  }
}

export const bytesToBech32 = (bytes: Uint8Array): string => {
  const words = bech32.toWords(bytes);
  return bech32.encode(HRP, words);
};

const bech32ToBytes = (bechAddress: string): Uint8Array => {
  const { prefix, words } = bech32.decode(bechAddress);
  if (prefix != HRP) {
    throw new Error(`Address HRP is not "${HRP}".`);
  }
  return Uint8Array.from(bech32.fromWords(words));
};

export const addressByteLength = 32;

const HRP = "erd";
