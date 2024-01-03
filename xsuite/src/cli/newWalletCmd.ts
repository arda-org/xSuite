import fs from "node:fs";
import path from "node:path";
import { UserSecretKey, UserWallet } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { Command } from "commander";
import { log } from "../_stdio";
import { Keystore } from "../world/signer";
import { logError, logSuccess } from "./helpers";

export const registerNewWalletCmd = (cmd: Command) => {
  cmd
    .command("new-wallet")
    .description("Create a new wallet.")
    .requiredOption("--wallet <WALLET_PATH>", "Wallet path")
    .option("--password <PASSWORD>", "Wallet password")
    .option("--from-pem <PEM_PATH>", "PEM path")
    .action(action);
};

const action = async ({
  wallet: walletPath,
  password,
  fromPem: pemPath,
}: {
  wallet: string;
  password?: string;
  fromPem?: string;
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
    if (!pemPath) {
      keystore = Keystore.createFile_unsafe(walletPath, password);
    } else {
      const secretKey = UserSecretKey.fromPem(fs.readFileSync(pemPath, "utf8"));
      const wallet = UserWallet.fromSecretKey({ secretKey, password });
      const data = wallet.toJSON();
      keystore = Keystore.createFile_unsafe(walletPath, password, data);
    }
  }
  logSuccess(`Wallet created at "${walletPath}".`);
  log();
  log(chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`);
  if (keystore.kind === "mnemonic") {
    log();
    log(chalk.bold.blue("Private key:"));
    log(
      keystore
        .getMnemonicWords()
        .map((w, i) => `  ${i + 1}. ${w}`)
        .join("\n"),
    );
    log();
    log(chalk.bold.yellow("Please backup the private key in a secure place."));
  }
};
