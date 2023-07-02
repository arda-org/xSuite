import { test } from "@jest/globals";
import { assertAccount, assertTxReturnData } from "./assert";

test("assertAccount", () => {
  assertAccount(
    {
      pairs: {
        "01": "01",
      },
    },
    {
      containsStorage: [
        ["01", "01"],
        ["02", ""],
      ],
    }
  );
});

test("assertTxReturnData - empty value", () => {
  assertTxReturnData(["00"], ["00"]);
});
