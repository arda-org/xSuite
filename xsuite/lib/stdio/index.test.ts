import { expect, test } from "@jest/globals";
import { inputHidden, stdout } from "./index";

test("inputHidden", async () => {
  stdout.start();
  process.nextTick(() => {
    process.stdin.push("test\n");
  });
  const result = await inputHidden("Query: ");
  stdout.stop();
  expect(stdout.output).toEqual("Query: \n");
  expect(result).toEqual("test");
});
