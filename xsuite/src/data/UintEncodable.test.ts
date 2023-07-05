import { describe, expect, test } from "@jest/globals";
import { UintEncodable } from "./UintEncodable";

describe("UintEncodable success test cases", () => {
  const successTestCases = [
    [1, 0n, "", "00"],
    [1, 1n, "01", "01"],
    [1, 2n ** 7n - 1n, "7f", "7f"],
    [1, 2n ** 7n, "80", "80"],
    [1, 2n ** 8n - 1n, "ff", "ff"],
    [2, 0n, "", "0000"],
    [2, 1n, "01", "0001"],
    [2, 2n ** 7n - 1n, "7f", "007f"],
    [2, 2n ** 7n, "80", "0080"],
    [2, 2n ** 8n - 1n, "ff", "00ff"],
    [2, 2n ** 8n, "0100", "0100"],
    [2, 2n ** 16n - 1n, "ffff", "ffff"],
    [4, 0n, "", "00000000"],
    [4, 1n, "01", "00000001"],
    [4, 2n ** 7n - 1n, "7f", "0000007f"],
    [4, 2n ** 7n, "80", "00000080"],
    [4, 2n ** 8n - 1n, "ff", "000000ff"],
    [4, 2n ** 8n, "0100", "00000100"],
    [4, 2n ** 16n - 1n, "ffff", "0000ffff"],
    [4, 2n ** 16n, "010000", "00010000"],
    [4, 2n ** 32n - 1n, "ffffffff", "ffffffff"],
    [undefined, 0n, "", "00000000"],
    [undefined, 1n, "01", "0000000101"],
    [undefined, 2n ** 7n - 1n, "7f", "000000017f"],
    [undefined, 2n ** 7n, "80", "0000000180"],
    [undefined, 2n ** 8n - 1n, "ff", "00000001ff"],
    [undefined, 2n ** 8n, "0100", "000000020100"],
    [undefined, 2n ** 16n - 1n, "ffff", "00000002ffff"],
    [undefined, 2n ** 32n - 1n, "ffffffff", "00000004ffffffff"],
  ] as const;

  successTestCases.forEach(([bytes, value, topEncoding, nestedEncoding]) => {
    test(`Bytes: ${bytes}, Value: ${value}, Top-encode`, () => {
      expect(new UintEncodable(value, bytes).toTopHex()).toEqual(topEncoding);
    });
    test(`Bytes: ${bytes}, Value: ${value}, Nest-encode`, () => {
      expect(new UintEncodable(value, bytes).toNestHex()).toEqual(
        nestedEncoding
      );
    });
  });
});

describe("UintEncodable error test cases", () => {
  const errorTestCases = [
    [1, 2n ** 8n, "Number above maximal value allowed."],
    [1, -1n, "Number is negative."],
    [2, 2n ** 16n, "Number above maximal value allowed."],
    [2, -1n, "Number is negative."],
    [4, 2n ** 32n, "Number above maximal value allowed."],
    [4, -1n, "Number is negative."],
  ] as const;

  errorTestCases.forEach(([bytes, value, error]) => {
    test(`Expect error "${error}" for value ${value} with ${bytes} bytes`, () => {
      expect(() => new UintEncodable(value, bytes)).toThrow(error);
    });
  });
});
