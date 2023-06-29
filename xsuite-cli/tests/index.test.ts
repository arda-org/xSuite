import { execSync } from "node:child_process";
import { test, expect } from "@jest/globals";
import { version } from "../package.json";

const execCli = (args: string) => execSync(`pnpm tsx src/index.ts ${args}`);

test("--version", () => {
  expect(execCli("--version").toString()).toEqual(`${version}\n`);
});
