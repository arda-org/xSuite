import { logTitle, logAndRunCommand } from "./helpers";
import { rustTarget, rustToolchain } from "./rustSettings";

export const installRustAction = () => {
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
