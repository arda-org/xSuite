import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { U32Decoder } from "./UintDecoder";
import { bytesToB64, bytesToHexString } from "./utils";

export class BufferDecoder extends AbstractDecoder<Uint8Array> {
  _fromTop(r: ByteReader) {
    return r.readAll();
  }

  _fromNest(r: ByteReader) {
    const length = Number(new U32Decoder()._fromNest(r));
    return r.readExact(length);
  }

  toHex() {
    return this.then(bytesToHexString);
  }

  toB64() {
    return this.then(bytesToB64);
  }
}
