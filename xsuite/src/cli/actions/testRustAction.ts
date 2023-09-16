import { logTitle, logAndRunCommand } from "./helpers";

export const testRustAction = ({ targetDir }: { targetDir?: string }) => {
  logTitle("Testing contract with Rust tests...");
  logAndRunCommand("cargo", ["test"], {
    env: { ...process.env, CARGO_TARGET_DIR: targetDir },
  });
};
