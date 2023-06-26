import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";
import { U32Decoder } from "./UintDecoder";

export class ListDecoder<T> extends AbstractDecoder<T[]> {
  #decoder: Decoder<T>;

  constructor(decoder: Decoder<T>) {
    super();
    this.#decoder = decoder;
  }

  _topDecode(r: ByteReader) {
    const result = [];
    while (!r.isConsumed()) {
      result.push(this.#decoder.nestDecode(r));
    }
    return result;
  }

  _nestDecode(r: ByteReader) {
    const length = Number(new U32Decoder()._nestDecode(r));
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.#decoder.nestDecode(r));
    }
    return result;
  }
}
