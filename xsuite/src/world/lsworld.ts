import { ChildProcess } from "node:child_process";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { isContract } from "../data/utils";
import { Prettify } from "../helpers";
import { LSProxy } from "../proxy";
import { Block } from "../proxy/lsproxy";
import { killChildProcess } from "./childProcesses";
import { startLsproxyBin } from "./lsproxyBin";
import { DummySigner, Signer } from "./signer";
import { generateU8AAddress } from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WalletDeployContractParams,
  WorldNewOptions,
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
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: AddressLike): LSContract {
    return new LSContract({
      address,
      proxy: this.proxy,
    });
  }

  async createWallet({ address, ...params }: LSWorldCreateAccountParams = {}) {
    address ??= generateU8AAddress({ type: "wallet" });
    await setAccount(this.proxy, { address, ...params });
    return this.newWallet(new DummySigner(address));
  }

  createContract(params?: LSWorldCreateAccountParams) {
    return createContract(this.proxy, params);
  }

  getAllSerializableAccounts() {
    return this.proxy.getAllSerializableAccounts();
  }

  setAccounts(params: LSWorldSetAccountsParams) {
    return setAccounts(this.proxy, params);
  }

  setAccount(params: LSWorldSetAccountParams) {
    return setAccount(this.proxy, params);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
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

export class LSWallet extends Wallet {
  proxy: LSProxy;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
  }: {
    signer: Signer;
    proxy: LSProxy;
    chainId: string;
    gasPrice: number;
  }) {
    super({ signer, proxy, chainId, gasPrice });
    this.proxy = proxy;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }

  createContract(params?: LSWalletCreateContractParams) {
    return createContract(this.proxy, { ...params, owner: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new LSContract({ address: data.address, proxy: this.proxy }),
    }));
  }
}

export class LSContract extends Contract {
  proxy: LSProxy;

  constructor({ address, proxy }: { address: AddressLike; proxy: LSProxy }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccounts = async (proxy: LSProxy, params: EncodableAccount[]) => {
  for (const _params of params) {
    if (_params.code == null) {
      if (isContract(_params.address)) {
        _params.code = "00";
      }
    } else {
      _params.code = expandCode(_params.code);
    }
  }
  await proxy.setAccounts(params);
};

const setAccount = async (proxy: LSProxy, params: EncodableAccount) => {
  return setAccounts(proxy, [params]);
};

const createContract = async (
  proxy: LSProxy,
  { address, ...params }: LSWorldCreateAccountParams = {},
) => {
  address ??= generateU8AAddress({ type: "vmContract" });
  await setAccount(proxy, { address, ...params });
  return new LSContract({ address, proxy });
};

type LSWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
    }
  | WorldNewOptions;

type LSWorldCreateAccountParams = Prettify<Partial<EncodableAccount>>;

type LSWorldSetAccountsParams = EncodableAccount[];

type LSWorldSetAccountParams = EncodableAccount;

type LSAccountSetAccountParams = Prettify<
  Omit<LSWorldSetAccountParams, "address">
>;

type LSWalletCreateContractParams = Prettify<
  Omit<LSWorldCreateAccountParams, "owner">
>;
