import { describe, expect, test } from "@jest/globals";
import { IntEncodable } from "./IntEncodable";

describe("IntEncodable success test cases", () => {
  const successTestCases = [
    [1, 0, "", "00"],
    [1, 2n ** 7n - 1n, "7f", "7f"],
    [1, -1, "ff", "ff"],
    [1, -(2n ** 7n), "80", "80"],
    [2, 0, "", "0000"],
    [2, 2n ** 7n - 1n, "7f", "007f"],
    [2, 2n ** 7n, "0080", "0080"],
    [2, 2n ** 15n - 1n, "7fff", "7fff"],
    [2, -1, "ff", "ffff"],
    [2, -(2n ** 7n), "80", "ff80"],
    [2, -(2n ** 7n) - 1n, "ff7f", "ff7f"],
    [2, -(2n ** 15n), "8000", "8000"],
    [4, 0, "", "00000000"],
    [4, 2n ** 31n - 1n, "7fffffff", "7fffffff"],
    [4, -1, "ff", "ffffffff"],
    [4, -(2n ** 31n), "80000000", "80000000"],
    [8, 0, "", "0000000000000000"],
    [8, 2n ** 63n - 1n, "7fffffffffffffff", "7fffffffffffffff"],
    [8, -1, "ff", "ffffffffffffffff"],
    [8, -(2n ** 63n), "8000000000000000", "8000000000000000"],
    [undefined, 0n, "", "00000000"],
    [undefined, 1n, "01", "0000000101"],
    [undefined, 127n, "7f", "000000017f"],
    [undefined, 128n, "0080", "000000020080"],
    [undefined, 255n, "00ff", "0000000200ff"],
    [undefined, 256n, "0100", "000000020100"],
    [undefined, -1n, "ff", "00000001ff"],
    [undefined, -128n, "80", "0000000180"],
    [undefined, -129n, "ff7f", "00000002ff7f"],
    [undefined, -256n, "ff00", "00000002ff00"],
    [undefined, -257n, "feff", "00000002feff"],
  ] as const;

  successTestCases.forEach(([bytes, value, topEncoding, nestedEncoding]) => {
    test(`Bytes: ${bytes}, Value: ${value}, Top-encode`, () => {
      expect(new IntEncodable(value, bytes).toTopHex()).toEqual(topEncoding);
    });
    test(`Bytes: ${bytes}, Value: ${value}, Nest-encode`, () => {
      expect(new IntEncodable(value, bytes).toNestHex()).toEqual(
        nestedEncoding,
      );
    });
  });
});

describe("IntEncodable error test cases", () => {
  const errorTestCases = [
    [1, 2n ** 7n, "Number above maximal value allowed."],
    [1, -(2n ** 7n) - 1n, "Number below minimal value allowed."],
    [2, 2n ** 15n, "Number above maximal value allowed."],
    [2, -(2n ** 15n) - 1n, "Number below minimal value allowed."],
    [4, 2n ** 31n, "Number above maximal value allowed."],
    [4, -(2n ** 31n) - 1n, "Number below minimal value allowed."],
    [8, 2n ** 63n, "Number above maximal value allowed."],
    [8, -(2n ** 63n) - 1n, "Number below minimal value allowed."],
  ] as const;

  errorTestCases.forEach(([bytes, value, error]) => {
    test(`Expect error "${error}" for value ${value} with ${bytes} bytes`, () => {
      expect(() => new IntEncodable(value, bytes)).toThrow(error);
    });
  });
});
