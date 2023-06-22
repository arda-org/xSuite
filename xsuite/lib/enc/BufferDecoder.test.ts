import { describe, test, expect } from "@jest/globals";
import { BufferDecoder } from "./BufferDecoder";

describe("BufferDecoder", () => {
  test("topDecode", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const result = new BufferDecoder().topDecode(bytes);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  test("nestDecode", () => {
    const bytes = new Uint8Array([0, 0, 0, 4, 1, 2, 3, 4]);
    const result = new BufferDecoder().nestDecode(bytes);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
