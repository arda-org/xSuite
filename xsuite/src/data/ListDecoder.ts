import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";
import { U32Decoder } from "./UintDecoder";

export class ListDecoder<T> extends AbstractDecoder<T[]> {
  #decoder: Decoder<T>;

  constructor(decoder: Decoder<T>) {
    super();
    this.#decoder = decoder;
  }

  _fromTop(r: ByteReader) {
    const result = [];
    while (!r.isConsumed()) {
      result.push(this.#decoder.fromNest(r));
    }
    return result;
  }

  _fromNest(r: ByteReader) {
    const length = Number(new U32Decoder()._fromNest(r));
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.#decoder.fromNest(r));
    }
    return result;
  }
}
