import fs from "node:fs";
import path from "node:path";
import { Mnemonic, UserWallet } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { inputHidden } from "./helpers";

export const newWalletAction = async ({
  path: walletPath,
}: {
  path: string;
}) => {
  console.log("Creating a new wallet...");
  const mnemonic = Mnemonic.generate().toString();
  const password = await inputHidden("Enter password: ");
  const passwordAgain = await inputHidden("Re-enter password: ");
  if (password !== passwordAgain) {
    console.log(chalk.red("Passwords do not match."));
    return;
  }
  const keystore = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
  const filePath = path.resolve(process.cwd(), walletPath);
  if (fs.existsSync(filePath)) {
    console.log(chalk.red(`Wallet already exists at ${filePath}`));
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(keystore), "utf8");
  console.log(chalk.green(`Wallet created at ${filePath}`));
};
