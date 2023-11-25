import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { U32Decoder, UintDecoder } from "./UintDecoder";
import { safeBigintToNumber } from "./utils";

export class IntDecoder extends AbstractDecoder<bigint> {
  #byteLength?: number;

  constructor(byteLength?: number) {
    super();
    this.#byteLength = byteLength;
  }

  _fromTop(r: ByteReader): bigint {
    const bytes =
      this.#byteLength === undefined
        ? r.readAll()
        : r.readAtMost(this.#byteLength);
    return decode(bytes);
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

const decode = (bytes: Uint8Array): bigint => {
  if (bytes.byteLength === 0) {
    return 0n;
  }
  let u = new UintDecoder().fromTop(bytes);
  if (u >= 2n ** (8n * BigInt(bytes.byteLength)) / 2n) {
    u -= 2n ** (8n * BigInt(bytes.byteLength));
  }
  return u;
};
