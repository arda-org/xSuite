import { logTitle, runCommand } from "./helpers";

export const setupRustAction = () => {
  logTitle("Installing Rust nightly...");
  runCommand("curl", [
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
    "nightly-2023-03-14",
    "-y",
  ]);
  console.log();
  logTitle("Installing wasm32-unknown-unknown target...");
  runCommand("rustup", ["target", "add", "wasm32-unknown-unknown"]);
  console.log();
  logTitle("Installing multiversx-sc-meta crate...");
  runCommand("cargo", ["install", "multiversx-sc-meta"]);
};
