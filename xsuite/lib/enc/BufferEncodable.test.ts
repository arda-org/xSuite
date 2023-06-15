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
