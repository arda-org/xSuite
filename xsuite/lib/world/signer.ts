import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
  UserSigner as BaseUserSigner,
  Mnemonic,
  UserWallet,
} from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { AddressEncodable } from "../data";

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

  static createFile(filePath: string, password: string): void;
  static createFile(filePath: string, password?: undefined): Promise<void>;
  static createFile(filePath: string, password?: string): void | Promise<void> {
    filePath = path.resolve(filePath);
    if (fs.existsSync(filePath)) {
      log(chalk.red(`Wallet already exists at ${filePath}`));
      return;
    }
    if (password === undefined) {
      return Promise.resolve().then(async () => {
        log(`Creating new keystore wallet at "${filePath}"...`);
        const password = await inputHidden("Enter password: ");
        const passwordAgain = await inputHidden("Re-enter password: ");
        if (password !== passwordAgain) {
          log(chalk.red("Passwords do not match."));
          return;
        }
        this.createFile(filePath, password);
        log(chalk.green("Wallet successfully created."));
      });
    } else {
      const mnemonic = Mnemonic.generate().toString();
      const keystore = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
      fs.writeFileSync(filePath, JSON.stringify(keystore), "utf8");
    }
  }

  static fromFile(
    filePath: string,
    password: string,
    addressIndex?: number
  ): KeystoreSigner;
  static fromFile(
    filePath: string,
    password?: undefined,
    addressIndex?: number
  ): Promise<KeystoreSigner>;
  static fromFile(
    filePath: string,
    password?: string,
    addressIndex?: number
  ): KeystoreSigner | Promise<KeystoreSigner> {
    if (password === undefined) {
      filePath = path.resolve(filePath);
      log(`Loading keystore wallet at "${filePath}"...`);
      return inputHidden("Enter password: ").then((password) => {
        return this.fromFile(filePath, password, addressIndex);
      });
    } else {
      const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return new KeystoreSigner(keystore, password, addressIndex);
    }
  }
}

function log(...msgs: string[]) {
  process.stdout.write(msgs.join(" ") + "\n");
}

const inputHidden = async (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    const onData = (b: Buffer) => {
      switch (b.toString().slice(-1)) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdin.off("data", onData);
          break;
        default:
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
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
