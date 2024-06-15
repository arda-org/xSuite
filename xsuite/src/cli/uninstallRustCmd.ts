import { Command } from "commander";
import { logAndRunCommand, logTitle } from "./helpers";

export const addUninstallRustCmd = (cmd: Command) => {
  cmd
    .command("uninstall-rust")
    .description("Uninstall Rust with rustup.")
    .action(action);
};

const action = () => {
  logTitle("Uninstalling Rust...");
  logAndRunCommand("rustup", ["self", "uninstall"]);
};
