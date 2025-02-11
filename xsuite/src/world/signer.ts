import fs from "node:fs";
import path from "node:path";
import {
  UserSigner as BaseUserSigner,
  UserWallet,
} from "@multiversx/sdk-wallet";
import { log, readHidden } from "../context";
import { Account } from "./account";

export abstract class Signer extends Account {
  abstract sign(data: Uint8Array): Promise<Uint8Array>;
}

export class DummySigner extends Signer {
  sign(): Promise<Uint8Array> {
    return Promise.resolve(Buffer.from("00"));
  }
}

export class UserSigner extends Signer {
  #signer: BaseUserSigner;

  constructor(signer: BaseUserSigner) {
    super(signer.getAddress().pubkey());
    this.#signer = signer;
  }

  sign(data: Uint8Array): Promise<Uint8Array> {
    return this.#signer.sign(Buffer.from(data));
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
    this.kind = getSupportedKeystoreKind(data);
  }

  static async fromFile(filePath: string) {
    filePath = path.resolve(filePath);
    log(`Loading keystore wallet at "${filePath}"...`);
    const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const password = await readHidden("Enter password: ");
    return new Keystore(keystore, password);
  }

  static fromFile_unsafe(filePath: string, password: string) {
    const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return new Keystore(keystore, password);
  }

  getMnemonicWords() {
    if (this.kind !== "mnemonic") {
      throw new Error(
        `Cannot get mnemonic from a keystore of kind ${this.kind}.`,
      );
    }
    return UserWallet.decryptMnemonic(this.data, this.password).getWords();
  }

  getSecretKey() {
    if (this.kind && this.kind !== "secretKey") {
      throw new Error(
        `Cannot get secretKey from a keystore of kind ${this.kind}.`,
      );
    }
    return UserWallet.decryptSecretKey(this.data, this.password).hex();
  }

  newSigner(addressIndex?: number) {
    return new KeystoreSigner(this, addressIndex);
  }
}

function getSupportedKeystoreKind(data: any) {
  const kind = data.kind;
  if (!["mnemonic", "secretKey", undefined].includes(kind)) {
    throw new Error(
      `Invalid kind value: "${kind}". It must be "mnemonic", "secretKey", or undefined.`,
    );
  }
  return kind ?? "secretKey";
}
