import { Command } from "commander";
import {
  logTitle,
  logAndRunCommand,
  defaultRustToolchain,
  rustTarget,
} from "./helpers";

export const addInstallRustCmd = (cmd: Command) => {
  cmd
    .command("install-rust")
    .description(
      `Install Rust with rustup: toolchain ${defaultRustToolchain} & target ${rustTarget}.`,
    )
    .option(
      "--toolchain <TOOLCHAIN>",
      `Rust toolchain version (default: ${defaultRustToolchain}).`,
    )
    .action(action);
};

const action = ({
  toolchain = defaultRustToolchain,
}: {
  toolchain: string;
}) => {
  logTitle(`Installing Rust: toolchain ${toolchain} & target ${rustTarget}...`);
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
    toolchain,
    "-t",
    rustTarget,
    "-y",
  ]);
};
