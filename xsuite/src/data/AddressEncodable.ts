import { Encodable } from "./Encodable";
import { addressToU8AAddress, u8aAddressToBechAddress } from "./address";

export class AddressEncodable extends Encodable {
  #u8a: Uint8Array;

  constructor(address: string | Uint8Array) {
    super();
    this.#u8a = addressToU8AAddress(address);
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
