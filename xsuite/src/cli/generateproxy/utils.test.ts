import { test, expect } from "@jest/globals";
import { splitCommaSeperatedArgs } from "./utils";

test("splitCommaSeperatedArgs splits 'tuple<TokenIdentifier,u64>,BigUint'", () => {
  const commaseperatedTypes = "tuple<TokenIdentifier,u64>,BigUint";
  expect(splitCommaSeperatedArgs(commaseperatedTypes)).toStrictEqual([
    "tuple<TokenIdentifier,u64>",
    "BigUint",
  ]);
});

test("splitCommaSeperatedArgs splits 'BigUint,u8,BigUInt,Tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>'", () => {
  const commaseperatedTypes =
    "BigUint,u8,BigUint,tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>";
  expect(splitCommaSeperatedArgs(commaseperatedTypes)).toStrictEqual([
    "BigUint",
    "u8",
    "BigUint",
    "tuple<tuple<TokenIdentifier,u64>,TokenIdentifier,u16>",
  ]);
});
