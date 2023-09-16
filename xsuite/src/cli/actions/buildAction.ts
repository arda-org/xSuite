import { logTitle, logAndRunCommand } from "./helpers";

export const buildAction = ({ targetDir }: { targetDir?: string }) => {
  logTitle("Building contract...");
  const args = ["all", "build"];
  if (targetDir !== undefined) {
    args.push("--target-dir-all", targetDir);
  }
  logAndRunCommand("sc-meta", args);
};
