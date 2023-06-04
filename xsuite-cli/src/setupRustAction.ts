import { runCommand } from "./helpers";

export const setupRustAction = () => {
  runCommand(
    "curl",
    [
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
    ],
    "Installing Rust nightly..."
  );
  runCommand(
    "rustup",
    ["target", "add", "wasm32-unknown-unknown"],
    "Installing wasm32-unknown-unknown target..."
  );
  runCommand(
    "cargo",
    ["install", "multiversx-sc-meta"],
    "Installing multiversx-sc-meta crate..."
  );
};
