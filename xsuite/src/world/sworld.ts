import { Account, Block, SProxy, DeployContractTxParams } from "../proxy";
import { DummySigner, Signer } from "./signer";
import { startSimulnet } from "./simulnet";
import { isContractAddress, numberToBytesAddress } from "./utils";
import { World, WorldContract, WorldWallet, expandCode } from "./world";

export class SWorld extends World {
  declare proxy: SProxy;
  #walletCounter: number;
  #contractCounter: number;

  constructor({ proxy, gasPrice }: { proxy: SProxy; gasPrice?: number }) {
    super({ proxy, chainId: "S", gasPrice });
    this.#walletCounter = 0;
    this.#contractCounter = 0;
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

  newWallet(signer: Signer): SWorldWallet {
    return new SWorldWallet(this, signer);
  }

  newContract(address: string | Uint8Array): SWorldContract {
    return new SWorldContract(this, address);
  }

  async createWallet(account: Omit<Account, "address"> = {}) {
    this.#walletCounter += 1;
    const address = numberToBytesAddress(this.#walletCounter, false);
    const wallet = new SWorldWallet(this, new DummySigner(address));
    await wallet.setAccount(account);
    return wallet;
  }

  async createContract(account: Omit<Account, "address"> = {}) {
    this.#contractCounter += 1;
    const bytesAddress = numberToBytesAddress(this.#contractCounter, true);
    const contract = new SWorldContract(this, bytesAddress);
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

export class SWorldWallet extends WorldWallet {
  world: SWorld;

  constructor(world: SWorld, signer: Signer) {
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
      contract: new SWorldContract(this.world, data.address),
    }));
  }
}

export class SWorldContract extends WorldContract {
  world: SWorld;

  constructor(world: SWorld, address: string | Uint8Array) {
    super(world, address);
    this.world = world;
  }

  setAccount(account: Omit<Account, "address">) {
    return this.world.setAccount({ address: this, ...account });
  }
}

const systemAccountAddress =
  "erd1lllllllllllllllllllllllllllllllllllllllllllllllllllsckry7t";
