import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { log } from "xsuite/dist/stdio";
import { KeystoreSigner } from "xsuite/world";

export const newWalletAction = async ({
  wallet: walletPath,
  password,
}: {
  wallet: string;
  password?: string;
}) => {
  walletPath = path.resolve(walletPath);
  if (fs.existsSync(walletPath)) {
    log(chalk.red(`Wallet already exists at "${walletPath}"`));
    return;
  }
  if (password === undefined) {
    try {
      await KeystoreSigner.createFileInteractive(walletPath);
    } catch (err) {
      if (err instanceof Error) {
        log(chalk.red(err.message));
        return;
      } else {
        throw err;
      }
    }
  } else {
    KeystoreSigner.createFile(walletPath, password);
  }
  log(chalk.green(`Wallet created at "${walletPath}"`));
};
