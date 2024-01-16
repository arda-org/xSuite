import { Prettify } from "../helpers";
import { ByteReader } from "./ByteReader";
import { AbstractDecoder, Decoder } from "./Decoder";

export class TupleDecoderList<
  T extends readonly Decoder<any>[],
> extends AbstractDecoder<DecodersToValues<T>> {
  #decoders: T;

  constructor(decoders: T) {
    super();
    this.#decoders = decoders;
  }

  _fromTop(r: ByteReader) {
    const result: any[] = [];
    for (const decoder of this.#decoders) {
      result.push(decoder.fromNest(r));
    }
    return result as any;
  }

  _fromNest(r: ByteReader) {
    return this._fromTop(r);
  }
}

export class TupleDecoderMap<
  T extends Record<string, Decoder<any>>,
> extends AbstractDecoder<DecodersToValues<T>> {
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

type DecodersToValues<T> = Prettify<{
  [K in keyof T]: T[K] extends Decoder<infer U> ? U : never;
}>;
