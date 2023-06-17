import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";

export class UintDecoder extends AbstractDecoder<bigint> {
  #byteLength?: number;

  constructor(byteLength?: number) {
    super();
    this.#byteLength = byteLength;
  }

  _topDecode(r: ByteReader) {
    const bytes =
      this.#byteLength === undefined ? r.readAll() : r.read(this.#byteLength);
    return decode(bytes);
  }

  _nestDecode(r: ByteReader): bigint {
    const length =
      this.#byteLength === undefined
        ? Number(new U32Decoder()._nestDecode(r))
        : this.#byteLength;
    return decode(r.read(length));
  }
}

export class U32Decoder extends UintDecoder {
  constructor() {
    super(4);
  }
}

const decode = (bytes: Uint8Array): bigint => {
  let value = 0n;
  for (const byte of bytes) {
    value = BigInt(value) * 256n + BigInt(byte);
  }
  return value;
};
