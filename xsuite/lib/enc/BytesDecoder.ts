import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";

export class BytesDecoder extends AbstractDecoder<Uint8Array> {
  #byteLength?: number;

  constructor(byteLength?: number) {
    super();
    this.#byteLength = byteLength;
  }

  _topDecode(r: ByteReader) {
    return this.#byteLength === undefined
      ? r.readAll()
      : r.readExact(this.#byteLength);
  }

  _nestDecode(r: ByteReader) {
    return this._topDecode(r);
  }
}
