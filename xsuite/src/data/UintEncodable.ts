import { Encodable } from "./Encodable";

export class UintEncodable extends Encodable {
  #uint: bigint;
  #byteLength?: number;

  constructor(uint: number | bigint, byteLength?: number) {
    super();
    if (typeof uint === "number") {
      uint = BigInt(uint);
    }
    if (uint < 0) {
      throw new Error("Number is negative.");
    }
    if (byteLength !== undefined && uint >= 2n ** (8n * BigInt(byteLength))) {
      throw new Error("Number above maximal value allowed.");
    }
    this.#uint = uint;
    this.#byteLength = byteLength;
  }

  toTopU8A(): Uint8Array {
    let u = this.#uint;
    const res: number[] = [];
    while (u > 0) {
      res.unshift(Number(u % 256n));
      u = u / 256n;
    }
    return Uint8Array.from(res);
  }

  toNestU8A(): Uint8Array {
    const tB = this.toTopU8A();
    if (this.#byteLength === undefined) {
      const lenB = new U32Encodable(tB.byteLength).toNestU8A();
      return Uint8Array.from([...lenB, ...tB]);
    } else {
      const nB = new Uint8Array(this.#byteLength);
      nB.set(tB, this.#byteLength - tB.byteLength);
      return nB;
    }
  }
}

export class U32Encodable extends UintEncodable {
  constructor(uint: number | bigint) {
    super(uint, 4);
  }
}
