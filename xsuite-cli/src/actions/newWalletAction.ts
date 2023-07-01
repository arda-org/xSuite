import fs from "node:fs";
import path from "node:path";
import { KeystoreSigner } from "xsuite/world";
import { logError, logSuccess } from "./helpers";

export const newWalletAction = async ({
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
  if (password === undefined) {
    try {
      await KeystoreSigner.createFileInteractive(walletPath);
    } catch (err: any) {
      logError(err.message);
      return;
    }
  } else {
    KeystoreSigner.createFile(walletPath, password);
  }
  logSuccess(`Wallet created at "${walletPath}".`);
};
