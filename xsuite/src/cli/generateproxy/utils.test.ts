import { test, expect } from "vitest";
import { replaceInObject, splitCommaSeparatedArgs } from "./utils";

test("splitCommaSeparatedArgs splits 'tuple<TokenIdentifier,u64>,BigUint'", () => {
  const commaSeparatedTypes = "tuple<TokenIdentifier,u64>,BigUint";
  expect(splitCommaSeparatedArgs(commaSeparatedTypes)).toStrictEqual([
    "tuple<TokenIdentifier,u64>",
    "BigUint",
  ]);
});

test("splitCommaSeparatedArgs splits 'BigUint,u8,BigUInt,Tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>'", () => {
  const commaSeparatedTypes =
    "BigUint,u8,BigUint,tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>";
  expect(splitCommaSeparatedArgs(commaSeparatedTypes)).toStrictEqual([
    "BigUint",
    "u8",
    "BigUint",
    "tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>",
  ]);
});

test("replaceInObject replaces strings", () => {
  const input = {
    test: {
      foo: "test123",
      bar: "test124",
    },
  };

  expect(replaceInObject(input, [["test123", "1337"]])).toStrictEqual({
    test: {
      foo: "1337",
      bar: "test124",
    },
  });
});
