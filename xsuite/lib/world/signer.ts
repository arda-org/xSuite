import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
  UserSigner as BaseUserSigner,
  Mnemonic,
  UserWallet,
} from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { AddressEncodable } from "../enc";

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

  static async create(filePath: string) {
    filePath = path.resolve(filePath);
    if (fs.existsSync(filePath)) {
      console.log(chalk.red(`Wallet already exists at ${filePath}`));
      return;
    }
    console.log(`Creating new keystore wallet at "${filePath}"...`);
    const password = await inputHidden("Enter password: ");
    const passwordAgain = await inputHidden("Re-enter password: ");
    if (password !== passwordAgain) {
      console.log(chalk.red("Passwords do not match."));
      return;
    }
    const mnemonic = Mnemonic.generate().toString();
    const keystore = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
    fs.writeFileSync(filePath, JSON.stringify(keystore), "utf8");
    console.log(chalk.green("Wallet successfully created."));
  }

  static fromFile(
    filePath: string,
    password: string,
    addressIndex?: number
  ): UserSigner;
  static fromFile(
    filePath: string,
    password?: undefined,
    addressIndex?: number
  ): Promise<UserSigner>;
  static fromFile(
    filePath: string,
    password?: string,
    addressIndex?: number
  ): UserSigner | Promise<UserSigner> {
    if (password === undefined) {
      filePath = path.resolve(filePath);
      console.log(`Loading keystore wallet at "${filePath}"...`);
      return inputHidden("Enter password: ").then((password) => {
        return this.fromFile(filePath, password, addressIndex);
      });
    } else {
      const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return new KeystoreSigner(keystore, password, addressIndex);
    }
  }
}

const inputHidden = async (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    const onData = (char: string | Buffer) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdin.off("data", onData);
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(query + Array(rl.line.length + 1).join("*"));
          break;
      }
    };

    process.stdin.on("data", onData);

    rl.question(query, resolve);
  });
  rl.close();
  return answer;
};
