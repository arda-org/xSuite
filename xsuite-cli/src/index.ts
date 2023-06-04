import { Command } from "commander";
import { contractBuildAction } from "./contractBuildAction";
import { contractNewAction } from "./contractNewAction";
import { contractTestRustAction } from "./contractTestRustAction";
import { setupRustAction } from "./setupRustAction";
import { walletNewAction } from "./walletNewAction";
import { walletRequestXegldAction } from "./walletRequestXegldAction";

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
  .command("contract-new")
  .description("Create a new blank contract.")
  .requiredOption("--dir <dir>", "Contract dir")
  .action((options) => contractNewAction(options));

program
  .command("contract-build [args...]")
  .description("Build contract.")
  .allowUnknownOption()
  .action((args) => contractBuildAction(args));

program
  .command("contract-test-rust")
  .description("Test contract with Rust tests.")
  .action(() => contractTestRustAction());

program
  .command("wallet-new")
  .description("Create a new wallet.")
  .requiredOption("--path <path>", "Wallet path")
  .action((options) => walletNewAction(options));

program
  .command("wallet-request-xegld")
  .description("Request 30 xEGLD (once per day).")
  .requiredOption("--path <path>", "Wallet path")
  .action((options) => walletRequestXegldAction(options));

program.parse(process.argv);
