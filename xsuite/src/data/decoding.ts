import { AddressDecoder } from "./AddressDecoder";
import { BufferDecoder } from "./BufferDecoder";
import { BytesDecoder } from "./BytesDecoder";
import { Decoder } from "./Decoder";
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
    return d.Buffer().then((b) => new TextDecoder().decode(b));
  },
  Addr: () => {
    return new AddressDecoder();
  },
  Bool: () => {
    return d.U8().then(Boolean);
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
  Usize: () => {
    return d.U32();
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
  Isize: () => {
    return d.I32();
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
