import { logAndRunCommand, logTitle } from "./helpers";

export const uninstallRustAction = () => {
  logTitle("Uninstalling Rust...");
  logAndRunCommand("rustup", ["self", "uninstall"]);
};
