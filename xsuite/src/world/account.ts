import { u8aAddressToBechAddress } from "../data/address";
import { AddressLike, addressLikeToU8AAddress } from "../data/addressLike";
import { Encodable } from "../data/encoding";

export class Account extends Encodable {
  $$typeof = Symbol.for("jest.asymmetricMatcher");
  u8a: Uint8Array;

  constructor(address: AddressLike) {
    super();
    this.u8a = addressLikeToU8AAddress(address);
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
