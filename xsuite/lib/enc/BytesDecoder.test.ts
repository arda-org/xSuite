import { describe, test, expect } from "@jest/globals";
import { BytesDecoder } from "./BytesDecoder";

describe("BytesDecoder", () => {
  test("topDecode when no byteLength is set", () => {
    const result = new BytesDecoder().topDecode([0, 1, 2, 3]);
    expect(result).toEqual(new Uint8Array([0, 1, 2, 3]));
  });

  test("topDecode when byteLength is set", () => {
    const result = new BytesDecoder(2).topDecode([0, 1, 2, 3]);
    expect(result).toEqual(new Uint8Array([0, 1]));
  });

  test("nestDecode when no byteLength is set", () => {
    const result = new BytesDecoder().nestDecode([0, 1, 2, 3]);
    expect(result).toEqual(new Uint8Array([0, 1, 2, 3]));
  });

  test("nestDecode when byteLength is set", () => {
    const result = new BytesDecoder(2).nestDecode([0, 1, 2, 3]);
    expect(result).toEqual(new Uint8Array([0, 1]));
  });
});
