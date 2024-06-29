import { Command } from "commander";
import {
  logTitle,
  logAndRunCommand,
  rustToolchain,
  rustTarget,
} from "./helpers";

export const addInstallRustCmd = (cmd: Command) => {
  cmd
    .command("install-rust")
    .description(
      `Install Rust with rustup: toolchain ${rustToolchain} & target ${rustTarget}.`,
    )
    .option(
      "--toolchain <TOOLCHAIN>",
      `Rust toolchain version, defaults to ${rustToolchain}`,
    )
    .action(action);
};

const action = ({ toolchain }: { toolchain?: string }) => {
  const toolchain2Install = toolchain ? toolchain : rustToolchain;
  logTitle(
    `Installing Rust: toolchain ${toolchain2Install} & target ${rustTarget}...`,
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
    toolchain2Install,
    "-t",
    rustTarget,
    "-y",
  ]);
};
