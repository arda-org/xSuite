import { AddressDecoder } from "./AddressDecoder";
import { BufferDecoder } from "./BufferDecoder";
import { BytesDecoder } from "./BytesDecoder";
import { Decoder, postDecode } from "./Decoder";
import { IntDecoder } from "./IntDecoder";
import { ListDecoder } from "./ListDecoder";
import { OptionDecoder } from "./OptionDecoder";
import { DecoderMap, TupleDecoder } from "./TupleDecoder";
import { UintDecoder } from "./UintDecoder";

export const d = {
  /**
   * @deprecated `.CstBuffer` should be used instead.
   */
  Bytes: (byteLength?: number) => {
    return d.CstBuffer(byteLength);
  },
  Buffer: () => {
    return new BufferDecoder();
  },
  CstBuffer: (byteLength?: number) => {
    return new BytesDecoder(byteLength);
  },
  Str: () => {
    return postDecode(new BufferDecoder(), (b) => new TextDecoder().decode(b));
  },
  Addr: () => {
    return new AddressDecoder();
  },
  Bool: () => {
    return postDecode(new UintDecoder(1), (n) => Boolean(n));
  },
  U8: () => {
    return new UintDecoder(1);
  },
  U16: () => {
    return new UintDecoder(2);
  },
  U32: () => {
    return new UintDecoder(4);
  },
  U64: () => {
    return new UintDecoder(8);
  },
  U: () => {
    return new UintDecoder();
  },
  I8: () => {
    return new IntDecoder(1);
  },
  I16: () => {
    return new IntDecoder(2);
  },
  I32: () => {
    return new IntDecoder(4);
  },
  I64: () => {
    return new IntDecoder(8);
  },
  I: () => {
    return new IntDecoder();
  },
  Tuple: <T extends DecoderMap<any>>(decoders: T) => {
    return new TupleDecoder(decoders);
  },
  List: <T>(decoder: Decoder<T>) => {
    return new ListDecoder(decoder);
  },
  Option: <T>(decoder: Decoder<T>) => {
    return new OptionDecoder(decoder);
  },
};
