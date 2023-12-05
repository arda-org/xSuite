import { Command } from "commander";
import {
  logTitle,
  logAndRunCommand,
  rustToolchain,
  rustTarget,
} from "./helpers";

export const registerInstallRustCmd = (cmd: Command) => {
  cmd
    .command("install-rust")
    .description(
      `Install Rust with rustup: toolchain ${rustToolchain} & target ${rustTarget}.`,
    )
    .action(action);
};

const action = () => {
  logTitle(
    `Installing Rust: toolchain ${rustToolchain} & target ${rustTarget}...`,
  );
  logAndRunCommand("curl", [
    "--proto",
    "=https",
    "--tlsv1.2",
    "-sSf",
    "https://sh.rustup.rs",
    "|",
    "sh",
    "-s",
    "--",
    "--default-toolchain",
    rustToolchain,
    "-t",
    rustTarget,
    "-y",
  ]);
};
