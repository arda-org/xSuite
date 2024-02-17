import { ByteReader } from "./ByteReader";
import { Bytes, isBytes } from "./bytes";

export const isDecoder = (value: unknown): value is Decoder<any> =>
  !!value &&
  typeof value === "object" &&
  "fromTop" in value &&
  typeof value.fromTop === "function" &&
  "fromNest" in value &&
  typeof value.fromNest === "function";

export type Decoder<T> = {
  fromTop(bytes: Bytes | ByteReader): T;
  fromNest(bytes: Bytes | ByteReader): T;
  /**
   * @deprecated Use `.fromTop` instead.
   */
  topDecode(bytes: Bytes | ByteReader): T;
  /**
   * @deprecated Use `.fromNest` instead.
   */
  nestDecode(bytes: Bytes | ByteReader): T;
};

export abstract class AbstractDecoder<T> implements Decoder<T> {
  fromTop(bytes: Bytes | ByteReader): T {
    return this._fromTop(toByteReader(bytes));
  }

  fromNest(bytes: Bytes | ByteReader): T {
    return this._fromNest(toByteReader(bytes));
  }

  topDecode(bytes: Bytes | ByteReader): T {
    return this._fromTop(toByteReader(bytes));
  }

  nestDecode(bytes: Bytes | ByteReader): T {
    return this._fromNest(toByteReader(bytes));
  }

  abstract _fromTop(r: ByteReader): T;

  abstract _fromNest(r: ByteReader): T;

  then<U>(f: (x: T) => U): Decoder<U> {
    return {
      fromTop: (bytes: Bytes) => f(this.fromTop(bytes)),
      fromNest: (bytes: Bytes) => f(this.fromNest(bytes)),
      topDecode: (bytes: Bytes | ByteReader) => f(this.topDecode(bytes)),
      nestDecode: (bytes: Bytes | ByteReader) => f(this.nestDecode(bytes)),
    };
  }
}

const toByteReader = (bytes: Bytes | ByteReader) => {
  if (isBytes(bytes)) {
    return new ByteReader(bytes);
  }
  return bytes;
};
