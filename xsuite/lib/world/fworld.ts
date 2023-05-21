import { spawn } from "node:child_process";
import path from "node:path";
import { AddressEncodable } from "../enc";
import {
  HighlevelAccount,
  Block,
  FProxy,
  Address,
  DeployContractTxParams,
  CallContractTxParams,
} from "../proxy";
import { DummySigner, Signer } from "./signer";
import { numberToBytesAddress } from "./utils";
import { World } from "./world";

export class FWorld extends World {
  declare proxy: FProxy;
  #walletCounter: number;
  #contractCounter: number;

  constructor({ proxy }: { proxy: FProxy }) {
    super({ proxy, chainId: "F" });
    this.#walletCounter = 0;
    this.#contractCounter = 0;
  }

  static new(proxyUrl: string) {
    return new FWorld({ proxy: new FProxy(proxyUrl) });
  }

  static start(): Promise<FWorld> {
    return startFWorld();
  }

  newWallet(): FWorldWallet;
  newWallet(account: Omit<HighlevelAccount, "address">): Promise<FWorldWallet>;
  newWallet(
    account?: Omit<HighlevelAccount, "address">
  ): FWorldWallet | Promise<FWorldWallet> {
    this.#walletCounter += 1;
    const bytesAddress = numberToBytesAddress(this.#walletCounter, false);
    const wallet = new FWorldWallet(this, bytesAddress);
    if (account === undefined) {
      return wallet;
    }
    return wallet.setAccount(account).then(() => wallet);
  }

  newContract(): FWorldContract;
  newContract(
    account: Omit<HighlevelAccount, "address">
  ): Promise<FWorldContract>;
  newContract(
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

export class FWorldWallet extends AddressEncodable {
  world: FWorld;
  signer: Signer;

  constructor(world: FWorld, bytesAddress: Uint8Array) {
    super(bytesAddress);
    this.world = world;
    this.signer = new DummySigner(bytesAddress);
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }

  getAccountWithPairs() {
    return this.world.getAccountWithPairs(this);
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ) {
    return this.world.deployContract(this.signer, txParams);
  }

  callContract(
    callee: Address,
    txParams: Omit<
      CallContractTxParams,
      "sender" | "nonce" | "chainId" | "callee"
    >
  ) {
    return this.world.callContract(this.signer, { callee, ...txParams });
  }
}

export class FWorldContract extends AddressEncodable {
  world: FWorld;

  constructor(world: FWorld, address: string | Uint8Array) {
    super(address);
    this.world = world;
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }

  getAccountWithPairs() {
    return this.world.getAccountWithPairs(this);
  }
}

const startFWorld = (): Promise<FWorld> =>
  new Promise((resolve, reject) => {
    const server = spawn(path.join(__dirname, "..", "..", "fproxy", "fproxy"));

    server.stdout.on("data", (data: Buffer) => {
      const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match === null) {
        reject(new Error("FProxy failed starting."));
      } else {
        resolve(new FWorld({ proxy: new FProxy(match[1]) }));
      }
    });

    server.stderr.on("data", (data: Buffer) => {
      reject(new Error(data.toString()));
    });

    server.on("error", (error) => {
      reject(error);
    });
  });

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
