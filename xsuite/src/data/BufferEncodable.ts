import { Encodable } from "./Encodable";
import { U32Encodable } from "./UintEncodable";
import { hexToU8A } from "./utils";

export class BufferEncodable extends Encodable {
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
    const tB = this.toTopU8A();
    const lenB = new U32Encodable(tB.byteLength).toNestU8A();
    return Uint8Array.from([...lenB, ...tB]);
  }
}
