import { CSProxy } from '../proxy';
import { Contract, expandCode, Wallet, WalletDeployContractParams, World, WorldNewOptions } from './world';
import {
  SAccountSetAccountParams,
  SWorldCreateAccountParams,
  SWorldSetAccountParams,
} from './sworld';
import { startChainSimulator } from './chainSimulator';
import { Keystore, KeystoreSigner, Signer } from './signer';
import { isContractAddress } from './utils';
import walletJson from './wallet.json';
import { EncodableAccount } from '../data/encoding';
import { AddressLike } from '../data/addressLike';

let walletCounter = 0;

export class CSWorld extends World {
  proxy: CSProxy;
  sysAcc: CSContract;
  verbose: boolean;

  constructor({
    proxy,
    gasPrice,
    explorerUrl = "",
    verbose,
  }: {
    proxy: CSProxy;
    gasPrice: number;
    explorerUrl?: string;
    verbose?: boolean;
  }) {
    super({ chainId: 'chain', proxy, gasPrice, explorerUrl });

    this.proxy = proxy;
    this.sysAcc = this.newContract(new Uint8Array(32).fill(255));
    this.verbose = verbose ?? false;
  }

  static new(options: CSWorldNewOptions) {
    if (options.chainId !== undefined) {
      throw new Error('chainId is not undefined.');
    }
    return new CSWorld({
      proxy: new CSProxy(
        { proxyUrl: options.proxyUrl, explorerUrl: options.explorerUrl, },
        options.stopChainSimulator,
        options.autoGenerateBlocks ?? true,
        options.verbose ?? false,
      ),
      gasPrice: options.gasPrice ?? 1000000000,
      explorerUrl: options.explorerUrl,
      verbose: options.verbose,
    });
  }

  static newDevnet(): World {
    throw new Error('newDevnet is not implemented.');
  }

  static newTestnet(): World {
    throw new Error('newTestnet is not implemented.');
  }

  static newMainnet(): World {
    throw new Error('newMainnet is not implemented.');
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
    autoGenerateBlocks?: boolean,
    verbose?: boolean,
    waitFor?: number,
    configFolder?: string,
    debug?: boolean,
  } = {}): Promise<CSWorld> {
    const [proxyUrl, stopChainSimulator] = await startChainSimulator(port, debug, waitFor, configFolder);
    return CSWorld.new({ proxyUrl, stopChainSimulator, gasPrice, explorerUrl, autoGenerateBlocks, verbose });
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

  // TODO:
  async createWallet({ address, ...params }: SWorldCreateAccountParams = {}) {
    walletCounter += 1;
    // Even though the signature is not checked for chain simulator, we still seem to need real address format for the chain validator
    const keystore = new KeystoreSigner(new Keystore(walletJson, ''), walletCounter);
    const wallet = this.newWallet(keystore);
    await wallet.setAccount(params);
    return wallet;
  }

  setAccount(params: SWorldSetAccountParams) {
    return setAccount(this.proxy, params);
  }

  generateBlocks(numBlocks: number = 1) {
    return this.proxy.generateBlocks(numBlocks);
  }

  getInitialWallets() {
    return this.proxy.getInitialWallets();
  }

  terminate() {
    return this.proxy.terminate();
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

  setAccount(params: SAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
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

  constructor({
    address,
    proxy,
  }: {
    address: AddressLike;
    proxy: CSProxy;
  }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(params: SAccountSetAccountParams) {
    return setAccount(this.proxy, { ...params, address: this });
  }
}

const setAccount = (proxy: CSProxy, params: EncodableAccount) => {
  if (params.code == null) {
    if (isContractAddress(params.address)) {
      params.code = '00';
    }
  } else {
    params.code = expandCode(params.code);
  }
  return proxy.setAccount(params);
};

type CSWorldNewOptions =
  | {
  chainId?: undefined;
  proxyUrl: string;
  stopChainSimulator: () => void;
  gasPrice?: number;
  explorerUrl?: string;
  autoGenerateBlocks?: boolean;
  verbose?: boolean;
}
  | WorldNewOptions;
