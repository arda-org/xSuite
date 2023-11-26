import { bytesToB64, bytesToHex } from "./utils";

export abstract class Encodable {
  abstract toTopBytes(): Uint8Array;

  abstract toNestBytes(): Uint8Array;

  toTopHex(): string {
    return bytesToHex(this.toTopBytes());
  }

  toNestHex(): string {
    return bytesToHex(this.toNestBytes());
  }

  toTopB64(): string {
    return bytesToB64(this.toTopBytes());
  }

  toNestB64(): string {
    return bytesToB64(this.toNestBytes());
  }
}
