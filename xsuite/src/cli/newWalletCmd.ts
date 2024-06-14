import fs from "node:fs";
import path from "node:path";
import { UserSecretKey, UserWallet, Mnemonic } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { Command } from "commander";
import { input, log } from "../_stdio";
import { getAddressShard, numShards } from "../data/utils";
import { Keystore } from "../world/signer";
import { logError, logSuccess } from "./helpers";

export const addNewWalletCmd = (cmd: Command) => {
  cmd
    .command("new-wallet")
    .description("Create a new wallet.")
    .requiredOption("--wallet <WALLET_PATH>", "Wallet path")
    .option("--password <PASSWORD>", "Wallet password")
    .option("--from-pem <PEM_PATH>", "PEM path")
    .option("--from-wallet <WALLET_PATH>", "Wallet path")
    .option("--shard <SHARD>", "Shard of the wallet", parseInt)
    .action(action);
};

const action = async ({
  wallet: walletPath,
  password,
  fromPem: fromPemPath,
  fromWallet: fromWalletPath,
  shard,
}: {
  wallet: string;
  password?: string;
  fromPem?: string;
  fromWallet?: string;
  shard?: number;
}) => {
  walletPath = path.resolve(walletPath);
  if (fs.existsSync(walletPath)) {
    logError(`Wallet already exists at "${walletPath}".`);
    return;
  }
  if (password === undefined) {
    log(`Creating keystore wallet at "${walletPath}"...`);
    password = await input.hidden("Enter password: ");
    const passwordAgain = await input.hidden("Re-enter password: ");
    if (password !== passwordAgain) {
      logError("Passwords do not match.");
      return;
    }
    log();
  }
  let data;
  if (fromPemPath !== undefined) {
    if (data !== undefined) {
      logError("Multiple wallet sources have been specified.");
      return;
    }
    const secretKey = UserSecretKey.fromPem(
      fs.readFileSync(fromPemPath, "utf8"),
    );
    const wallet = UserWallet.fromSecretKey({ secretKey, password });
    data = wallet.toJSON();
  }
  if (fromWalletPath !== undefined) {
    if (data !== undefined) {
      logError("Multiple wallet sources have been specified.");
      return;
    }
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
  if (shard !== undefined) {
    if (data !== undefined) {
      logError("Multiple wallet sources have been specified.");
      return;
    }
    if (shard < 0 || shard >= numShards) {
      logError("The shard you entered does not exist.");
      return;
    }
    let mnemonic: string;
    let shardOfMnemonic: number;
    do {
      const _mnemonic = Mnemonic.generate();
      const pubKey = _mnemonic.deriveKey().generatePublicKey().valueOf();
      mnemonic = _mnemonic.toString();
      shardOfMnemonic = getAddressShard(pubKey);
    } while (shardOfMnemonic !== shard);
    data = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
  }
  if (data === undefined) {
    const mnemonic = Mnemonic.generate().toString();
    data = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
  }

  fs.writeFileSync(walletPath, JSON.stringify(data), "utf8");
  const keystore = new Keystore(data, password);
  const signer = keystore.newSigner();
  logSuccess(`Wallet created at "${walletPath}".`);
  log();
  log(chalk.bold.blue("Address:") + ` ${keystore.newSigner()}`);
  log();
  log(chalk.bold.blue("Shard:") + ` ${getAddressShard(signer)}`);
  if (keystore.kind === "mnemonic") {
    log();
    log(chalk.bold.blue("Mnemonic phrase:"));
    log(
      keystore
        .getMnemonicWords()
        .map((w, i) => `  ${i + 1}. ${w}`)
        .join("\n"),
    );
    log();
    log(
      chalk.bold.yellow("Please backup the mnemonic phrase in a secure place."),
    );
  }
};
