import { runCommand } from "./helpers";

export const contractTestRustAction = () => {
  runCommand("cargo", ["test"], "Testing contract with Rust tests...");
};
