import { Encodable } from "./Encodable";

export class OptionEncodable extends Encodable {
  #encodable: Encodable | null;

  constructor(encodable: Encodable | null) {
    super();
    this.#encodable = encodable;
  }

  toTopU8A(): Uint8Array {
    if (this.#encodable === null) {
      return Uint8Array.from([]);
    } else {
      return Uint8Array.from([1, ...this.#encodable.toNestU8A()]);
    }
  }

  toNestU8A(): Uint8Array {
    if (this.#encodable === null) {
      return Uint8Array.from([0]);
    } else {
      return Uint8Array.from([1, ...this.#encodable.toNestU8A()]);
    }
  }
}
