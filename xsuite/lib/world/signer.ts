import fs from "node:fs";
import path from "node:path";
import {
  UserSigner as BaseUserSigner,
  Mnemonic,
  UserWallet,
} from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { AddressEncodable } from "../data";
import { inputHidden, log } from "../stdio";

export abstract class Signer extends AddressEncodable {
  abstract sign(data: Buffer): Promise<Buffer>;
}

export class DummySigner extends Signer {
  async sign() {
    return Buffer.from("");
  }
}

export class UserSigner extends Signer {
  #signer: BaseUserSigner;

  constructor(signer: BaseUserSigner) {
    super(signer.getAddress().pubkey());
    this.#signer = signer;
  }

  sign(data: Buffer): Promise<Buffer> {
    return this.#signer.sign(data);
  }
}

export class KeystoreSigner extends UserSigner {
  constructor(keystore: any, password: string, addressIndex?: number) {
    super(BaseUserSigner.fromWallet(keystore, password, addressIndex));
  }

  static createFile(filePath: string, password: string) {
    const mnemonic = Mnemonic.generate().toString();
    const keystore = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
    fs.writeFileSync(filePath, JSON.stringify(keystore), "utf8");
  }

  static async createFileInteractive(filePath: string) {
    filePath = path.resolve(filePath);
    if (fs.existsSync(filePath)) {
      log(chalk.red(`Wallet already exists at ${filePath}`));
      return;
    }
    log(`Creating new keystore wallet at "${filePath}"...`);
    const password = await inputHidden("Enter password: ");
    const passwordAgain = await inputHidden("Re-enter password: ");
    if (password !== passwordAgain) {
      log(chalk.red("Passwords do not match."));
      return;
    }
    this.createFile(filePath, password);
    log(chalk.green("Wallet successfully created."));
  }

  static fromFile(filePath: string, password: string, addressIndex?: number) {
    const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new KeystoreSigner(keystore, password, addressIndex);
  }

  static async fromFileInteractive(filePath: string, addressIndex?: number) {
    filePath = path.resolve(filePath);
    log(`Loading keystore wallet at "${filePath}"...`);
    const password = await inputHidden("Enter password: ");
    return this.fromFile(filePath, password, addressIndex);
  }
}
