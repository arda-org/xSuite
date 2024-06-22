import { Command } from "commander";
import { logTitle, logAndRunCommand } from "./helpers";

export const addTestRustCmd = (cmd: Command) => {
  cmd
    .command("test-rust")
    .description("Test contract with Rust tests.")
    .option(
      "--target-dir <TARGET_DIR>",
      "Target directory used by Rust compiler",
    )
    .action(action);
};

const action = ({ targetDir }: { targetDir?: string }) => {
  logTitle("Testing contract with Rust tests...");
  const args = ["test"];
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  logAndRunCommand("cargo", args);
};
