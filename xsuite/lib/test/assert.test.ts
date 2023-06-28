import { test } from "@jest/globals";
import { assertAccount } from "./assert";

test("assertAccount - empty value", () => {
  assertAccount({ pairs: {} }, { containsStorage: [["00", ""]] });
});
