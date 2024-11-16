import { spawnSync } from "node:child_process";
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
      defaultRustToolchain,
    )
    .action(action);
};

const action = ({ toolchain }: { toolchain: string }) => {
  logTitle(`Installing Rust: toolchain ${toolchain} & target ${rustTarget}...`);
  const result = spawnSync("rustup", ["--version"]);
  if (result.status !== 0) {
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
      "-y",
    ]);
  }
  const rustupPath = `${process.env.HOME}/.cargo/bin/rustup`;
  logAndRunCommand(rustupPath, ["default", toolchain]);
  logAndRunCommand(rustupPath, ["target", "add", rustTarget]);
};
