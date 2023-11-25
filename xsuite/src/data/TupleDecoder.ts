import { Prettify } from "../helpers";
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

  _fromTop(r: ByteReader) {
    const result: { [key: string]: any } = {};
    for (const key in this.#decoders) {
      result[key] = this.#decoders[key].fromNest(r);
    }
    return result as any;
  }

  _fromNest(r: ByteReader) {
    return this._fromTop(r);
  }
}

export type DecoderMap<T> = Record<string, Decoder<T>>;

type DecoderMapToValueMap<T> = Prettify<{
  [K in keyof T]: T[K] extends Decoder<infer U> ? U : never;
}>;
