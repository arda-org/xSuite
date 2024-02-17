import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { safeBigintToNumber } from "./utils";

export class UintDecoder extends AbstractDecoder<bigint> {
  #byteLength?: number;

  constructor(byteLength?: number) {
    super();
    this.#byteLength = byteLength;
  }

  _fromTop(r: ByteReader) {
    const u8a =
      this.#byteLength === undefined
        ? r.readAll()
        : r.readAtMost(this.#byteLength);
    return decode(u8a);
  }

  _fromNest(r: ByteReader): bigint {
    const length =
      this.#byteLength === undefined
        ? Number(new U32Decoder()._fromNest(r))
        : this.#byteLength;
    return decode(r.readExact(length));
  }

  toNum() {
    return this.then(safeBigintToNumber);
  }

  toStr() {
    return this.then(String);
  }
}

export class U32Decoder extends UintDecoder {
  constructor() {
    super(4);
  }
}

const decode = (u8a: Uint8Array): bigint => {
  let value = 0n;
  for (const byte of u8a) {
    value = BigInt(value) * 256n + BigInt(byte);
  }
  return value;
};
