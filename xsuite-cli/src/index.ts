import { Command } from "commander";
import { version } from "../package.json";
import {
  newWalletAction,
  requestXegldAction,
  installRustAction,
  testRustAction,
  testScenAction,
  buildAction,
  newAction,
  uninstallRustAction,
} from "./actions";
import { scmetaCrate, rustTarget, rustToolchain } from "./rustSettings";

if (process.env["PWD"]) {
  process.chdir(process.env["PWD"]);
}

const program = new Command();

program.version(version);

program
  .command("install-rust")
  .description(
    `Install Rust with rustup: toolchain ${rustToolchain}, target ${rustTarget}, crate ${scmetaCrate.name}.`,
  )
  .action(async () => {
    installRustAction();
  });

program
  .command("uninstall-rust")
  .description("Uninstall Rust with rustup.")
  .action(async () => {
    uninstallRustAction();
  });

program
  .command("new")
  .description("Create a new blank contract.")
  .requiredOption("--dir <dir>", "Contract dir")
  .option("--starter <contract>", "Contract to start from")
  .option("--no-install", "Skip package installation")
  .option("--no-git", "Skip git initialization")
  .action(async (options) => {
    await newAction(options);
  });

program
  .command("build [args...]")
  .description("Build contract.")
  .allowUnknownOption()
  .action(async (args) => {
    buildAction(args);
  });

program
  .command("test-rust")
  .description("Test contract with Rust tests.")
  .action(async () => {
    testRustAction();
  });

program
  .command("test-scen")
  .description("Test contract with scenarios.")
  .action(async () => {
    testScenAction();
  });

program
  .command("new-wallet")
  .description("Create a new wallet.")
  .requiredOption("--wallet <wallet>", "Wallet path")
  .option("--password <password>", "Wallet password")
  .action(async (options) => {
    await newWalletAction(options);
  });

program
  .command("request-xegld")
  .description("Request 30 xEGLD (once per day).")
  .requiredOption("--wallet <path>", "Wallet path")
  .option("--password <password>", "Wallet password")
  .action(async (options) => {
    await requestXegldAction(options);
  });

program.parse(process.argv);
