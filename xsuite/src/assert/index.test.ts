import { test, expect } from "vitest";
import { fullBechAddress, zeroBechAddress } from "../data/address";
import { assertAccount, assertVs, assertHexList } from ".";

test("assertVs - matching", () => {
  assertVs(["00"], ["00"]);
});

test("assertVs - not matching", () => {
  expect(() => assertVs(["00"], ["01"])).toThrow();
});

test("assertAccount - matching", () => {
  assertAccount(
    {
      address: zeroBechAddress,
      balance: 10n,
      code: "010203",
      codeMetadata: "0400",
      owner: zeroBechAddress,
      kvs: {
        "01": "01",
        "02": "02",
      },
    },
    {
      address: zeroBechAddress,
      balance: 10n,
      code: "010203",
      codeMetadata: ["readable"],
      owner: zeroBechAddress,
      kvs: [
        ["01", "01"],
        ["02", "02"],
        ["03", ""],
      ],
      hasKvs: [
        ["01", "01"],
        ["03", ""],
      ],
    },
  );
});

test("assertAccount - not matching - address", () => {
  expect(() =>
    assertAccount({ address: zeroBechAddress }, { address: fullBechAddress }),
  ).toThrow();
});

test("assertAccount - not matching - balance", () => {
  expect(() => assertAccount({ balance: 10n }, { balance: 11n })).toThrow();
});

test("assertAccount - not matching - code", () => {
  expect(() => assertAccount({ code: "010203" }, { code: "010204" })).toThrow();
});

test("assertAccount - not matching - codeMetadata", () => {
  expect(() =>
    assertAccount({ codeMetadata: "0400" }, { codeMetadata: ["payable"] }),
  ).toThrow();
});

test("assertAccount - not matching - owner", () => {
  expect(() =>
    assertAccount({ owner: zeroBechAddress }, { owner: fullBechAddress }),
  ).toThrow();
});

test("assertAccount - not matching - kvs - value not matching", () => {
  expect(() =>
    assertAccount(
      {
        kvs: { "01": "01", "02": "" },
      },
      {
        kvs: [
          ["01", "01"],
          ["02", "02"],
        ],
      },
    ),
  ).toThrow();
});

test("assertAccount - no side effect", () => {
  const acc = {
    kvs: {
      "01": "01",
      "02": "02",
    },
  };
  const accStrBefore = JSON.stringify(acc);
  assertAccount(acc, { hasKvs: [] });
  const accStrAfter = JSON.stringify(acc);
  expect(accStrAfter).toEqual(accStrBefore);
});

test("assertAccount - not matching - kvs - key missing", () => {
  expect(() =>
    assertAccount(
      {
        kvs: { "01": "01" },
      },
      {
        kvs: [
          ["01", "01"],
          ["03", "03"],
        ],
      },
    ),
  ).toThrow();
});

test("assertAccount - not matching - kvs - key in excess", () => {
  expect(() =>
    assertAccount(
      {
        kvs: { "01": "01", "02": "02" },
      },
      {
        kvs: [["01", "01"]],
      },
    ),
  ).toThrow();
});

test("assertAccount - not matching - hasKvs - value not matching", () => {
  expect(() =>
    assertAccount(
      {
        kvs: {
          "01": "01",
          "02": "02",
        },
      },
      {
        hasKvs: [
          ["01", "01"],
          ["02", ""],
        ],
      },
    ),
  ).toThrow("'02': '02'");
});

test("assertAccount - not matching - hasKvs - value missing", () => {
  expect(() =>
    assertAccount(
      {
        kvs: {
          "01": "01",
        },
      },
      {
        hasKvs: [
          ["01", "01"],
          ["03", "03"],
        ],
      },
    ),
  ).toThrow("'03': ''");
});

test("assertHexList - matching", () => {
  assertHexList(["00"], ["00"]);
});

test("assertHexList - not matching", () => {
  expect(() => assertHexList(["00"], ["01"])).toThrow();
});
