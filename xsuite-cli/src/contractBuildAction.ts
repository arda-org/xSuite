import { logTitle, runCommand } from "./helpers";

export const contractBuildAction = (args: string[]) => {
  logTitle("Building contract...");
  runCommand("sc-meta", ["all", "build", ...args]);
};
