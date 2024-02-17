import {
  addressByteLength,
  bechAddressToU8AAddress,
  u8aAddressToBechAddress,
} from "./AddressEncodable";
import { ByteReader } from "./ByteReader";
import { AbstractDecoder } from "./Decoder";
import { u8aToHex } from "./utils";

export class AddressDecoder extends AbstractDecoder<string> {
  _fromTop(r: ByteReader) {
    return u8aAddressToBechAddress(r.readExact(addressByteLength));
  }

  _fromNest(r: ByteReader) {
    return this._fromTop(r);
  }

  toHex() {
    return this.then((a) => u8aToHex(bechAddressToU8AAddress(a)));
  }
}
