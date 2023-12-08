import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { log } from "../_stdio";
import { Keystore } from "../world/signer";
import { logError, logSuccess } from "./helpers";

export const registerNewWalletCmd = (cmd: Command) => {
  cmd
    .command("new-wallet")
    .description("Create a new wallet.")
    .requiredOption("--wallet <WALLET>", "Wallet path")
    .option("--password <PASSWORD>", "Wallet password")
    .action(action);
};

const action = async ({
  wallet: walletPath,
  password,
}: {
  wallet: string;
  password?: string;
}) => {
  walletPath = path.resolve(walletPath);
  if (fs.existsSync(walletPath)) {
    logError(`Wallet already exists at "${walletPath}".`);
    return;
  }
  let keystore: Keystore;
  if (password === undefined) {
    try {
      keystore = await Keystore.createFile(walletPath);
      log();
    } catch (err: any) {
      logError(err.message);
      return;
    }
  } else {
    keystore = Keystore.createFile_unsafe(walletPath, password);
  }
  logSuccess(`Wallet created at "${walletPath}".`);
  log();
  log(chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`);
  log();
  log(chalk.bold.blue("Private key:"));
  log(
    keystore
      .getMnemonicWords()
      .map((w, i) => `  ${i + 1}. ${w}`)
      .join("\n"),
  );
  log();
  log(chalk.bold.yellow(`Please backup the private key in a secure place.`));
};
