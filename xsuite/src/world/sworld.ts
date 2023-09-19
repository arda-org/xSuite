import { SProxy } from "../proxy";
import { DeployContractTxParams } from "../proxy/proxy";
import { Account, Block } from "../proxy/sproxy";
import { DummySigner, Signer } from "./signer";
import { startSimulnet } from "./simulnet";
import { isContractAddress, numberToBytesAddress } from "./utils";
import { World, Contract, Wallet, expandCode } from "./world";

let walletCounter = 0;
let contractCounter = 0;

export class SWorld extends World {
  proxy: SProxy;

  constructor({ proxy, gasPrice }: { proxy: SProxy; gasPrice?: number }) {
    super({ proxy, chainId: "S", gasPrice });
    this.proxy = proxy;
  }

  static new({ proxyUrl, gasPrice }: { proxyUrl: string; gasPrice?: number }) {
    return new SWorld({ proxy: new SProxy(proxyUrl), gasPrice });
  }

  static async start({
    gasPrice,
  }: { gasPrice?: number } = {}): Promise<SWorld> {
    const url = await startSimulnet();
    return SWorld.new({ proxyUrl: url, gasPrice });
  }

  newWallet(signer: Signer): SWallet {
    return new SWallet({
      signer,
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: string | Uint8Array): SContract {
    return new SContract({ address, proxy: this.proxy });
  }

  async createWallet(account: Omit<Account, "address"> = {}) {
    walletCounter += 1;
    const address = numberToBytesAddress(walletCounter, false);
    const wallet = new SWallet({
      signer: new DummySigner(address),
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
    await wallet.setAccount(account);
    return wallet;
  }

  async createContract(account: Omit<Account, "address"> = {}) {
    contractCounter += 1;
    const address = numberToBytesAddress(contractCounter, true);
    const contract = new SContract({ address, proxy: this.proxy });
    await contract.setAccount(account);
    return contract;
  }

  getSystemAccountKvs() {
    return this.proxy.getAccountKvs(systemAccountAddress);
  }

  setSystemAccount(account: Omit<Account, "address">) {
    return setAccount(this.proxy, {
      address: systemAccountAddress,
      ...account,
    });
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
  }: {
    signer: Signer;
    proxy: SProxy;
    chainId: string;
    gasPrice?: number;
  }) {
    super({ signer, proxy, chainId, gasPrice });
    this.proxy = proxy;
  }

  setAccount(account: Omit<Account, "address">) {
    return setAccount(this.proxy, { address: this, ...account });
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return super.deployContract(txParams).then((data) => ({
      ...data,
      contract: new SContract({
        address: data.address,
        proxy: this.proxy,
      }),
    }));
  }
}

export class SContract extends Contract {
  proxy: SProxy;

  constructor({
    address,
    proxy,
  }: {
    address: string | Uint8Array;
    proxy: SProxy;
  }) {
    super({ address, proxy });
    this.proxy = proxy;
  }

  setAccount(account: Omit<Account, "address">) {
    return setAccount(this.proxy, { address: this, ...account });
  }
}

const setAccount = (proxy: SProxy, account: Account) => {
  if (account.code === undefined) {
    if (isContractAddress(account.address)) {
      account.code = "00";
    }
  } else {
    account.code = expandCode(account.code);
  }
  return proxy.setAccount(account);
};

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
