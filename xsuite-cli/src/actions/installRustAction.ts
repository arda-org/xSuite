import {
  logTitle,
  logAndRunCommand,
  rustToolchain,
  rustTarget,
  rustCrate,
} from "./helpers";

export const installRustAction = () => {
  logTitle(
    `Installing Rust: toolchain ${rustToolchain}, target ${rustTarget}, crate ${rustCrate.name}...`,
  );
  logAndRunCommand("sh", ["-c", `'${installCommand}'`]);
};

const installCommand = [
  `curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain ${rustToolchain} -y`,
  '. "$HOME/.cargo/env"',
  `rustup target add ${rustTarget}`,
  `cargo install ${rustCrate.name} --version ${rustCrate.version}`,
].join(" \\\n    && ");
