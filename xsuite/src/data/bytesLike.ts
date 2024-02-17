import { Encodable, isEncodable } from "./Encodable";
import { Bytes, bytesToU8A, isBytes } from "./bytes";
import { u8aToHex } from "./utils";

export type BytesLike = Bytes | Encodable;

export const isBytesLike = (value: unknown): value is BytesLike =>
  isBytes(value) || isEncodable(value);

export const bytesLikeToU8A = (bytesLike: BytesLike) => {
  if (isEncodable(bytesLike)) {
    return bytesLike.toTopU8A();
  }
  return bytesToU8A(bytesLike);
};

export const bytesLikeToHex = (bytesLike: BytesLike) => {
  return u8aToHex(bytesLikeToU8A(bytesLike));
};
