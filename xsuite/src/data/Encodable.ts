import { bytesToB64, bytesToHexString } from "./utils";

export abstract class Encodable {
  abstract toTopBytes(): Uint8Array;

  abstract toNestBytes(): Uint8Array;

  toTopHex(): string {
    return bytesToHexString(this.toTopBytes());
  }

  toNestHex(): string {
    return bytesToHexString(this.toNestBytes());
  }

  toTopB64(): string {
    return bytesToB64(this.toTopBytes());
  }

  toNestB64(): string {
    return bytesToB64(this.toNestBytes());
  }
}
