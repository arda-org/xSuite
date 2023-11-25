import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";

export class OptionDecoder<T> extends AbstractDecoder<T | null> {
  #decoder: Decoder<T>;

  constructor(decoder: Decoder<T>) {
    super();
    this.#decoder = decoder;
  }

  _fromTop(r: ByteReader) {
    if (r.length() === 0) {
      return null;
    }
    if (r.readExact(1)[0] === 1) {
      return this.#decoder.fromNest(r);
    } else {
      throw new Error("Invalid Option top-encoding.");
    }
  }

  _fromNest(r: ByteReader) {
    const byte = r.readExact(1)[0];
    if (byte === 0) {
      return null;
    } else if (byte === 1) {
      return this.#decoder.fromNest(r);
    } else {
      throw new Error("Invalid Option nest-encoding.");
    }
  }
}
