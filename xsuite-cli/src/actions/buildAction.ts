import { logTitle, runCommand } from "./helpers";

export const buildAction = (args: string[]) => {
  logTitle("Building contract...");
  runCommand("sc-meta", ["all", "build", ...args]);
};
