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
      BaseUserSigner.fromWallet(keystore.data, keystore.password, addressIndex),
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
  data: any;
  password: string;
  kind: "mnemonic" | "secretKey";

  constructor(data: any, password: string) {
    this.data = data;
    this.password = password;
    this.kind = Keystore.getSupportedKeystoreKind(data);
  }

  static async createFile(filePath: string, data?: any) {
    filePath = path.resolve(filePath);
    log(`Creating keystore wallet at "${filePath}"...`);
    const password = await input.hidden("Enter password: ");
    const passwordAgain = await input.hidden("Re-enter password: ");
    if (password !== passwordAgain) {
      throw new Error("Passwords do not match.");
    }
    return this.createFile_unsafe(filePath, password, data);
  }

  static createFile_unsafe(filePath: string, password: string, data?: any) {
    if (data === undefined) {
      const mnemonic = Mnemonic.generate().toString();
      data = UserWallet.fromMnemonic({ mnemonic, password }).toJSON();
    }
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
    return new Keystore(data, password);
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

  static getSupportedKeystoreKind(data: any) {
    const kind = data.kind;
    if (!["mnemonic", "secretKey", undefined].includes(kind)) {
      throw new Error(
        `Invalid kind value: "${kind}". It must be "mnemonic", "secretKey", or undefined.`,
      );
    }
    return kind ?? "secretKey";
  }

  getMnemonicWords() {
    return UserWallet.decryptMnemonic(this.data, this.password).getWords();
  }

  getSecretKey() {
    return UserWallet.decryptSecretKey(this.data, this.password).hex();
  }

  newSigner(addressIndex?: number) {
    return new KeystoreSigner(this, addressIndex);
  }
}
