import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";

export class ListNDecoder<T> extends AbstractDecoder<T[]> {
  length: number;
  #decoder: Decoder<T>;

  constructor(length: number, decoder: Decoder<T>) {
    super();
    this.length = length;
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
    const result = [];
    for (let i = 0; i < this.length; i++) {
      result.push(this.#decoder.fromNest(r));
    }
    return result;
  }
}
