export class ByteReader {
  bytes: Uint8Array;
  offset: number;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.offset = 0;
  }

  readExact(size: number): Uint8Array {
    if (size > this.length()) throw new Error("No remaining byte to read.");
    return this.readAtMost(size);
  }

  readAtMost(size: number): Uint8Array {
    const result = this.bytes.slice(this.offset, this.offset + size);
    this.offset += result.byteLength;
    return result;
  }

  readAll(): Uint8Array {
    return this.readExact(this.length());
  }

  length() {
    return this.bytes.byteLength - this.offset;
  }

  isConsumed(): boolean {
    return this.offset == this.bytes.byteLength;
  }
}
