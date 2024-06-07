import { ChildProcess } from "node:child_process";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { Prettify, Replace } from "../helpers";
import { LSProxy } from "../proxy";
import { Block } from "../proxy/lsproxy";
import { killChildProcess } from "./childProcesses";
import { startLsproxyBin } from "./lsproxyBin";
import { DummySigner, Signer } from "./signer";
import { AddressLikeParams, createAddressLike } from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WalletDeployContractTx,
  WorldNewOptions,
  WorldDeployContractTx,
} from "./world";

export class LSWorld extends World {
  proxy: LSProxy;
  server?: ChildProcess;
  sysAcc: LSContract;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
    server,
  }: {
    proxy: LSProxy;
    gasPrice: number;
    explorerUrl?: string;
    server?: ChildProcess;
  }) {
    super({ chainId: "S", proxy, gasPrice, explorerUrl });
    this.proxy = proxy;
    this.server = server;
    this.sysAcc = this.newContract(fullU8AAddress);
  }

  static new(options: LSWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const { proxyUrl, gasPrice, explorerUrl, server } = options;
    return new LSWorld({
      proxy: new LSProxy({ proxyUrl, explorerUrl }),
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
  }: { gasPrice?: number; explorerUrl?: string } = {}): Promise<LSWorld> {
    const { server, proxyUrl } = await startLsproxyBin();
    return LSWorld.new({ proxyUrl, gasPrice, explorerUrl, server });
  }

  newWallet(addressOrSigner: AddressLike | Signer): LSWallet {
    return new LSWallet({
      signer: isAddressLike(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      world: this,
    });
  }

  newContract(address: AddressLike): LSContract {
    return new LSContract({ address, world: this });
  }

  async createWallets(createAccountsParams: LSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("wallet", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newWallet(a.address));
  }

  async createWallet(params: LSWorldCreateAccountParams = {}) {
    return this.createWallets([params]).then((wallets) => wallets[0]);
  }

  async createContracts(createAccountsParams: LSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("vmContract", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newContract(a.address));
  }

  async createContract(params: LSWorldCreateAccountParams = {}) {
    return this.createContracts([params]).then((contracts) => contracts[0]);
  }

  getAllSerializableAccounts() {
    return this.proxy.getAllSerializableAccounts();
  }

  setAccounts(params: LSWorldSetAccountsParams) {
    for (const _params of params) {
      if (_params.code !== undefined) {
        _params.code = expandCode(_params.code);
      }
    }
    return this.proxy.setAccounts(params);
  }

  setAccount(params: LSWorldSetAccountParams) {
    return this.setAccounts([params]);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
  }

  deployContract(tx: WorldDeployContractTx) {
    return super
      .deployContract(tx)
      .then((res) => ({ ...res, contract: this.newContract(res.address) }));
  }

  terminate() {
    if (!this.server) throw new Error("No server defined.");
    killChildProcess(this.server);
  }

  [Symbol.dispose]() {
    this.terminate();
  }

  /**
   * @deprecated Use `.getAllSerializableAccounts` instead.
   */
  getAllSerializableAccountsWithKvs() {
    return this.getAllSerializableAccounts();
  }
}

export class LSWallet extends Wallet {
  world: LSWorld;

  constructor({ signer, world }: { signer: Signer; world: LSWorld }) {
    super({ signer, world });
    this.world = world;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  createContract(params?: LSWalletCreateContractParams) {
    return this.world.createContract({ ...params, owner: this });
  }

  deployContract(tx: WalletDeployContractTx) {
    return this.world.deployContract({ ...tx, sender: this });
  }
}

export class LSContract extends Contract {
  world: LSWorld;

  constructor({ address, world }: { address: AddressLike; world: LSWorld }) {
    super({ address, world });
    this.world = world;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }
}

type LSWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
    }
  | WorldNewOptions;

type LSWorldCreateAccountParams = Prettify<
  Replace<EncodableAccount, { address?: AddressLikeParams }>
>;

type LSWorldSetAccountsParams = EncodableAccount[];

type LSWorldSetAccountParams = EncodableAccount;

type LSAccountSetAccountParams = Prettify<
  Omit<LSWorldSetAccountParams, "address">
>;

type LSWalletCreateContractParams = Prettify<
  Omit<LSWorldCreateAccountParams, "owner">
>;
