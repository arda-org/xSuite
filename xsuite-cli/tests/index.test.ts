import { execSync } from "node:child_process";
import { it, expect } from "@jest/globals";
import { version } from "../package.json";

it("should return actual version", () => {
  const actualVersion = execSync("pnpm tsx src/index.ts --version")
    .toString()
    .trim();
  expect(actualVersion).toEqual(version);
});
