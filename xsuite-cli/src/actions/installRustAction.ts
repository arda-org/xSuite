import { log } from "xsuite/_stdio";
import {
  logTitle,
  logAndRunCommand,
  rustToolchain,
  rustTarget,
  rustCrate,
} from "./helpers";

export const installRustAction = () => {
  logTitle(`Installing Rust toolchain ${rustToolchain}...`);
  logAndRunCommand("curl", [
    "--proto",
    "'=https'",
    "--tlsv1.2",
    "-sSf",
    "https://sh.rustup.rs",
    "|",
    "sh",
    "-s",
    "--",
    "--default-toolchain",
    rustToolchain,
    "-y",
  ]);
  log();
  logTitle(`Installing Rust target ${rustTarget}...`);
  logAndRunCommand("rustup", ["target", "add", rustTarget]);
  log();
  logTitle(`Installing Rust crate ${rustCrate}...`);
  logAndRunCommand("cargo", ["install", rustCrate, "--version", "0.41.0"]);
};
