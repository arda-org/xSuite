import { ChildProcess } from "node:child_process";
import { Address, isAddress } from "../data/address";
import { EncodableAccount } from "../data/encoding";
import { Prettify } from "../helpers";
import { SProxy } from "../proxy";
import { Block } from "../proxy/sproxy";
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
    const { server, proxyUrl } = await startSimulnet();
    return SWorld.new({ proxyUrl, gasPrice, explorerUrl, server });
  }

  newWallet(addressOrSigner: Address | Signer): SWallet {
    return new SWallet({
      signer: isAddress(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: Address): SContract {
    return new SContract({
      address,
      proxy: this.proxy,
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
    return createContract(this.proxy, params);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
  }

  terminate() {
    return this.server?.kill();
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

  setAccount(params: SWalletSetAccountParams) {
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

  constructor({ address, proxy }: { address: Address; proxy: SProxy }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(params: SContractSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccount = (proxy: SProxy, params: EncodableAccount) => {
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
  params: CreateContractParams = {},
) => {
  contractCounter += 1;
  const address = numberToU8AAddress(contractCounter, true);
  const contract = new SContract({ address, proxy });
  await contract.setAccount(params);
  return contract;
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

type SWorldCreateWalletParams = Prettify<Omit<EncodableAccount, "address">>;

type SetAccountParams = EncodableAccount;

type CreateContractParams = Prettify<Omit<EncodableAccount, "address">>;

type SWorldSetAccountParams = SetAccountParams;

type SWorldCreateContractParams = CreateContractParams;

type SWalletSetAccountParams = Prettify<
  Omit<SWorldSetAccountParams, "address">
>;

type SWalletCreateContractParams = Prettify<
  Omit<CreateContractParams, "owner">
>;

type SContractSetAccountParams = SWalletSetAccountParams;
