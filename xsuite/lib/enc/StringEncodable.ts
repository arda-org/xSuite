import { Encodable } from "./Encodable";
import { U32Encodable } from "./UintEncodable";

export class StringEncodable extends Encodable {
  #string: string;

  constructor(string: string) {
    super();
    this.#string = string;
  }

  toTopBytes(): Uint8Array {
    return new TextEncoder().encode(this.#string);
  }

  toNestBytes(): Uint8Array {
    const tB = this.toTopBytes();
    const lenB = new U32Encodable(tB.byteLength).toNestBytes();
    return Uint8Array.from([...lenB, ...tB]);
  }
}
