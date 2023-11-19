import { expect, test } from "@jest/globals";
import { input, stdoutInt } from "./index";

test("input.hidden", async () => {
  stdoutInt.start();
  input.inject("test");
  const result = await input.hidden("Query: ");
  stdoutInt.stop();
  expect(stdoutInt.data).toEqual("Query: \n");
  expect(result).toEqual("test");
});
