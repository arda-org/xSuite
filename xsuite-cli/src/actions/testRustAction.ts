import { logTitle, logAndRunCommand } from "./helpers";

export const testRustAction = () => {
  logTitle("Testing contract with Rust tests...");
  logAndRunCommand("cargo", ["test"]);
};
