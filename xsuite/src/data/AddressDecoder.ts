import {
  addressByteLength,
  bechAddressToBytes,
  bytesToBechAddress,
} from "./AddressEncodable";
import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { bytesToHex } from "./utils";

export class AddressDecoder extends AbstractDecoder<string> {
  _fromTop(r: ByteReader) {
    const bytes = r.readExact(addressByteLength);
    return bytesToBechAddress(bytes);
  }

  _fromNest(r: ByteReader) {
    return this._fromTop(r);
  }

  toHex() {
    return this.then((a) => bytesToHex(bechAddressToBytes(a)));
  }
}
