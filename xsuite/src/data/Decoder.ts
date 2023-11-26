import { ByteReader } from "./ByteReader";
import { hexToBytes, narrowBytes } from "./utils";

export type Decoder<T> = {
  fromTop(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex",
  ): T;
  fromTop(bytes: string, encoding: "b64"): T;
  fromTop(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex" | "b64",
  ): T;
  fromNest(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex",
  ): T;
  fromNest(bytes: string, encoding: "b64"): T;
  fromNest(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex" | "b64",
  ): T;
  /**
   * @deprecated Use `.fromTop` instead.
   */
  topDecode(bytes: string | number[] | Uint8Array | ByteReader): T;
  /**
   * @deprecated Use `.fromNest` instead.
   */
  nestDecode(bytes: string | number[] | Uint8Array | ByteReader): T;
};

export abstract class AbstractDecoder<T> implements Decoder<T> {
  fromTop(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex" | "b64",
  ): T {
    return this._fromTop(toByteReader(narrowBytes(bytes, encoding)));
  }

  fromNest(
    bytes: string | number[] | Uint8Array | ByteReader,
    encoding?: "hex" | "b64",
  ): T {
    return this._fromNest(toByteReader(narrowBytes(bytes, encoding)));
  }

  topDecode(bytes: string | number[] | Uint8Array | ByteReader): T {
    return this._fromTop(toByteReader(bytes));
  }

  nestDecode(bytes: string | number[] | Uint8Array | ByteReader): T {
    return this._fromNest(toByteReader(bytes));
  }

  abstract _fromTop(r: ByteReader): T;

  abstract _fromNest(r: ByteReader): T;

  then<U>(f: (x: T) => U): Decoder<U> {
    return {
      fromTop: (
        bytes: string | number[] | Uint8Array,
        encoding?: "hex" | "b64",
      ) => f(this.fromTop(bytes, encoding)),
      fromNest: (
        bytes: string | number[] | Uint8Array,
        encoding?: "hex" | "b64",
      ) => f(this.fromNest(bytes, encoding)),
      topDecode: (bytes: string | number[] | Uint8Array | ByteReader) =>
        f(this.topDecode(bytes)),
      nestDecode: (bytes: string | number[] | Uint8Array | ByteReader) =>
        f(this.nestDecode(bytes)),
    };
  }
}

const toByteReader = (bytes: string | number[] | Uint8Array | ByteReader) => {
  if (typeof bytes === "string") {
    return new ByteReader(hexToBytes(bytes));
  } else if (Array.isArray(bytes)) {
    return new ByteReader(new Uint8Array(bytes));
  } else if (ArrayBuffer.isView(bytes)) {
    return new ByteReader(bytes);
  } else {
    return bytes;
  }
};
