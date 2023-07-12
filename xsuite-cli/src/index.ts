import { Command } from "commander";
import { version } from "../package.json";
import {
  newWalletAction,
  requestXegldAction,
  setupRustAction,
  testRustAction,
  buildAction,
  newAction,
} from "./actions";

if (process.env["INIT_CWD"]) {
  process.chdir(process.env["INIT_CWD"]);
}

const program = new Command();

program.version(version);

program
  .command("setup-rust")
  .description(
    "Install Rust nightly, wasm32-unknown-unknown target, and multiversx-sc-meta crate.",
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
  .requiredOption("--wallet <wallet>", "Wallet path")
  .option("--password <password>", "Wallet password")
  .action((options) => newWalletAction(options));

program
  .command("request-xegld")
  .description("Request 30 xEGLD (once per day).")
  .requiredOption("--wallet <path>", "Wallet path")
  .option("--password <password>", "Wallet password")
  .action((options) => requestXegldAction(options));

program.parse(process.argv);
