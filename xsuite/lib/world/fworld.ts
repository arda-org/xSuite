import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  HighlevelAccount,
  Block,
  FProxy,
  DeployContractTxParams,
} from "../proxy";
import { DummySigner, Signer } from "./signer";
import { numberToBytesAddress } from "./utils";
import { World, WorldContract, WorldWallet } from "./world";

export class FWorld extends World {
  declare proxy: FProxy;
  #walletCounter: number;
  #contractCounter: number;

  constructor({ proxy, gasPrice }: { proxy: FProxy; gasPrice?: number }) {
    super({ proxy, chainId: "F", gasPrice });
    this.#walletCounter = 0;
    this.#contractCounter = 0;
  }

  static new({ proxyUrl, gasPrice }: { proxyUrl: string; gasPrice?: number }) {
    return new FWorld({ proxy: new FProxy(proxyUrl), gasPrice });
  }

  static start({ gasPrice }: { gasPrice?: number } = {}): Promise<FWorld> {
    return new Promise((resolve, reject) => {
      let binaryName: string;
      if (os.platform() === "linux") {
        binaryName = "fproxy-Linux";
      } else if (os.platform() === "darwin") {
        binaryName = "fproxy-macOS";
      } else {
        throw new Error("Unsupported platform.");
      }

      const server = spawn(path.join(__dirname, "..", "..", "bin", binaryName));

      server.stdout.on("data", (data: Buffer) => {
        const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
        const match = data.toString().match(addressRegex);
        if (match === null) {
          reject(new Error("FProxy failed starting."));
        } else {
          resolve(FWorld.new({ proxyUrl: match[1], gasPrice }));
        }
      });

      server.stderr.on("data", (data: Buffer) => {
        reject(new Error(data.toString()));
      });

      server.on("error", (error) => {
        reject(error);
      });
    });
  }

  newWallet(signer: Signer): FWorldWallet {
    return new FWorldWallet(this, signer);
  }

  newContract(address: string | Uint8Array): FWorldContract {
    return new FWorldContract(this, address);
  }

  createWallet(): FWorldWallet;
  createWallet(
    account: Omit<HighlevelAccount, "address">
  ): Promise<FWorldWallet>;
  createWallet(
    account?: Omit<HighlevelAccount, "address">
  ): FWorldWallet | Promise<FWorldWallet> {
    this.#walletCounter += 1;
    const address = numberToBytesAddress(this.#walletCounter, false);
    const wallet = new FWorldWallet(this, new DummySigner(address));
    if (account === undefined) {
      return wallet;
    }
    return wallet.setAccount(account).then(() => wallet);
  }

  createContract(): FWorldContract;
  createContract(
    account: Omit<HighlevelAccount, "address">
  ): Promise<FWorldContract>;
  createContract(
    account?: Omit<HighlevelAccount, "address">
  ): FWorldContract | Promise<FWorldContract> {
    this.#contractCounter += 1;
    const bytesAddress = numberToBytesAddress(this.#contractCounter, true);
    const contract = new FWorldContract(this, bytesAddress);
    if (account === undefined) {
      return contract;
    }
    return contract.setAccount(account).then(() => contract);
  }

  setSystemAccount(account: Omit<HighlevelAccount, "address">) {
    return this.setAccount({ address: systemAccountAddress, ...account });
  }

  setAccount(account: HighlevelAccount) {
    return this.proxy.setAccount(account);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlock(block);
  }

  terminate() {
    return this.proxy.terminate();
  }

  deployContract(
    sender: Signer,
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ) {
    return super.deployContract(sender, txParams).then((data) => ({
      ...data,
      deployedContract: new FWorldContract(this, data.deployedAddress),
    }));
  }
}

export class FWorldWallet extends WorldWallet {
  world: FWorld;

  constructor(world: FWorld, signer: Signer) {
    super(world, signer);
    this.world = world;
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }
}

export class FWorldContract extends WorldContract {
  world: FWorld;

  constructor(world: FWorld, address: string | Uint8Array) {
    super(world, address);
    this.world = world;
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }
}

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
