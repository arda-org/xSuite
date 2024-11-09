import { ChildProcess, spawn } from "node:child_process";
import { lsproxyBinaryPath } from "@xsuite/light-simulnet";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import {
  EncodableAccount,
  EncodableEsdt,
  EncodableKvs,
  EncodableMapper,
} from "../data/encoding";
import { Prettify, Replace } from "../helpers";
import { LSProxy } from "../proxy";
import { Block } from "../proxy/lsproxy";
import { DummySigner, Signer } from "./signer";
import {
  AddressLikeParams,
  createAddressLike,
  expandCodeInAccounts,
} from "./utils";
import {
  World,
  Contract,
  Wallet,
  WalletDeployContractTx,
  WorldNewParams,
  WorldDeployContractTx,
} from "./world";

export class LSWorld extends World {
  proxy: LSProxy;
  server?: ChildProcess;
  sysAcc: LSContract;

  constructor({
    proxy,
    gasPrice,
    explorerUrl,
    server,
  }: {
    proxy: LSProxy;
    gasPrice: number;
    explorerUrl?: string;
    server?: ChildProcess;
  }) {
    super({ chainId: "S", proxy, gasPrice, explorerUrl });
    this.proxy = proxy;
    this.server = server;
    this.sysAcc = this.newContract(fullU8AAddress);
  }

  static new(params: LSWorldNewParams) {
    if (params.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const { proxyUrl, gasPrice, explorerUrl, server } = params;
    return new LSWorld({
      proxy: new LSProxy({ proxyUrl, explorerUrl }),
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
    binaryPath,
    binaryPort,
  }: {
    gasPrice?: number;
    explorerUrl?: string;
    binaryPath?: string;
    binaryPort?: number;
  } = {}): Promise<LSWorld> {
    binaryPath ??= lsproxyBinaryPath;
    binaryPort ??= 0;

    const server = spawn(binaryPath, ["--server-port", `${binaryPort}`]);

    server.stderr.on("data", (data: Buffer) => {
      throw new Error(data.toString());
    });

    server.on("error", (error) => {
      throw error;
    });

    const proxyUrl = await new Promise<string>((resolve) => {
      server.stdout.on("data", (data: Buffer) => {
        const addressRegex = /Server running on (http:\/\/[\w\d.:]+)/;
        const match = data.toString().match(addressRegex);
        if (match) {
          resolve(match[1]);
        }
      });
    });

    return this.new({ proxyUrl, gasPrice, explorerUrl, server });
  }

  newWallet(addressOrSigner: AddressLike | Signer): LSWallet {
    return new LSWallet({
      signer: isAddressLike(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      world: this,
    });
  }

  newContract(address: AddressLike): LSContract {
    return new LSContract({ address, world: this });
  }

  getNetworkStatus() {
    return this.proxy.getNetworkStatus(0);
  }

  async createWallets(createAccountsParams: LSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("wallet", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newWallet(a.address));
  }

  createWallet(params: LSWorldCreateAccountParams = {}) {
    return this.createWallets([params]).then((wallets) => wallets[0]);
  }

  async createContracts(createAccountsParams: LSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("vmContract", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newContract(a.address));
  }

  createContract(params: LSWorldCreateAccountParams = {}) {
    return this.createContracts([params]).then((contracts) => contracts[0]);
  }

  getAllSerializableAccounts() {
    return this.proxy.getAllSerializableAccounts();
  }

  setAccounts(params: LSWorldSetAccountsParams) {
    expandCodeInAccounts(params);
    return this.proxy.setAccounts(params);
  }

  setAccount(params: LSWorldSetAccountParams) {
    return this.setAccounts([params]);
  }

  updateAccounts(params: LSWorldSetAccountParams[]) {
    expandCodeInAccounts(params);
    return this.proxy.updateAccounts(params);
  }

  updateAccount(params: LSWorldSetAccountParams) {
    return this.updateAccounts([params]);
  }

  setCurrentBlockInfo(block: Block) {
    return this.proxy.setCurrentBlockInfo(block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.proxy.setPreviousBlockInfo(block);
  }

  async advanceTimestamp(amount: number) {
    const networkStatus = await this.getNetworkStatus();
    return this.setCurrentBlockInfo({
      ...networkStatus,
      timestamp: networkStatus.blockTimestamp + amount,
    });
  }

  async advanceNonce(amount: number) {
    const networkStatus = await this.getNetworkStatus();
    return this.setCurrentBlockInfo({
      ...networkStatus,
      nonce: networkStatus.nonce + amount,
    });
  }

  async advanceRound(amount: number) {
    const networkStatus = await this.getNetworkStatus();
    return this.setCurrentBlockInfo({
      ...networkStatus,
      round: networkStatus.round + amount,
    });
  }

  async advanceEpoch(amount: number) {
    const networkStatus = await this.getNetworkStatus();
    return this.setCurrentBlockInfo({
      ...networkStatus,
      epoch: networkStatus.epoch + amount,
    });
  }

  resolveDeployContracts(txHashes: string[]) {
    return super
      .resolveDeployContracts(txHashes)
      .then((rs) => rs.map((r) => this.addContractPostTx(r)));
  }

  resolveDeployContract(txHash: string) {
    return super
      .resolveDeployContract(txHash)
      .then((r) => this.addContractPostTx(r));
  }

  protected addContractPostTx<T extends { address: string }>(
    res: T,
  ): Prettify<Replace<T, { contract: LSContract }>> {
    return { ...res, contract: this.newContract(res.address) };
  }

  deployContracts(txs: WorldDeployContractTx[]) {
    return super
      .deployContracts(txs)
      .then((rs) => rs.map((r) => this.addContractPostTx(r)));
  }

  deployContract(tx: WorldDeployContractTx) {
    return super.deployContract(tx).then((r) => this.addContractPostTx(r));
  }

  addKvs(address: AddressLike, kvs: EncodableKvs) {
    return this.updateAccount({
      address,
      kvs: [kvs],
    });
  }

  addEsdts(address: AddressLike, esdts: EncodableEsdt[]) {
    return this.updateAccount({
      address,
      kvs: [{ esdts }],
    });
  }

  addMappers(address: AddressLike, mappers: EncodableMapper[]) {
    return this.updateAccount({
      address,
      kvs: [{ mappers }],
    });
  }

  terminate() {
    this.server?.kill();
  }

  [Symbol.dispose]() {
    this.terminate();
  }

  /**
   * @deprecated Use `.getAllSerializableAccounts` instead.
   */
  getAllSerializableAccountsWithKvs() {
    return this.getAllSerializableAccounts();
  }
}

export class LSWallet extends Wallet {
  world: LSWorld;

  constructor({ signer, world }: { signer: Signer; world: LSWorld }) {
    super({ signer, world });
    this.world = world;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  updateAccount(params: LSAccountSetAccountParams) {
    return this.world.updateAccount({ ...params, address: this });
  }

  createContract(params?: LSWalletCreateContractParams) {
    return this.world.createContract({ ...params, owner: this });
  }

  deployContract(tx: WalletDeployContractTx) {
    return this.world.deployContract({ ...tx, sender: this });
  }

  addKvs(kvs: EncodableKvs) {
    return this.world.addKvs(this, kvs);
  }

  addEsdts(esdts: EncodableEsdt[]) {
    return this.world.addEsdts(this, esdts);
  }
}

export class LSContract extends Contract {
  world: LSWorld;

  constructor({ address, world }: { address: AddressLike; world: LSWorld }) {
    super({ address, world });
    this.world = world;
  }

  setAccount(params: LSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  updateAccount(params: LSAccountSetAccountParams) {
    return this.world.updateAccount({ ...params, address: this });
  }

  addKvs(kvs: EncodableKvs) {
    return this.world.addKvs(this, kvs);
  }

  addEsdts(esdts: EncodableEsdt[]) {
    return this.world.addEsdts(this, esdts);
  }

  addMappers(mappers: EncodableMapper[]) {
    return this.world.addMappers(this, mappers);
  }
}

type LSWorldNewParams =
  | {
      chainId?: undefined;
      proxyUrl: string;
      gasPrice?: number;
      explorerUrl?: string;
      server?: ChildProcess;
    }
  | WorldNewParams;

type LSWorldCreateAccountParams = Prettify<
  Replace<EncodableAccount, { address?: AddressLikeParams }>
>;

type LSWorldSetAccountsParams = EncodableAccount[];

type LSWorldSetAccountParams = EncodableAccount;

type LSAccountSetAccountParams = Prettify<
  Omit<LSWorldSetAccountParams, "address">
>;

type LSWalletCreateContractParams = Prettify<
  Omit<LSWorldCreateAccountParams, "owner">
>;
