import { describe, test, expect } from "@jest/globals";
import { ListDecoder } from "./ListDecoder";
import { U32Decoder } from "./UintDecoder";

describe("ListDecoder", () => {
  test("topDecode empty array", () => {
    const result = new ListDecoder(new U32Decoder()).topDecode("");
    expect(result).toEqual([]);
  });

  test("topDecode non-empty array", () => {
    const result = new ListDecoder(new U32Decoder()).topDecode(
      "0000000100000002",
    );
    expect(result).toEqual([1n, 2n]);
  });

  test("nestDecode empty array", () => {
    const result = new ListDecoder(new U32Decoder()).nestDecode("00000000");
    expect(result).toEqual([]);
  });

  test("topDecode empty array", () => {
    const result = new ListDecoder(new U32Decoder()).nestDecode(
      "000000020000000100000002",
    );
    expect(result).toEqual([1n, 2n]);
  });
});
