import { logTitle, logAndRunCommand } from "./helpers";

export const testRustAction = ({ targetDir }: { targetDir?: string }) => {
  logTitle("Testing contract with Rust tests...");
  const args = ["test"];
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  logAndRunCommand("cargo", args);
};
