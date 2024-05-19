import { ChildProcess } from "node:child_process";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { Prettify } from "../helpers";
import { CSProxy } from "../proxy";
import { getTxStatus } from "../proxy/proxy";
import { killChildProcess } from "./childProcesses";
import { startCsproxyBin } from "./csproxyBin";
import { DummySigner, Signer } from "./signer";
import { generateU8AAddress } from "./utils";
import {
  Contract,
  expandCode,
  Wallet,
  WalletDeployContractParams,
  World,
  WorldDeployContractParams,
  WorldExecuteTxParams,
  WorldNewOptions,
} from "./world";

export class CSWorld extends World {
  proxy: CSProxy;
  server?: ChildProcess;
  sysAcc: CSContract;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
    server,
  }: {
    proxy: CSProxy;
    gasPrice: number;
    explorerUrl?: string;
    server?: ChildProcess;
  }) {
    super({ chainId: "chain", proxy, gasPrice, explorerUrl });

    this.proxy = proxy;
    this.server = server;
    this.sysAcc = this.newContract(fullU8AAddress); // TODO: améliorer ici
  }

  static new(options: CSWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const { proxyUrl, gasPrice, explorerUrl, server } = options;
    return new CSWorld({
      proxy: new CSProxy({
        proxyUrl,
        explorerUrl,
      }),
      gasPrice: gasPrice ?? 1000000000,
      explorerUrl,
      server,
    });
  }

  static newDevnet(): World {
    throw new Error("newDevnet is not implemented.");
  }

  static newTestnet(): World {
    throw new Error("newTestnet is not implemented.");
  }

  static newMainnet(): World {
    throw new Error("newMainnet is not implemented.");
  }

  static async start({
    gasPrice,
    explorerUrl,
    autoGenerateBlocks,
    configFilePath,
    nodeOverrideFilePath,
    debug,
  }: {
    gasPrice?: number;
    explorerUrl?: string;
    autoGenerateBlocks?: boolean;
    configFilePath?: string;
    nodeOverrideFilePath?: string;
    debug?: boolean;
  } = {}): Promise<CSWorld> {
    const { server, proxyUrl } = await startCsproxyBin(
      debug,
      configFilePath,
      nodeOverrideFilePath,
    );
    return CSWorld.new({
      proxyUrl,
      gasPrice,
      explorerUrl,
      server,
      autoGenerateBlocks,
    });
  }

  newWallet(addressOrSigner: AddressLike | Signer): CSWallet {
    return new CSWallet({
      signer: isAddressLike(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      world: this,
    });
  }

  newContract(address: string | Uint8Array): CSContract {
    return new CSContract({ address, world: this });
  }

  async createWallet({ address, ...params }: CSWorldCreateAccountParams = {}) {
    if (
      address === undefined ||
      (typeof address === "object" && "shard" in address)
    ) {
      address = generateU8AAddress({ type: "wallet", shard: address?.shard });
    }
    await this.setAccount({ address, ...params });
    return this.newWallet(new DummySigner(address));
  }

  async createContract({
    address,
    ...params
  }: CSWorldCreateAccountParams = {}) {
    if (
      address === undefined ||
      (typeof address === "object" && "shard" in address)
    ) {
      address = generateU8AAddress({ type: "contract", shard: address?.shard });
    }
    await this.setAccount({ address, ...params });
    return new CSContract({ address, world: this });
  }

  getInitialWallets() {
    return this.proxy.getInitialWallets();
  }

  async setAccounts(params: CSWorldSetAccountsParams) {
    for (const _params of params) {
      if (_params.code !== undefined) {
        _params.code = expandCode(_params.code);
      }
    }
    const result = await this.proxy.setAccounts(params);
    await this.generateBlock(); // TODO-MvX: to be removed once endpoint also generates block
    return result;
  }

  setAccount(params: CSWorldSetAccountParams) {
    return this.setAccounts([params]);
  }

  generateBlocks(numBlocks: number) {
    return this.proxy.generateBlocks(numBlocks);
  }

  generateBlock() {
    return this.proxy.generateBlock();
  }

  // TODO-MvX: replace by the new one that will force skip the epoch
  generateBlocksUntilEpochReached(epoch: number) {
    return this.proxy.generateBlocksUntilEpochReached(epoch);
  }

  // TODO-MvX: to be removed when built-in in chain simulator
  async generateBlocksUntilTxCompleted(txHash: string) {
    // TODO: commencer par checker le state
    await this.generateBlock();
    let res = await this.proxy.getTx(txHash);
    let status = getTxStatus(res);
    while (status.type === "pending") {
      await this.generateBlock();
      res = await this.proxy.getTx(txHash);
      status = getTxStatus(res);
    }
  }

  async sendTx(params: WorldExecuteTxParams) {
    const result = await super.sendTx(params);
    await new Promise((r) => setTimeout(r, 200)); // TODO-MvX: to be removed once they fix this
    return result;
  }

  awaitTx(txHash: string) {
    return this.generateBlocksUntilTxCompleted(txHash);
  }

  terminate() {
    if (!this.server) throw new Error("No server defined.");
    killChildProcess(this.server);
  }

  deployContract(params: WorldDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new CSContract({ address: data.address, world: this }),
    }));
  }
}

export class CSWallet extends Wallet {
  world: CSWorld;

  constructor({ signer, world }: { signer: Signer; world: CSWorld }) {
    super({ signer, world });
    this.world = world;
  }

  setAccount(params: CSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  createContract(params?: CSWalletCreateContractParams) {
    return this.world.createContract({ ...params, owner: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return this.world.deployContract({ ...params, sender: this });
  }
}

export class CSContract extends Contract {
  world: CSWorld;

  constructor({ address, world }: { address: AddressLike; world: CSWorld }) {
    super({ address, world });
    this.world = world;
  }

  setAccount(params: CSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }
}

type CSWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
      autoGenerateBlocks?: boolean;
      waitCompletedTimeout?: number;
    }
  | WorldNewOptions;

export type CSWorldCreateAccountParams = Prettify<
  Partial<
    Omit<EncodableAccount, "address"> & {
      address: AddressLike | { shard: number };
    }
  >
>;

type CSWorldSetAccountsParams = EncodableAccount[];

type CSWorldSetAccountParams = EncodableAccount;

type CSAccountSetAccountParams = Prettify<
  Omit<CSWorldSetAccountParams, "address">
>;

type CSWalletCreateContractParams = Prettify<
  Omit<CSWorldCreateAccountParams, "owner">
>;
