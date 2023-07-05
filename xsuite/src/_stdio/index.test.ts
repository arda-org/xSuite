import { expect, test } from "@jest/globals";
import { input, stdoutInt } from "./index";

test("inputHidden", async () => {
  stdoutInt.start();
  input.injected.push("test");
  const result = await input.hidden("Query: ");
  stdoutInt.stop();
  expect(stdoutInt.data).toEqual("Query: \n");
  expect(result).toEqual("test");
});
