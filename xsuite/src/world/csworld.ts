import { ChildProcess } from "node:child_process";
import { AddressLike } from "../data/addressLike";
import { EncodableAccount } from "../data/encoding";
import { Prettify } from "../helpers";
import { CSProxy } from "../proxy";
import { killChildProcess } from "./childProcesses";
import { startCSproxyBin } from "./csproxyBin";
import { DummySigner, Signer } from "./signer";
import {
  generateContractU8AAddress,
  generateWalletU8AAddress,
  isContractAddress,
} from "./utils";
import {
  Contract,
  expandCode,
  Wallet,
  WalletDeployContractParams,
  World,
  WorldNewOptions,
} from "./world";

export class CSWorld extends World {
  proxy: CSProxy;
  server?: ChildProcess;
  sysAcc: CSContract;
  verbose: boolean;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
    server,
    verbose,
  }: {
    proxy: CSProxy;
    gasPrice: number;
    explorerUrl?: string;
    server?: ChildProcess;
    verbose?: boolean;
  }) {
    super({ chainId: "chain", proxy, gasPrice, explorerUrl });

    this.proxy = proxy;
    this.server = server;
    this.sysAcc = this.newContract(new Uint8Array(32).fill(255));
    this.verbose = verbose ?? false;
  }

  static new(options: CSWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const {
      proxyUrl,
      gasPrice,
      explorerUrl,
      server,
      waitCompletedTimeout,
      verbose,
    } = options;
    return new CSWorld({
      proxy: new CSProxy({
        proxyUrl,
        explorerUrl,
        autoGenerateBlocks: options.autoGenerateBlocks ?? true,
        waitCompletedTimeout,
        verbose: options.verbose ?? false,
      }),
      gasPrice: gasPrice ?? 1000000000,
      explorerUrl,
      server,
      verbose,
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
    port,
    gasPrice,
    explorerUrl,
    autoGenerateBlocks,
    verbose,
    waitFor,
    configFolder,
    debug,
  }: {
    port?: number;
    gasPrice?: number;
    explorerUrl?: string;
    autoGenerateBlocks?: boolean;
    verbose?: boolean;
    waitFor?: number;
    configFolder?: string;
    debug?: boolean;
  } = {}): Promise<CSWorld> {
    const { server, proxyUrl } = await startCSproxyBin(
      port,
      debug,
      waitFor,
      configFolder,
    );
    return CSWorld.new({
      proxyUrl,
      gasPrice,
      explorerUrl,
      server,
      autoGenerateBlocks,
      verbose,
    });
  }

  // TODO:
  newWallet(signer: Signer): CSWallet {
    return new CSWallet({
      signer,
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: string | Uint8Array): CSContract {
    return new CSContract({
      address,
      proxy: this.proxy,
    });
  }

  async createWallet({ address, ...params }: CSWorldCreateAccountParams = {}) {
    address ??= generateWalletU8AAddress();
    await setAccount(this.proxy, { address, ...params });
    return this.newWallet(new DummySigner(address));
  }

  createContract(params?: CSWorldCreateAccountParams) {
    return createContract(this.proxy, params);
  }

  setAccount(params: EncodableAccount) {
    return setAccount(this.proxy, params);
  }

  generateBlocks(numBlocks: number) {
    return this.proxy.generateBlocks(numBlocks);
  }

  generateBlock() {
    return this.proxy.generateBlock();
  }

  generateBlocksUntilEpochReached(epoch: number) {
    return this.proxy.generateBlocksUntilEpochReached(epoch);
  }

  getInitialWallets() {
    return this.proxy.getInitialWallets();
  }

  terminate() {
    if (!this.server) throw new Error("No server defined.");
    killChildProcess(this.server);
  }
}

export class CSWallet extends Wallet {
  proxy: CSProxy;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
  }: {
    signer: Signer;
    proxy: CSProxy;
    chainId: string;
    gasPrice: number;
  }) {
    super({ signer, proxy, chainId, gasPrice });
    this.proxy = proxy;
  }

  setAccount(params: CSAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }

  createContract(params?: CSWalletCreateContractParams) {
    return createContract(this.proxy, { ...params, owner: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return super.deployContract(params).then((data) => ({
      ...data,
      contract: new CSContract({
        address: data.address,
        proxy: this.proxy,
      }),
    }));
  }
}

export class CSContract extends Contract {
  proxy: CSProxy;

  constructor({ address, proxy }: { address: AddressLike; proxy: CSProxy }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(params: CSAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccount = (proxy: CSProxy, params: EncodableAccount) => {
  if (params.code == null) {
    if (isContractAddress(params.address)) {
      params.code = "00";
    }
  } else {
    params.code = expandCode(params.code);
  }
  return proxy.setAccount(params);
};

export const createContract = async (
  proxy: CSProxy,
  { address, ...params }: CSWorldCreateAccountParams = {},
) => {
  address ??= generateContractU8AAddress();
  await setAccount(proxy, { address, ...params });
  return new CSContract({ address, proxy });
};

type CSWorldNewOptions =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
      autoGenerateBlocks?: boolean;
      waitCompletedTimeout?: number;
      verbose?: boolean;
    }
  | WorldNewOptions;

export type CSWorldCreateAccountParams = Prettify<Partial<EncodableAccount>>;

type CSAccountSetAccountParams = Prettify<Omit<EncodableAccount, "address">>;

type CSWalletCreateContractParams = Prettify<
  Omit<CSWorldCreateAccountParams, "owner">
>;
