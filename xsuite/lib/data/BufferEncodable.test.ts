import { describe, test, expect } from "@jest/globals";
import { BufferEncodable } from "./BufferEncodable";

describe("BufferEncodable", () => {
  describe("top encoding", () => {
    test("empty hex string", () => {
      expect(new BufferEncodable("").toTopHex()).toEqual("");
    });

    test("non-empty hex string", () => {
      expect(new BufferEncodable("48656c6c").toTopHex()).toEqual("48656c6c");
    });

    test("empty number array", () => {
      expect(new BufferEncodable([]).toTopHex()).toEqual("");
    });

    test("non-empty number array", () => {
      expect(new BufferEncodable([72, 101, 108, 108]).toTopHex()).toEqual(
        "48656c6c"
      );
    });

    test("empty Uint8Array", () => {
      expect(new BufferEncodable(new Uint8Array([])).toTopHex()).toEqual("");
    });

    test("non-empty Uint8Array", () => {
      expect(
        new BufferEncodable(new Uint8Array([72, 101, 108, 108])).toTopHex()
      ).toEqual("48656c6c");
    });
  });

  describe("nest encoding", () => {
    test("empty hex string", () => {
      expect(new BufferEncodable("").toNestHex()).toEqual("00000000");
    });

    test("non-empty hex string", () => {
      expect(new BufferEncodable("48656c6c").toNestHex()).toEqual(
        "0000000448656c6c"
      );
    });
  });
});
