import { logTitle, logAndRunCommand } from "./helpers";

export const buildAction = ({ targetDir }: { targetDir?: string }) => {
  logTitle("Building contract...");
  const args = ["run"];
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  args.push("build");
  if (targetDir !== undefined) {
    args.push("--target-dir", targetDir);
  }
  logAndRunCommand("cargo", args, { cwd: "meta" });
};
