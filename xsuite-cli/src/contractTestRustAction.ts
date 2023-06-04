import { logTitle, runCommand } from "./helpers";

export const contractTestRustAction = () => {
  logTitle("Testing contract with Rust tests...");
  runCommand("cargo", ["test"]);
};
