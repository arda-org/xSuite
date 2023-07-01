import { logTitle, logAndRunCommand } from "./helpers";

export const buildAction = (args: string[]) => {
  logTitle("Building contract...");
  logAndRunCommand("sc-meta", ["all", "build", ...args]);
};
