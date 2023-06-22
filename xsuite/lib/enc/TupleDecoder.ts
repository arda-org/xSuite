import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";

export class TupleDecoder<T extends DecoderMap<any>> extends AbstractDecoder<
  DecoderMapToValueMap<T>
> {
  #decoders: T;

  constructor(decoders: T) {
    super();
    this.#decoders = decoders;
  }

  _topDecode(r: ByteReader) {
    const result: { [key: string]: any } = {};
    for (const key in this.#decoders)
      result[key] = this.#decoders[key].nestDecode(r);
    return result as any;
  }

  _nestDecode(r: ByteReader) {
    return this._topDecode(r);
  }
}

export type DecoderMap<T> = Record<string, Decoder<T>>;

type DecoderMapToValueMap<T> = {
  [K in keyof T]: T[K] extends Decoder<infer U> ? U : never;
} & {
  // Pretiffy type: https://twitter.com/mattpocockuk/status/1622730173446557697
};
