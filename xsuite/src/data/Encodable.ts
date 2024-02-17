import { u8aToBase64, u8aToHex } from "./utils";

const encodableSymbol = "xsuite.Encodable";

export abstract class Encodable {
  __kind = encodableSymbol;

  abstract toTopU8A(): Uint8Array;

  abstract toNestU8A(): Uint8Array;

  toTopHex(): string {
    return u8aToHex(this.toTopU8A());
  }

  toNestHex(): string {
    return u8aToHex(this.toNestU8A());
  }

  toTopB64(): string {
    return u8aToBase64(this.toTopU8A());
  }

  toNestB64(): string {
    return u8aToBase64(this.toNestU8A());
  }

  /**
   * @deprecated Use `.toTopU8A` instead.
   */
  toTopBytes(): Uint8Array {
    return this.toTopU8A();
  }

  /**
   * @deprecated Use `.toNestU8A` instead.
   */
  toNestBytes(): Uint8Array {
    return this.toNestU8A();
  }
}

export const isEncodable = (value: unknown): value is Encodable =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === encodableSymbol;
