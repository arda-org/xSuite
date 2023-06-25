import { AddressDecoder } from "./AddressDecoder";
import { AddressEncodable } from "./AddressEncodable";
import { BufferDecoder } from "./BufferDecoder";
import { BufferEncodable } from "./BufferEncodable";
import { BytesDecoder } from "./BytesDecoder";
import { BytesEncodable } from "./BytesEncodable";
import { Decoder, postDecode } from "./Decoder";
import { Encodable } from "./Encodable";
import { IntDecoder } from "./IntDecoder";
import { IntEncodable } from "./IntEncodable";
import { ListDecoder } from "./ListDecoder";
import { ListEncodable } from "./ListEncodable";
import { OptionDecoder } from "./OptionDecoder";
import { OptionEncodable } from "./OptionEncodable";
import { DecoderMap, TupleDecoder } from "./TupleDecoder";
import { TupleEncodable } from "./TupleEncodable";
import { UintDecoder } from "./UintDecoder";
import { UintEncodable } from "./UintEncodable";

export { Encodable, AddressEncodable };

export type Hex = string | Encodable;

export type Address = string | AddressEncodable;

export const hexToBytes = (hex: Hex) => {
  if (typeof hex === "string") {
    hex = e.Bytes(hex);
  }
  return hex.toTopBytes();
};

export const hexToHexString = (hex: Hex) => {
  if (typeof hex === "string") {
    return hex;
  }
  return hex.toTopHex();
};

export const hexToEncodable = (hex: Hex) => {
  if (typeof hex === "string") {
    return new BytesEncodable(hex);
  }
  return hex;
};

export const addressToBytes = (address: Address) => {
  if (typeof address === "string") {
    address = e.Addr(address);
  }
  return address.toTopBytes();
};

export const addressToHexString = (address: Address) => {
  if (typeof address === "string") {
    address = e.Addr(address);
  }
  return address.toTopHex();
};

export function b64ToHex(b64: string) {
  return Array.from(atob(b64), function (char) {
    return char.charCodeAt(0).toString(16).padStart(2, "0");
  }).join("");
}

export const e = {
  Bytes: (bytes: string | number[] | Uint8Array) => {
    return new BytesEncodable(bytes);
  },
  Buffer: (bytes: string | number[] | Uint8Array) => {
    return new BufferEncodable(bytes);
  },
  Str: (string: string) => {
    return new BufferEncodable(new TextEncoder().encode(string));
  },
  Addr: (address: string | Uint8Array) => {
    return new AddressEncodable(address);
  },
  Bool: (boolean: boolean) => {
    return new UintEncodable(Number(boolean), 1);
  },
  U8: (uint: number | bigint) => {
    return new UintEncodable(uint, 1);
  },
  U16: (uint: number | bigint) => {
    return new UintEncodable(uint, 2);
  },
  U32: (uint: number | bigint) => {
    return new UintEncodable(uint, 4);
  },
  U64: (uint: number | bigint) => {
    return new UintEncodable(uint, 8);
  },
  U: (uint: number | bigint) => {
    return new UintEncodable(uint);
  },
  I8: (int: number | bigint) => {
    return new IntEncodable(int, 1);
  },
  I16: (int: number | bigint) => {
    return new IntEncodable(int, 2);
  },
  I32: (int: number | bigint) => {
    return new IntEncodable(int, 4);
  },
  I64: (int: number | bigint) => {
    return new IntEncodable(int, 8);
  },
  I: (int: number | bigint) => {
    return new IntEncodable(int);
  },
  Tuple: (...values: Encodable[]) => {
    return new TupleEncodable(values);
  },
  List: (...values: Encodable[]) => {
    return new ListEncodable(values);
  },
  Option: (optValue: Encodable | null) => {
    return new OptionEncodable(optValue);
  },
};

export const d = {
  Bytes: (byteLength?: number) => {
    return new BytesDecoder(byteLength);
  },
  Buffer: () => {
    return new BufferDecoder();
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
