import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { U32Decoder } from "./UintDecoder";

export class BufferDecoder extends AbstractDecoder<Uint8Array> {
  _topDecode(r: ByteReader) {
    return r.readAll();
  }

  _nestDecode(r: ByteReader) {
    const length = Number(new U32Decoder()._nestDecode(r));
    return r.read(length);
  }
}
