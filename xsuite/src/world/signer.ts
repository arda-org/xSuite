import fs from "node:fs";
import path from "node:path";
import {
  UserSigner as BaseUserSigner,
  Mnemonic,
  UserWallet,
} from "@multiversx/sdk-wallet";
import { input, log } from "../_stdio";
import { AddressEncodable } from "../data/AddressEncodable";

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
  constructor(keystore: Keystore, addressIndex?: number) {
    super(
      BaseUserSigner.fromWallet(keystore.key, keystore.password, addressIndex),
    );
  }

  static async fromFile(filePath: string, addressIndex?: number) {
    const keystore = await Keystore.fromFile(filePath);
    return keystore.newSigner(addressIndex);
  }

  static fromFile_unsafe(
    filePath: string,
    password: string,
    addressIndex?: number,
  ) {
    const keystore = Keystore.fromFile_unsafe(filePath, password);
    return keystore.newSigner(addressIndex);
  }
}

export class Keystore {
  key: any;
  password: string;

  constructor(key: any, password: string) {
    this.key = key;
    this.password = password;
  }

  static async createFile(filePath: string) {
    filePath = path.resolve(filePath);
    log(`Creating keystore wallet at "${filePath}"...`);
    const password = await input.hidden("Enter password: ");
    const passwordAgain = await input.hidden("Re-enter password: ");
    if (password !== passwordAgain) {
      throw new Error("Passwords do not match.");
    }
    return this.createFile_unsafe(filePath, password);
  }

  static createFile_unsafe(filePath: string, password: string) {
    const mnemonic = Mnemonic.generate().toString();
    const keystore = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
    fs.writeFileSync(filePath, JSON.stringify(keystore), "utf8");
    return new Keystore(keystore, password);
  }

  static async fromFile(filePath: string) {
    filePath = path.resolve(filePath);
    log(`Loading keystore wallet at "${filePath}"...`);
    const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const password = await input.hidden("Enter password: ");
    return new Keystore(keystore, password);
  }

  static fromFile_unsafe(filePath: string, password: string) {
    const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new Keystore(keystore, password);
  }

  getMnemonicWords() {
    return UserWallet.decryptMnemonic(this.key, this.password).getWords();
  }

  newSigner(addressIndex?: number) {
    return new KeystoreSigner(this, addressIndex);
  }
}
