import { expect, test } from "@jest/globals";
import { inputHidden, stdoutInt } from "./index";

test("inputHidden", async () => {
  stdoutInt.start();
  process.nextTick(() => {
    process.stdin.push("test\n");
  });
  const result = await inputHidden("Query: ");
  stdoutInt.stop();
  expect(stdoutInt.data).toEqual("Query: \n");
  expect(result).toEqual("test");
});
