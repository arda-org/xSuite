import { Prettify } from "../helpers";
import { SProxy } from "../proxy";
import { Account, Block } from "../proxy/sproxy";
import { DummySigner, Signer } from "./signer";
import { startSimulnet } from "./simulnet";
import { isContractAddress, numberToBytesAddress } from "./utils";
import {
  World,
  Contract,
  Wallet,
  expandCode,
  WorldDeployContractParams,
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

  async createWallet(account: SWorldCreateWalletAccount = {}) {
    walletCounter += 1;
    const address = numberToBytesAddress(walletCounter, false);
    const wallet = this.newWallet(new DummySigner(address));
    await wallet.setAccount(account);
    return wallet;
  }

  createContract(account: SWorldCreateContractAccount = {}) {
    return createContract(this.proxy, account, this.explorerUrl);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlock(block);
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

  setAccount(account: SWalletSetAccountAccount) {
    return setAccount(this.proxy, { address: this, ...account });
  }

  createContract(account: SWalletCreateContractAccount = {}) {
    return createContract(
      this.proxy,
      { ...account, owner: this },
      this.baseExplorerUrl,
    );
  }

  deployContract(params: WorldDeployContractParams) {
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

  setAccount(account: SContractSetAccountAccount) {
    return setAccount(this.proxy, { address: this, ...account });
  }
}

const setAccount = (proxy: SProxy, account: Account) => {
  if (account.code == null) {
    if (isContractAddress(account.address)) {
      account.code = "00";
    }
  } else {
    account.code = expandCode(account.code);
  }
  return proxy.setAccount(account);
};

const createContract = async (
  proxy: SProxy,
  account: Omit<Account, "address"> = {},
  baseExplorerUrl?: string,
) => {
  contractCounter += 1;
  const address = numberToBytesAddress(contractCounter, true);
  const contract = new SContract({ address, proxy, baseExplorerUrl });
  await contract.setAccount(account);
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

type SWorldCreateWalletAccount = Prettify<Omit<Account, "address">>;

type SWorldCreateContractAccount = Prettify<Omit<Account, "address">>;

type SWalletSetAccountAccount = Prettify<Omit<Account, "address">>;

type SWalletCreateContractAccount = Prettify<
  Omit<Account, "address" | "owner">
>;

type SContractSetAccountAccount = Omit<Account, "address">;
