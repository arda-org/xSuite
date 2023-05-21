import { Encodable } from "./Encodable";

export class BooleanEncodable extends Encodable {
  #boolean: boolean;

  constructor(boolean: boolean) {
    super();
    this.#boolean = boolean;
  }

  toTopBytes(): Uint8Array {
    return Uint8Array.from([Number(this.#boolean)]);
  }

  toNestBytes(): Uint8Array {
    return this.toTopBytes();
  }
}
