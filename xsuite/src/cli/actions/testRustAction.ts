import { SpawnSyncOptionsWithBufferEncoding } from "node:child_process";
import { logTitle, logAndRunCommand } from "./helpers";

export const testRustAction = (
  options?: SpawnSyncOptionsWithBufferEncoding,
) => {
  logTitle("Testing contract with Rust tests...");
  logAndRunCommand("cargo", ["test"], options);
};
