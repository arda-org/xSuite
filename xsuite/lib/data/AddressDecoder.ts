import { addressByteLength, bytesToBech32 } from "./AddressEncodable";
import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";

export class AddressDecoder extends AbstractDecoder<string> {
  _topDecode(r: ByteReader) {
    const bytes = r.readExact(addressByteLength);
    return bytesToBech32(bytes);
  }

  _nestDecode(r: ByteReader) {
    return this._topDecode(r);
  }
}
