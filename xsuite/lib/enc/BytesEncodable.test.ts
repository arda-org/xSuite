import { describe, test, expect } from "@jest/globals";
import { BytesEncodable } from "./BytesEncodable";

describe("BytesEncodable", () => {
  describe("top encoding", () => {
    test("empty hex string", () => {
      expect(new BytesEncodable("").toTopHex()).toEqual("");
    });

    test("non-empty hex string", () => {
      expect(new BytesEncodable("48656c6c").toTopHex()).toEqual("48656c6c");
    });

    test("empty number array", () => {
      expect(new BytesEncodable([]).toTopHex()).toEqual("");
    });

    test("non-empty number array", () => {
      expect(new BytesEncodable([72, 101, 108, 108]).toTopHex()).toEqual(
        "48656c6c"
      );
    });

    test("empty Uint8Array", () => {
      expect(new BytesEncodable(new Uint8Array([])).toTopHex()).toEqual("");
    });

    test("non-empty Uint8Array", () => {
      expect(
        new BytesEncodable(new Uint8Array([72, 101, 108, 108])).toTopHex()
      ).toEqual("48656c6c");
    });
  });

  describe("nest encoding", () => {
    test("empty hex string", () => {
      expect(new BytesEncodable("").toNestHex()).toEqual("");
    });

    test("non-empty hex string", () => {
      expect(new BytesEncodable("48656c6c").toNestHex()).toEqual("48656c6c");
    });
  });
});
