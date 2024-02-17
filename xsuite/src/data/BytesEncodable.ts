import { Encodable } from "./Encodable";
import { hexToU8A } from "./utils";

export class BytesEncodable extends Encodable {
  #u8a: Uint8Array;

  constructor(bytes: string | number[] | Uint8Array) {
    super();
    if (typeof bytes === "string") {
      bytes = hexToU8A(bytes);
    } else if (Array.isArray(bytes)) {
      bytes = new Uint8Array(bytes);
    }
    this.#u8a = bytes;
  }

  toTopU8A(): Uint8Array {
    return this.#u8a;
  }

  toNestU8A(): Uint8Array {
    return this.toTopU8A();
  }
}
