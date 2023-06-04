import { Command } from "commander";
import { buildAction } from "./buildAction";
import { newAction } from "./newAction";
import { newWalletAction } from "./newWalletAction";
import { requestXegldAction } from "./requestXegldAction";
import { setupRustAction } from "./setupRustAction";
import { testRustAction } from "./testRustAction";

if (process.env["INIT_CWD"]) {
  process.chdir(process.env["INIT_CWD"]);
}

const program = new Command();

program
  .command("setup-rust")
  .description(
    "Install Rust nightly, wasm32-unknown-unknown target, and multiversx-sc-meta crate."
  )
  .action(() => setupRustAction());

program
  .command("new")
  .description("Create a new blank contract.")
  .requiredOption("--dir <dir>", "Contract dir")
  .action((options) => newAction(options));

program
  .command("build [args...]")
  .description("Build contract.")
  .allowUnknownOption()
  .action((args) => buildAction(args));

program
  .command("test-rust")
  .description("Test contract with Rust tests.")
  .action(() => testRustAction());

program
  .command("new-wallet")
  .description("Create a new wallet.")
  .requiredOption("--path <path>", "Wallet path")
  .action((options) => newWalletAction(options));

program
  .command("request-xegld")
  .description("Request 30 xEGLD (once per day).")
  .requiredOption("--wallet <path>", "Wallet path")
  .action((options) => requestXegldAction(options));

program.parse(process.argv);
