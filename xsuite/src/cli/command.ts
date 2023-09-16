import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { pkgPath } from "../_pkgPath";
import { buildAction } from "./buildAction";
import { installRustAction } from "./installRustAction";
import { newAction } from "./newAction";
import { newWalletAction } from "./newWalletAction";
import { requestXegldAction } from "./requestXegldAction";
import { scmetaCrate, rustTarget, rustToolchain } from "./rustSettings";
import { testRustAction } from "./testRustAction";
import { testScenAction } from "./testScenAction";
import { uninstallRustAction } from "./uninstallRustAction";

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(pkgPath, "package.json"), "utf-8"),
);

export const command = new Command();

command.version(version);

command
  .command("install-rust")
  .description(
    `Install Rust with rustup: toolchain ${rustToolchain}, target ${rustTarget}, crate ${scmetaCrate.name}.`,
  )
  .action(installRustAction);

command
  .command("uninstall-rust")
  .description("Uninstall Rust with rustup.")
  .action(uninstallRustAction);

command
  .command("new")
  .description("Create a new blank contract.")
  .requiredOption("--dir <DIR>", "Contract dir")
  .option("--starter <STARTER>", "Contract to start from")
  .option("--no-install", "Skip package installation")
  .option("--no-git", "Skip git initialization")
  .action(newAction);

command
  .command("build")
  .description("Build contract.")
  .option("--target-dir <TARGET_DIR>", "Target directory used by Rust compiler")
  .action(buildAction);

command
  .command("test-rust")
  .description("Test contract with Rust tests.")
  .option("--target-dir <TARGET_DIR>", "Target directory used by Rust compiler")
  .action(testRustAction);

command
  .command("test-scen")
  .description("Test contract with scenarios.")
  .action(testScenAction);

command
  .command("new-wallet")
  .description("Create a new wallet.")
  .requiredOption("--wallet <WALLET>", "Wallet path")
  .option("--password <PASSWORD>", "Wallet password")
  .action(newWalletAction);

command
  .command("request-xegld")
  .description("Request 30 xEGLD (once per day).")
  .requiredOption("--wallet <WALLET>", "Wallet path")
  .option("--password <PASSWORD>", "Wallet password")
  .action(requestXegldAction);
