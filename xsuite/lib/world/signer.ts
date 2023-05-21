import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { UserSigner as BaseUserSigner } from "@multiversx/sdk-wallet";
import { AddressEncodable } from "../enc";

export abstract class Signer extends AddressEncodable {
  abstract sign(message: string): Promise<string>;
}

export class DummySigner extends Signer {
  async sign() {
    return "";
  }
}

export class UserSigner extends Signer {
  #signer: BaseUserSigner;

  constructor(signer: BaseUserSigner) {
    super(signer.getAddress().pubkey());
    this.#signer = signer;
  }

  sign(message: string): Promise<string> {
    return this.#signer
      .sign(Buffer.from(message))
      .then((b) => b.toString("hex"));
  }

  static async fromKeystoreFile(...paths: string[]) {
    const p = path.resolve(...paths);
    console.log(`Loading keystore wallet at "${p}"...`);
    const keystore = JSON.parse(fs.readFileSync(p, "utf8"));
    const password = await inputHidden("Enter password: ");
    return new UserSigner(BaseUserSigner.fromWallet(keystore, password));
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
