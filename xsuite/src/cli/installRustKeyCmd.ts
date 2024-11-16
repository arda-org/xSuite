import { spawnSync } from "child_process";
import { Command } from "commander";
import { log } from "../context";
import { rustTarget } from "./helpers";

export const addInstallRustKeyCmd = (cmd: Command) => {
  cmd
    .command("install-rust-key")
    .description("Return a key caracterizing Rust installation.")
    .action(() => {
      const rustResult = spawnSync("rustc", ["--version"]);
      const rustcVersion = rustResult.stdout
        .toString()
        .trim()
        .replace(/[ ().-]/g, "");
      log(`${rustcVersion}-${rustTarget}`);
    });
};
