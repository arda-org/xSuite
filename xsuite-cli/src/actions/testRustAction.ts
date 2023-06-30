import { logTitle, runCommand } from "./helpers";

export const testRustAction = () => {
  logTitle("Testing contract with Rust tests...");
  runCommand("cargo", ["test"]);
};
