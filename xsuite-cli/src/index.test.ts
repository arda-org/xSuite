import { execSync } from "node:child_process";
import { test, expect } from "@jest/globals";
import { version } from "../package.json";

test("xsuite version command should return current version", () => {
  const actualVersion = execSync("pnpm xsuite --version").toString().trim();
  expect(actualVersion).toEqual(version);
});
