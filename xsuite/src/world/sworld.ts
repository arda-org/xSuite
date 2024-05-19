import { ChildProcess } from "node:child_process";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { Prettify } from "../helpers";
import { SProxy } from "../proxy";
import { Block } from "../proxy/sproxy";
import { killChildProcess } from "./childProcesses";
import { DummySigner, Signer } from "./signer";
import { startSproxyBin } from "./sproxyBin";
import { generateU8AAddress } from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WalletDeployContractParams,
  WorldNewOptions,
  WorldDeployContractParams,
} from "./world";

export class SWorld extends World {
  proxy: SProxy;
  server?: ChildProcess;
  sysAcc: SContract;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
    server,
  }: {
    proxy: SProxy;
    gasPrice: number;
    explorerUrl?: string;
    server?: ChildProcess;
  }) {
    super({ chainId: "S", proxy, gasPrice, explorerUrl });
    this.proxy = proxy;
    this.server = server;
    this.sysAcc = this.newContract(fullU8AAddress);
  }

  static new(options: SWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const { proxyUrl, gasPrice, explorerUrl, server } = options;
    return new SWorld({
      proxy: new SProxy({ proxyUrl, explorerUrl }),
      gasPrice: gasPrice ?? 0,
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
  }: { gasPrice?: number; explorerUrl?: string } = {}): Promise<SWorld> {
    const { server, proxyUrl } = await startSproxyBin();
    return SWorld.new({ proxyUrl, gasPrice, explorerUrl, server });
  }

  newWallet(addressOrSigner: AddressLike | Signer): SWallet {
    return new SWallet({
      signer: isAddressLike(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      world: this,
    });
  }

  newContract(address: AddressLike): SContract {
    return new SContract({ address, world: this });
  }

  async createWallet({ address, ...params }: SWorldCreateAccountParams = {}) {
    if (
      address === undefined ||
      (typeof address === "object" && "shard" in address)
    ) {
      address = generateU8AAddress({ type: "wallet", shard: address?.shard });
    }
    await this.setAccount({ address, ...params });
    return this.newWallet(new DummySigner(address));
  }

  async createContract({ address, ...params }: SWorldCreateAccountParams = {}) {
    if (
      address === undefined ||
      (typeof address === "object" && "shard" in address)
    ) {
      address = generateU8AAddress({ type: "contract", shard: address?.shard });
    }
    await this.setAccount({ address, ...params });
    return new SContract({ address, world: this });
  }

  getAllSerializableAccounts() {
    return this.proxy.getAllSerializableAccounts();
  }

  async setAccounts(params: SWorldSetAccountsParams) {
    for (const _params of params) {
      if (_params.code !== undefined) {
        _params.code = expandCode(_params.code);
      }
    }
    return await this.proxy.setAccounts(params);
  }

  setAccount(params: SWorldSetAccountParams) {
    return this.setAccounts([params]);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
  }

  deployContract(params: WorldDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new SContract({ address: data.address, world: this }),
    }));
  }

  terminate() {
    if (!this.server) throw new Error("No server defined.");
    killChildProcess(this.server);
  }

  /**
   * @deprecated Use `.getAllSerializableAccounts` instead.
   */
  getAllSerializableAccountsWithKvs() {
    return this.getAllSerializableAccounts();
  }
}

export class SWallet extends Wallet {
  world: SWorld;

  constructor({ signer, world }: { signer: Signer; world: SWorld }) {
    super({ signer, world });
    this.world = world;
  }

  setAccount(params: SAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  createContract(params?: SWalletCreateContractParams) {
    return this.world.createContract({ ...params, owner: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return this.world.deployContract({ ...params, sender: this });
  }
}

export class SContract extends Contract {
  world: SWorld;

  constructor({ address, world }: { address: AddressLike; world: SWorld }) {
    super({ address, world });
    this.world = world;
  }

  setAccount(params: SAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }
}

type SWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
    }
  | WorldNewOptions;

type SWorldCreateAccountParams = Prettify<
  Partial<
    Omit<EncodableAccount, "address"> & {
      address: AddressLike | { shard: number };
    }
  >
>;

type SWorldSetAccountsParams = EncodableAccount[];

type SWorldSetAccountParams = EncodableAccount;

type SAccountSetAccountParams = Prettify<
  Omit<SWorldSetAccountParams, "address">
>;

type SWalletCreateContractParams = Prettify<
  Omit<SWorldCreateAccountParams, "owner">
>;
