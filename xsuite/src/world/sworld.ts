import { Prettify } from "../helpers";
import { SProxy } from "../proxy";
import { Account, Block } from "../proxy/sproxy";
import { DummySigner, Signer } from "./signer";
import { startSimulnet } from "./simulnet";
import { isContractAddress, numberToU8AAddress } from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WalletDeployContractParams,
  WorldNewOptions,
} from "./world";

let walletCounter = 0;
let contractCounter = 0;

export class SWorld extends World {
  proxy: SProxy;
  sysAcc: SContract;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
  }: {
    proxy: SProxy;
    gasPrice: number;
    explorerUrl?: string;
  }) {
    super({ chainId: "S", proxy, gasPrice, explorerUrl });
    this.proxy = proxy;
    this.sysAcc = this.newContract(new Uint8Array(32).fill(255));
  }

  static new(options: SWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    return new SWorld({
      proxy: new SProxy(options.proxyUrl),
      gasPrice: options.gasPrice ?? 0,
      explorerUrl: options.explorerUrl,
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
    const proxyUrl = await startSimulnet();
    return SWorld.new({ proxyUrl, gasPrice, explorerUrl });
  }

  newWallet(signer: Signer): SWallet {
    return new SWallet({
      signer,
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
      baseExplorerUrl: this.explorerUrl,
    });
  }

  newContract(address: string | Uint8Array): SContract {
    return new SContract({
      address,
      proxy: this.proxy,
      baseExplorerUrl: this.explorerUrl,
    });
  }

  async createWallet(params: SWorldCreateWalletParams = {}) {
    walletCounter += 1;
    const address = numberToU8AAddress(walletCounter, false);
    const wallet = this.newWallet(new DummySigner(address));
    await wallet.setAccount(params);
    return wallet;
  }

  setAccount(params: SWorldSetAccountParams) {
    return setAccount(this.proxy, params);
  }

  createContract(params?: SWorldCreateContractParams) {
    return createContract(this.proxy, this.explorerUrl, params);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
  }

  terminate() {
    return this.proxy.terminate();
  }
}

export class SWallet extends Wallet {
  proxy: SProxy;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
    baseExplorerUrl,
  }: {
    signer: Signer;
    proxy: SProxy;
    chainId: string;
    gasPrice: number;
    baseExplorerUrl?: string;
  }) {
    super({ signer, proxy, chainId, gasPrice, baseExplorerUrl });
    this.proxy = proxy;
  }

  setAccount(params: SWalletSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }

  createContract(params?: SWalletCreateContractParams) {
    return createContract(this.proxy, this.baseExplorerUrl, {
      ...params,
      owner: this,
    });
  }

  deployContract(params: WalletDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new SContract({
        address: data.address,
        proxy: this.proxy,
        baseExplorerUrl: this.baseExplorerUrl,
      }),
    }));
  }
}

export class SContract extends Contract {
  proxy: SProxy;

  constructor({
    address,
    proxy,
    baseExplorerUrl,
  }: {
    address: string | Uint8Array;
    proxy: SProxy;
    baseExplorerUrl?: string;
  }) {
    super({ address, proxy, baseExplorerUrl });
    this.proxy = proxy;
  }

  setAccount(params: SContractSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccount = (proxy: SProxy, params: Account) => {
  if (params.code == null) {
    if (isContractAddress(params.address)) {
      params.code = "00";
    }
  } else {
    params.code = expandCode(params.code);
  }
  return proxy.setAccount(params);
};

const createContract = async (
  proxy: SProxy,
  baseExplorerUrl?: string,
  params: CreateContractParams = {},
) => {
  contractCounter += 1;
  const address = numberToU8AAddress(contractCounter, true);
  const contract = new SContract({ address, proxy, baseExplorerUrl });
  await contract.setAccount(params);
  return contract;
};

type SWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
    }
  | WorldNewOptions;

export type SWorldCreateWalletParams = Prettify<Omit<Account, "address">>;

type SetAccountParams = Account;

export type CreateContractParams = Prettify<Omit<Account, "address">>;

export type SWorldSetAccountParams = SetAccountParams;

export type SWorldCreateContractParams = CreateContractParams;

export type SWalletSetAccountParams = Prettify<
  Omit<SWorldSetAccountParams, "address">
>;

export type SWalletCreateContractParams = Prettify<
  Omit<CreateContractParams, "owner">
>;

export type SContractSetAccountParams = SWalletSetAccountParams;
