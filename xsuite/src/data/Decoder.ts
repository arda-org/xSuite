import { ByteReader } from "./ByteReader";
import { hexStringToBytes } from "./utils";

export type Decoder<T> = {
  topDecode(bytes: string | number[] | Uint8Array | ByteReader): T;
  nestDecode(bytes: string | number[] | Uint8Array | ByteReader): T;
};

export abstract class AbstractDecoder<T> implements Decoder<T> {
  topDecode(bytes: string | number[] | Uint8Array | ByteReader): T {
    return this._topDecode(toByteReader(bytes));
  }

  nestDecode(bytes: string | number[] | Uint8Array | ByteReader): T {
    return this._nestDecode(toByteReader(bytes));
  }

  abstract _topDecode(r: ByteReader): T;

  abstract _nestDecode(r: ByteReader): T;
}

const toByteReader = (bytes: string | number[] | Uint8Array | ByteReader) => {
  if (typeof bytes === "string") {
    return new ByteReader(hexStringToBytes(bytes));
  } else if (Array.isArray(bytes)) {
    return new ByteReader(new Uint8Array(bytes));
  } else if (ArrayBuffer.isView(bytes)) {
    return new ByteReader(bytes);
  } else {
    return bytes;
  }
};

export const postDecode = <T, U>(
  decoder: Decoder<T>,
  f: (x: T) => U,
): Decoder<U> => ({
  topDecode: (bytes: string | number[] | Uint8Array | ByteReader) =>
    f(decoder.topDecode(bytes)),
  nestDecode: (bytes: string | number[] | Uint8Array | ByteReader) =>
    f(decoder.nestDecode(bytes)),
});
