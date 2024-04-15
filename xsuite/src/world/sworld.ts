import { ChildProcess } from "node:child_process";
import { AddressLike, isAddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { Prettify } from "../helpers";
import { SProxy } from "../proxy";
import { Block } from "../proxy/sproxy";
import { killChildProcess } from "./childProcesses";
import { DummySigner, Signer } from "./signer";
import { startSproxyBin } from "./sproxyBin";
import {
  generateContractU8AAddress,
  generateWalletU8AAddress,
  isContractAddress,
} from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WalletDeployContractParams,
  WorldNewOptions,
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
    this.sysAcc = this.newContract(new Uint8Array(32).fill(255));
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
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: AddressLike): SContract {
    return new SContract({
      address,
      proxy: this.proxy,
    });
  }

  async createWallet({ address, ...params }: SWorldCreateAccountParams = {}) {
    address ??= generateWalletU8AAddress();
    await setAccount(this.proxy, { address, ...params });
    return this.newWallet(new DummySigner(address));
  }

  createContract(params?: SWorldCreateAccountParams) {
    return createContract(this.proxy, params);
  }

  setAccount(params: SWorldSetAccountParams) {
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
}

export class SWallet extends Wallet {
  proxy: SProxy;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
  }: {
    signer: Signer;
    proxy: SProxy;
    chainId: string;
    gasPrice: number;
  }) {
    super({ signer, proxy, chainId, gasPrice });
    this.proxy = proxy;
  }

  setAccount(params: SAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }

  createContract(params?: SWalletCreateContractParams) {
    return createContract(this.proxy, { ...params, owner: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new SContract({ address: data.address, proxy: this.proxy }),
    }));
  }
}

export class SContract extends Contract {
  proxy: SProxy;

  constructor({ address, proxy }: { address: AddressLike; proxy: SProxy }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(params: SAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccount = async (proxy: SProxy, params: EncodableAccount) => {
  if (params.code == null) {
    if (isContractAddress(params.address)) {
      params.code = "00";
    }
  } else {
    params.code = expandCode(params.code);
  }
  await proxy.setAccount(params);
};

const createContract = async (
  proxy: SProxy,
  { address, ...params }: SWorldCreateAccountParams = {},
) => {
  address ??= generateContractU8AAddress();
  await setAccount(proxy, { address, ...params });
  return new SContract({ address, proxy });
};

type SWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
    }
  | WorldNewOptions;

type SWorldCreateAccountParams = Prettify<Partial<EncodableAccount>>;

type SWorldSetAccountParams = EncodableAccount;

type SAccountSetAccountParams = Prettify<
  Omit<SWorldSetAccountParams, "address">
>;

type SWalletCreateContractParams = Prettify<
  Omit<SWorldCreateAccountParams, "owner">
>;
