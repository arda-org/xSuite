import { Encodable } from "./Encodable";
import { hexToBytes } from "./utils";

export class BytesEncodable extends Encodable {
  #bytes: Uint8Array;

  constructor(bytes: string | number[] | Uint8Array) {
    super();
    if (typeof bytes === "string") {
      bytes = hexToBytes(bytes);
    } else if (Array.isArray(bytes)) {
      bytes = new Uint8Array(bytes);
    }
    this.#bytes = bytes;
  }

  toTopBytes(): Uint8Array {
    return this.#bytes;
  }

  toNestBytes(): Uint8Array {
    return this.toTopBytes();
  }
}
