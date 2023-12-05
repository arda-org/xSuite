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
  Buffer: () => {
    return new BufferDecoder();
  },
  TopBuffer: () => {
    return new BytesDecoder();
  },
  Str: () => {
    return d.Buffer().then((b) => new TextDecoder().decode(b));
  },
  TopStr: () => {
    return d.TopBuffer().then((b) => d.Str().fromTop(b));
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
  TopU: () => {
    return d.TopBuffer().then((b) => d.U().fromTop(b));
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
  TopI: () => {
    return d.TopBuffer().then((b) => d.I().fromTop(b));
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
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  Bytes: () => {
    return d.TopBuffer();
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  CstBuffer: () => {
    return d.TopBuffer();
  },
};
