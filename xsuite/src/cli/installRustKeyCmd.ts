import { Command } from "commander";
import { log } from "../context";
import { rustKey } from "./helpers";

export const addInstallRustKeyCmd = (cmd: Command) => {
  cmd
    .command("install-rust-key")
    .description(`Return a key caracterizing Rust settings (${rustKey}).`)
    .action(() => {
      log(rustKey);
    });
};
