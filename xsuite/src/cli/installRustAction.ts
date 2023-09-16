import { logTitle, logAndRunCommand } from "./helpers";
import { scmetaCrate, rustTarget, rustToolchain } from "./rustSettings";

export const installRustAction = () => {
  logTitle(
    `Installing Rust: toolchain ${rustToolchain}, target ${rustTarget}, crate ${scmetaCrate.name}...`,
  );
  logAndRunCommand("sh", ["-c", `'${installCommand}'`]);
};

const installCommand = [
  `curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain ${rustToolchain} -y`,
  '. "$HOME/.cargo/env"',
  `rustup target add ${rustTarget}`,
  `cargo install ${scmetaCrate.name} --version ${scmetaCrate.version}`,
].join(" \\\n    && ");
