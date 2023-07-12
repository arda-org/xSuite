import { SpawnSyncOptionsWithBufferEncoding } from "child_process";
import { logTitle, logAndRunCommand } from "./helpers";

export const buildAction = (
  args: string[],
  options?: SpawnSyncOptionsWithBufferEncoding,
) => {
  logTitle("Building contract...");
  logAndRunCommand("sc-meta", ["all", "build", ...args], options);
};
