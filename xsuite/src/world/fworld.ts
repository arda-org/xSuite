import { Account, Block, FProxy, DeployContractTxParams } from "../proxy";
import { startFProxyServer } from "./fproxyServer";
import { DummySigner, Signer } from "./signer";
import { isContractAddress, numberToBytesAddress } from "./utils";
import { World, WorldContract, WorldWallet, expandCode } from "./world";

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

  async createWallet(account: Omit<Account, "address"> = {}) {
    this.#walletCounter += 1;
    const address = numberToBytesAddress(this.#walletCounter, false);
    const wallet = new FWorldWallet(this, new DummySigner(address));
    await wallet.setAccount(account);
    return wallet;
  }

  async createContract(account: Omit<Account, "address"> = {}) {
    this.#contractCounter += 1;
    const bytesAddress = numberToBytesAddress(this.#contractCounter, true);
    const contract = new FWorldContract(this, bytesAddress);
    await contract.setAccount(account);
    return contract;
  }

  getSystemAccountPairs() {
    return this.getAccountPairs(systemAccountAddress);
  }

  setSystemAccount(account: Omit<Account, "address">) {
    return this.setAccount({ address: systemAccountAddress, ...account });
  }

  setAccount(account: Account) {
    if (account.code === undefined) {
      if (isContractAddress(account.address)) {
        account.code = "00";
      }
    } else {
      account.code = expandCode(account.code);
    }
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

  setAccount(account: Omit<Account, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
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

  setAccount(account: Omit<Account, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }
}

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
