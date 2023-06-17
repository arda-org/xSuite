export class ByteReader {
  bytes: Uint8Array;
  offset: number;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.offset = 0;
  }

  read(size: number): Uint8Array {
    const end = this.offset + size;
    if (end > this.bytes.length) throw new Error("No remaining byte to read.");
    const result = this.bytes.slice(this.offset, end);
    this.offset += size;
    return result;
  }

  length() {
    return this.bytes.length - this.offset;
  }

  readAll(): Uint8Array {
    return this.read(this.length());
  }

  isConsumed(): boolean {
    return this.offset == this.bytes.length;
  }
}
