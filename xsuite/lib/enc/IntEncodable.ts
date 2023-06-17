import { Encodable } from "./Encodable";
import { U32Encodable, UintEncodable } from "./UintEncodable";

export class IntEncodable extends Encodable {
  #int: bigint;
  #byteLength?: number;

  constructor(int: number | bigint, byteLength?: number) {
    super();
    if (typeof int === "number") {
      int = BigInt(int);
    }
    if (
      byteLength !== undefined &&
      int >= 2n ** (8n * BigInt(byteLength) - 1n)
    ) {
      throw new Error("Number above maximal value allowed.");
    }
    if (
      byteLength !== undefined &&
      int < -(2n ** (8n * BigInt(byteLength) - 1n))
    ) {
      throw new Error("Number below minimal value allowed.");
    }
    this.#int = int;
    this.#byteLength = byteLength;
  }

  toTopBytes(): Uint8Array {
    const numBytes = getUnambiguousNumBytes(this.#int);
    return complementOfTwo(this.#int, numBytes);
  }

  toNestBytes(): Uint8Array {
    if (this.#byteLength === undefined) {
      const tB = this.toTopBytes();
      const lenB = new U32Encodable(tB.byteLength).toNestBytes();
      return Uint8Array.from([...lenB, ...tB]);
    } else {
      return complementOfTwo(this.#int, this.#byteLength);
    }
  }
}

const complementOfTwo = (n: bigint, numBytes: number) => {
  let u = n;
  if (u < 0) {
    u += 2n ** (8n * BigInt(numBytes));
  }
  return new UintEncodable(u, numBytes).toNestBytes();
};

const getUnambiguousNumBytes = (n: bigint): number => {
  if (n === 0n) {
    return 0;
  }
  if (n < 0n) {
    n = -n - 1n;
  }
  let bytes = 1;
  while (n >= 128n) {
    n >>= 8n;
    bytes++;
  }
  return bytes;
};
