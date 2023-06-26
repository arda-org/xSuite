import {
  HighlevelAccount,
  Block,
  FProxy,
  DeployContractTxParams,
} from "../proxy";
import { startFProxyServer } from "./fproxyServer";
import { DummySigner, Signer } from "./signer";
import { numberToBytesAddress } from "./utils";
import { World, WorldContract, WorldWallet } from "./world";

export class FWorld extends World {
  declare proxy: FProxy;
  #walletCounter: number;
  #contractCounter: number;

  constructor({ proxy, gasPrice }: { proxy: FProxy; gasPrice?: number }) {
    super({ proxy, chainId: "F", gasPrice });
    this.#walletCounter = 0;
    this.#contractCounter = 0;
  }

  static new({ proxyUrl, gasPrice }: { proxyUrl: string; gasPrice?: number }) {
    return new FWorld({ proxy: new FProxy(proxyUrl), gasPrice });
  }

  static async start({
    gasPrice,
  }: { gasPrice?: number } = {}): Promise<FWorld> {
    const url = await startFProxyServer();
    return FWorld.new({ proxyUrl: url, gasPrice });
  }

  newWallet(signer: Signer): FWorldWallet {
    return new FWorldWallet(this, signer);
  }

  newContract(address: string | Uint8Array): FWorldContract {
    return new FWorldContract(this, address);
  }

  createWallet(): FWorldWallet;
  createWallet(
    account: Omit<HighlevelAccount, "address">
  ): Promise<FWorldWallet>;
  createWallet(
    account?: Omit<HighlevelAccount, "address">
  ): FWorldWallet | Promise<FWorldWallet> {
    this.#walletCounter += 1;
    const address = numberToBytesAddress(this.#walletCounter, false);
    const wallet = new FWorldWallet(this, new DummySigner(address));
    if (account === undefined) {
      return wallet;
    }
    return wallet.setAccount(account).then(() => wallet);
  }

  createContract(): FWorldContract;
  createContract(
    account: Omit<HighlevelAccount, "address">
  ): Promise<FWorldContract>;
  createContract(
    account?: Omit<HighlevelAccount, "address">
  ): FWorldContract | Promise<FWorldContract> {
    this.#contractCounter += 1;
    const bytesAddress = numberToBytesAddress(this.#contractCounter, true);
    const contract = new FWorldContract(this, bytesAddress);
    if (account === undefined) {
      return contract;
    }
    return contract.setAccount(account).then(() => contract);
  }

  getSystemAccountPairs() {
    return this.getAccountPairs(systemAccountAddress);
  }

  setSystemAccount(account: Omit<HighlevelAccount, "address">) {
    return this.setAccount({ address: systemAccountAddress, ...account });
  }

  setAccount(account: HighlevelAccount) {
    return this.proxy.setAccount(account);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlock(block);
  }

  terminate() {
    return this.proxy.terminate();
  }
}

export class FWorldWallet extends WorldWallet {
  world: FWorld;

  constructor(world: FWorld, signer: Signer) {
    super(world, signer);
    this.world = world;
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ) {
    return this.world.deployContract(this, txParams).then((data) => ({
      ...data,
      contract: new FWorldContract(this.world, data.address),
    }));
  }
}

export class FWorldContract extends WorldContract {
  world: FWorld;

  constructor(world: FWorld, address: string | Uint8Array) {
    super(world, address);
    this.world = world;
  }

  setAccount(account: Omit<HighlevelAccount, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }
}

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
