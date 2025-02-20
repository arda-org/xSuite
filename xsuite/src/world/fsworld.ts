import { ChildProcess, spawn } from "node:child_process";
import { fsproxyBinaryPath, fsproxyConfigsPath } from "@xsuite/full-simulnet";
import { fullU8AAddress } from "../data/address";
import { AddressLike, isAddressLike } from "../data/addressLike";
import {
  EncodableAccount,
  EncodableEsdt,
  EncodableKvs,
  EncodableMapper,
} from "../data/encoding";
import { Prettify, Replace } from "../helpers";
import { FSProxy } from "../proxy";
import { ProxyNewParams } from "../proxy/proxy";
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

export class FSWorld extends World {
  proxy: FSProxy;
  simulnet?: ChildProcess;
  sysAcc: FSContract;

  constructor(params: FSWorldNewParams) {
    if (params.chainId !== undefined) {
      throw new Error("chainId is not undefined.");
    }
    const { chainId, gasPrice, simulnet, ...proxyParams } = params;
    super({
      chainId: chainId ?? "chain",
      gasPrice: gasPrice ?? 1_000_000_000,
      ...proxyParams,
    });
    this.proxy = new FSProxy(proxyParams);
    this.simulnet = simulnet;
    this.sysAcc = this.newContract(fullU8AAddress);
  }

  static new(params: FSWorldNewParams) {
    return new this(params);
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
    ...simulnetParams
  }: {
    gasPrice?: number;
    explorerUrl?: string;
  } & SimulnetParams = {}): Promise<FSWorld> {
    const simulnet = await this.startSimulnet(simulnetParams);
    return this.new({
      proxyUrl: simulnet.proxyUrl,
      gasPrice,
      explorerUrl,
      simulnet,
    });
  }

  static startSimulnet(simulnetParams: SimulnetParams = {}) {
    return startSimulnet(simulnetParams);
  }

  async restartSimulnet(simulnetParams: SimulnetParams = {}) {
    this.simulnet?.kill();
    const simulnet = await FSWorld.startSimulnet(simulnetParams);
    this.proxy.proxyUrl = simulnet.proxyUrl;
    this.simulnet = simulnet;
  }

  newWallet(addressOrSigner: AddressLike | Signer): FSWallet {
    return new FSWallet({
      signer: isAddressLike(addressOrSigner)
        ? new DummySigner(addressOrSigner)
        : addressOrSigner,
      world: this,
    });
  }

  newContract(address: AddressLike): FSContract {
    return new FSContract({ address, world: this });
  }

  async createWallets(createAccountsParams: FSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("wallet", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newWallet(a.address));
  }

  createWallet(params: FSWorldCreateAccountParams = {}) {
    return this.createWallets([params]).then((wallets) => wallets[0]);
  }

  async createContracts(createAccountsParams: FSWorldCreateAccountParams[]) {
    const setAccountsParams = createAccountsParams.map(
      ({ address, ...params }) => ({
        address: createAddressLike("vmContract", address),
        ...params,
      }),
    );
    await this.setAccounts(setAccountsParams);
    return setAccountsParams.map((a) => this.newContract(a.address));
  }

  createContract(params: FSWorldCreateAccountParams = {}) {
    return this.createContracts([params]).then((contracts) => contracts[0]);
  }

  getInitialAddresses() {
    return this.proxy.getInitialAddresses();
  }

  setAccounts(params: FSWorldSetAccountsParams) {
    expandCodeInAccounts(params);
    return this.proxy.setAccounts(params);
  }

  setAccount(params: FSWorldSetAccountParams) {
    return this.setAccounts([params]);
  }

  updateAccounts(params: FSWorldSetAccountParams[]) {
    expandCodeInAccounts(params);
    return this.proxy.updateAccounts(params);
  }

  updateAccount(params: FSWorldSetAccountParams) {
    return this.updateAccounts([params]);
  }

  generateBlocks(numBlocks: number) {
    return this.proxy.generateBlocks(numBlocks);
  }

  advanceToEpoch(epoch: number) {
    return this.proxy.advanceToEpoch(epoch);
  }

  async advanceEpoch(epochs: number) {
    const status = await this.proxy.getNetworkStatus(0);
    return this.advanceToEpoch(status.epoch + epochs);
  }

  processTx(txHash: string) {
    return this.proxy.processTx(txHash);
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
  ): Prettify<Replace<T, { contract: FSContract }>> {
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
      kvs,
    });
  }

  addEsdts(address: AddressLike, esdts: EncodableEsdt[]) {
    return this.updateAccount({
      address,
      kvs: { esdts },
    });
  }

  addMappers(address: AddressLike, mappers: EncodableMapper[]) {
    return this.updateAccount({
      address,
      kvs: { mappers },
    });
  }

  getNodeUrls() {
    return this.proxy.getNodeUrls();
  }

  getNodeUrl(shard: number) {
    return this.proxy.getNodeUrl(shard);
  }

  terminate() {
    this.simulnet?.kill();
  }

  [Symbol.dispose]() {
    this.terminate();
  }
}

export class FSWallet extends Wallet {
  world: FSWorld;

  constructor({ signer, world }: { signer: Signer; world: FSWorld }) {
    super({ signer, world });
    this.world = world;
  }

  setAccount(params: FSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  updateAccount(params: FSAccountSetAccountParams) {
    return this.world.updateAccount({ ...params, address: this });
  }

  createContract(params?: FSWalletCreateContractParams) {
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

export class FSContract extends Contract {
  world: FSWorld;

  constructor({ address, world }: { address: AddressLike; world: FSWorld }) {
    super({ address, world });
    this.world = world;
  }

  setAccount(params: FSAccountSetAccountParams) {
    return this.world.setAccount({ ...params, address: this });
  }

  updateAccount(params: FSAccountSetAccountParams) {
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

const startSimulnet = async ({
  binaryPath,
  binaryPort,
  binaryConfigPath,
  proxyConfigsPath,
  nodeConfigsPath,
  nodeOverrideConfigPath,
  nodeOverrideConfigPaths,
  downloadConfigs,
  epoch,
  round,
  nonce,
  saveLogs,
  logsLevel,
  logsPath,
}: SimulnetParams) => {
  binaryPath ??= fsproxyBinaryPath;
  binaryPort ??= 0;
  binaryConfigPath ??= `${fsproxyConfigsPath}/config.toml`;
  proxyConfigsPath ??= `${fsproxyConfigsPath}/proxy/config`;
  nodeConfigsPath ??= `${fsproxyConfigsPath}/node/config`;
  nodeOverrideConfigPaths ??= [
    `${fsproxyConfigsPath}/nodeOverrideDefault.toml`,
    `${fsproxyConfigsPath}/nodeOverride.toml`,
  ];
  if (nodeOverrideConfigPath !== undefined) {
    nodeOverrideConfigPaths.push(nodeOverrideConfigPath);
  }
  logsLevel ??= "*:INFO,process:TRACE,vm:TRACE";
  logsPath ??= "fsproxy-logs";

  const args: string[] = [
    "--server-port",
    `${binaryPort}`,
    "--config",
    binaryConfigPath,
    "--proxy-configs",
    proxyConfigsPath,
    "--node-configs",
    nodeConfigsPath,
  ];
  if (nodeOverrideConfigPaths.length > 0) {
    args.push("--node-override-config", nodeOverrideConfigPaths.join(","));
  }
  if (!downloadConfigs) {
    args.push("--skip-configs-download");
  }
  if (epoch !== undefined) {
    args.push("--initial-epoch", `${epoch}`);
  }
  if (round !== undefined) {
    args.push("--initial-round", `${round - 1}`);
  }
  if (nonce !== undefined) {
    args.push("--initial-nonce", `${nonce - 1}`);
  }
  if (saveLogs) {
    args.push(
      "-log-save",
      "-log-level",
      logsLevel,
      "--path-log-save",
      logsPath,
    );
  }
  const simulnet = spawn(binaryPath, args);

  simulnet.stderr.on("data", (data: Buffer) => {
    throw new Error(data.toString());
  });

  simulnet.on("error", (error) => {
    throw error;
  });

  const proxyUrl = await new Promise<string>((resolve) => {
    const onData = (data: Buffer) => {
      const addressRegex =
        /chain simulator's is accessible through the URL ([\w\d.:]+)/;
      const match = data.toString().match(addressRegex);
      if (match) {
        resolve(`http://${match[1]}`);
        simulnet.stdout.off("data", onData);
      }
    };

    simulnet.stdout.on("data", onData);
  });

  return Object.assign(simulnet, { proxyUrl });
};

type FSWorldNewParams = Prettify<
  | ({
      chainId?: undefined;
      gasPrice?: number;
      simulnet?: ChildProcess;
    } & ProxyNewParams)
  | WorldNewParams
>;

type FSWorldCreateAccountParams = Prettify<
  Replace<EncodableAccount, { address?: AddressLikeParams }>
>;

type FSWorldSetAccountsParams = EncodableAccount[];

type FSWorldSetAccountParams = EncodableAccount;

type FSAccountSetAccountParams = Prettify<
  Omit<FSWorldSetAccountParams, "address">
>;

type FSWalletCreateContractParams = Prettify<
  Omit<FSWorldCreateAccountParams, "owner">
>;

type SimulnetParams = {
  binaryPath?: string;
  binaryPort?: number;
  binaryConfigPath?: string;
  proxyConfigsPath?: string;
  nodeConfigsPath?: string;
  nodeOverrideConfigPath?: string;
  nodeOverrideConfigPaths?: string[];
  downloadConfigs?: boolean;
  epoch?: number;
  round?: number;
  nonce?: number;
  saveLogs?: boolean;
  logsLevel?: string;
  logsPath?: string;
};
