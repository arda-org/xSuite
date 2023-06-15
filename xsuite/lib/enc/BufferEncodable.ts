import { Encodable } from "./Encodable";
import { U32Encodable } from "./UintEncodable";
import { hexStringToBytes } from "./utils";

export class BufferEncodable extends Encodable {
  #bytes: Uint8Array;

  constructor(bytes: string | number[] | Uint8Array) {
    super();
    if (typeof bytes === "string") {
      bytes = hexStringToBytes(bytes);
    } else if (Array.isArray(bytes)) {
      bytes = new Uint8Array(bytes);
    }
    this.#bytes = bytes;
  }

  toTopBytes(): Uint8Array {
    return this.#bytes;
  }

  toNestBytes(): Uint8Array {
    const tB = this.toTopBytes();
    const lenB = new U32Encodable(tB.byteLength).toNestBytes();
    return Uint8Array.from([...lenB, ...tB]);
  }
}
