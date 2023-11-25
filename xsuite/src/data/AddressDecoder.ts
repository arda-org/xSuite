import { addressByteLength, bytesToBechAddress } from "./AddressEncodable";
import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";

export class AddressDecoder extends AbstractDecoder<string> {
  _fromTop(r: ByteReader) {
    const bytes = r.readExact(addressByteLength);
    return bytesToBechAddress(bytes);
  }

  _fromNest(r: ByteReader) {
    return this._fromTop(r);
  }
}
