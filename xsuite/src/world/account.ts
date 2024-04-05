import { addressToU8AAddress, u8aAddressToBechAddress } from "../data/address";
import { Encodable } from "../data/encoding";

export class Account extends Encodable {
  $$typeof = Symbol.for("jest.asymmetricMatcher");
  u8a: Uint8Array;

  constructor(address: string | Uint8Array) {
    super();
    this.u8a = addressToU8AAddress(address);
  }

  toTopU8A(): Uint8Array {
    return this.u8a;
  }

  toNestU8A(): Uint8Array {
    return this.toTopU8A();
  }

  toString(): string {
    return u8aAddressToBechAddress(this.u8a);
  }

  asymmetricMatch(compareTo: string) {
    return compareTo === this.toString();
  }

  toAsymmetricMatcher() {
    return `"${this.toString()}"`;
  }
}
