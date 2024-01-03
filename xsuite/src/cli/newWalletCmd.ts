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
    .option("--from-wallet <WALLET_PATH>", "Wallet path")
    .action(action);
};

const action = async ({
  wallet: walletPath,
  password,
  fromPem: fromPemPath,
  fromWallet: fromWalletPath,
}: {
  wallet: string;
  password?: string;
  fromPem?: string;
  fromWallet?: string;
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
    let data;
    if (fromPemPath && fromWalletPath) {
      throw new Error(
        "Both --from-pem and --from-wallet options cannot be set simultaneously.",
      );
    }
    if (fromPemPath) {
      const secretKey = UserSecretKey.fromPem(
        fs.readFileSync(fromPemPath, "utf8"),
      );
      const wallet = UserWallet.fromSecretKey({ secretKey, password });
      data = wallet.toJSON();
    }
    if (fromWalletPath) {
      const oldKeystore = await Keystore.fromFile(fromWalletPath);
      const newWallet =
        oldKeystore.kind === "mnemonic"
          ? UserWallet.fromMnemonic({
              mnemonic: oldKeystore.getMnemonicWords().join(" "),
              password,
            })
          : UserWallet.fromSecretKey({
              secretKey: UserSecretKey.fromString(oldKeystore.getSecretKey()),
              password,
            });
      data = newWallet.toJSON();
    }
    keystore = Keystore.createFile_unsafe(walletPath, password, data);
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
