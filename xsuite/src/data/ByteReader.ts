import { Bytes, bytesToU8A } from "./bytes";

export class ByteReader {
  u8a: Uint8Array;
  offset: number;

  constructor(bytes: Bytes) {
    this.u8a = bytesToU8A(bytes);
    this.offset = 0;
  }

  readExact(size: number): Uint8Array {
    if (size > this.remaining()) {
      throw new Error("No remaining byte to read.");
    }
    return this.readAtMost(size);
  }

  readAtMost(size: number): Uint8Array {
    const result = this.u8a.slice(this.offset, this.offset + size);
    this.offset += result.byteLength;
    return result;
  }

  readRemaining(): Uint8Array {
    return this.readExact(this.remaining());
  }

  remaining() {
    return this.u8a.byteLength - this.offset;
  }

  isConsumed(): boolean {
    return this.offset == this.u8a.byteLength;
  }

  assertConsumed() {
    if (!this.isConsumed()) {
      throw new Error("Not all bytes have been read.");
    }
  }
}
