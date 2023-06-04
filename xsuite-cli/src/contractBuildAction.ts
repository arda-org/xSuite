import { runCommand } from "./helpers";

export const contractBuildAction = (args: string[]) => {
  runCommand("sc-meta", ["all", "build", ...args], "Building contract...");
};
