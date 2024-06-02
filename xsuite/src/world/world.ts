import { AddressLike } from "../data/addressLike";
import { Optional, Prettify } from "../helpers";
import {
  devnetChainId,
  devnetExplorerUrl,
  devnetMinGasPrice,
  devnetPublicProxyUrl,
  testnetChainId,
  testnetExplorerUrl,
  testnetMinGasPrice,
  testnetPublicProxyUrl,
  mainnetChainId,
  mainnetExplorerUrl,
  mainnetMinGasPrice,
  mainnetPublicProxyUrl,
} from "../interact/envChain";
import {
  CallContractTx,
  DeployContractTx,
  pendingErrorMessage,
  Query,
  TransferTx,
  Tx,
  UpgradeContractTx,
  Proxy,
  InteractionError,
} from "../proxy/proxy";
import { Account } from "./account";
import { KeystoreSigner, Signer } from "./signer";
import { readFileHex } from "./utils";

export class World {
  chainId: string;
  proxy: Proxy;
  gasPrice: number;
  explorerUrl: string;

  constructor({
    chainId,
    proxy,
    gasPrice,
    explorerUrl = "",
  }: {
    chainId: string;
    proxy: Proxy;
    gasPrice: number;
    explorerUrl?: string;
  }) {
    this.proxy = proxy;
    this.chainId = chainId;
    this.gasPrice = gasPrice;
    this.explorerUrl = explorerUrl;
  }

  static new({ chainId, proxyUrl, gasPrice, explorerUrl }: WorldNewOptions) {
    if (chainId === "D") {
      proxyUrl ??= devnetPublicProxyUrl;
      gasPrice ??= devnetMinGasPrice;
      explorerUrl ??= devnetExplorerUrl;
    } else if (chainId === "T") {
      proxyUrl ??= testnetPublicProxyUrl;
      gasPrice ??= testnetMinGasPrice;
      explorerUrl ??= testnetExplorerUrl;
    } else if (chainId === "1") {
      proxyUrl ??= mainnetPublicProxyUrl;
      gasPrice ??= mainnetMinGasPrice;
      explorerUrl ??= mainnetExplorerUrl;
    }
    if (proxyUrl === undefined) {
      throw new Error("proxyUrl is not defined.");
    }
    if (gasPrice === undefined) {
      throw new Error("gasPrice is not defined.");
    }
    return new World({
      chainId,
      proxy: new Proxy({ proxyUrl, explorerUrl }),
      gasPrice,
      explorerUrl,
    });
  }

  static newDevnet(options: WorldNewRealnetOptions = {}) {
    return World.new({ chainId: devnetChainId, ...options });
  }

  static newTestnet(options: WorldNewRealnetOptions = {}) {
    return World.new({ chainId: testnetChainId, ...options });
  }

  static newMainnet(options: WorldNewRealnetOptions = {}) {
    return World.new({ chainId: mainnetChainId, ...options });
  }

  newWallet(signer: Signer) {
    return new Wallet({ signer, world: this });
  }

  async newWalletFromFile(filePath: string) {
    return this.newWallet(await KeystoreSigner.fromFile(filePath));
  }

  newWalletFromFile_unsafe(filePath: string, password: string) {
    return this.newWallet(KeystoreSigner.fromFile_unsafe(filePath, password));
  }

  newContract(address: AddressLike) {
    return new Contract({ address, world: this });
  }

  getAccountNonce(address: AddressLike) {
    return this.proxy.getAccountNonce(address);
  }

  getAccountBalance(address: AddressLike) {
    return this.proxy.getAccountBalance(address);
  }

  getAccountKvs(address: AddressLike) {
    return this.proxy.getAccountKvs(address);
  }

  getSerializableAccount(address: AddressLike) {
    return this.proxy.getSerializableAccount(address);
  }

  getAccountWithoutKvs(address: AddressLike) {
    return this.proxy.getAccountWithoutKvs(address);
  }

  getAccount(address: AddressLike) {
    return this.proxy.getAccount(address);
  }

  async sendTx(tx: WorldTx) {
    return this.proxy.sendTx(await this.getProxyTx(tx));
  }

  async sendTransfer(tx: WorldTransferTx) {
    return this.proxy.sendTransfer(await this.getProxyTx(tx));
  }

  async sendDeployContract(tx: WorldDeployContractTx) {
    tx.code = expandCode(tx.code);
    return this.proxy.sendDeployContract(await this.getProxyTx(tx));
  }

  async sendCallContract(tx: WorldCallContractTx) {
    return this.proxy.sendCallContract(await this.getProxyTx(tx));
  }

  async sendUpgradeContract(tx: WorldUpgradeContractTx) {
    tx.code = expandCode(tx.code);
    return this.proxy.sendUpgradeContract(await this.getProxyTx(tx));
  }

  private async getProxyTx<
    T extends { sender: AddressLike; gasPrice?: number },
  >(tx: T) {
    return {
      ...tx,
      nonce: await this.proxy.getAccountNonce(tx.sender),
      gasPrice: tx.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    };
  }

  awaitTx(txHash: string) {
    return this.proxy.awaitTx(txHash);
  }

  resolveTx(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveTx(txHash));
  }

  resolveTransfer(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveTransfer(txHash));
  }

  resolveDeployContract(txHash: string) {
    return InteractionPromise.fromFn(async () => {
      const res = await this.proxy.resolveDeployContract(txHash);
      const contract = this.newContract(res.address);
      return { ...res, contract };
    });
  }

  resolveCallContract(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveCallContract(txHash));
  }

  resolveUpgradeContract(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveUpgradeContract(txHash));
  }

  executeTx(tx: WorldTx) {
    return InteractionPromise.fromFn(async () => {
      const txHash = await this.sendTx(tx);
      await this.awaitTx(txHash);
      return this.resolveTx(txHash);
    });
  }

  transfer(tx: WorldTransferTx) {
    return InteractionPromise.fromFn(async () => {
      const txHash = await this.sendTransfer(tx);
      await this.awaitTx(txHash);
      return this.resolveTransfer(txHash);
    });
  }

  deployContract(tx: WorldDeployContractTx) {
    return InteractionPromise.fromFn(async () => {
      const txHash = await this.sendDeployContract(tx);
      await this.awaitTx(txHash);
      return this.resolveDeployContract(txHash);
    });
  }

  callContract(tx: WorldCallContractTx) {
    return InteractionPromise.fromFn(async () => {
      const txHash = await this.sendCallContract(tx);
      await this.awaitTx(txHash);
      return this.resolveCallContract(txHash);
    });
  }

  upgradeContract(tx: WorldUpgradeContractTx) {
    return InteractionPromise.fromFn(async () => {
      const txHash = await this.sendUpgradeContract(tx);
      await this.awaitTx(txHash);
      return this.resolveUpgradeContract(txHash);
    });
  }

  query(query: WorldQuery) {
    return InteractionPromise.from(this.proxy.query(query));
  }

  /**
   * @deprecated Use `.getSerializableAccount` instead.
   */
  getSerializableAccountWithKvs(address: AddressLike) {
    return this.getSerializableAccount(address);
  }

  /**
   * @deprecated Use `.getAccount` instead.
   */
  getAccountWithKvs(address: AddressLike) {
    return this.getAccount(address);
  }
}

export class Wallet extends Signer {
  signer: Signer;
  world: World;
  explorerUrl: string;

  constructor({ signer, world }: { signer: Signer; world: World }) {
    super(signer.toTopU8A());
    this.signer = signer;
    this.world = world;
    this.explorerUrl = getAccountExplorerUrl(
      this.world.explorerUrl,
      this.toString(),
    );
  }

  sign(data: Uint8Array) {
    return this.signer.sign(data);
  }

  getAccountNonce() {
    return this.world.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.world.getAccountBalance(this);
  }

  getAccountKvs() {
    return this.world.getAccountKvs(this);
  }

  getSerializableAccount() {
    return this.world.getSerializableAccount(this);
  }

  getAccountWithoutKvs() {
    return this.world.getAccountWithoutKvs(this);
  }

  getAccount() {
    return this.world.getAccount(this);
  }

  sendTx(tx: WalletTx) {
    return this.world.sendTx({ ...tx, sender: this });
  }

  sendTransfer(tx: WalletTransferTx) {
    return this.world.sendTransfer({ ...tx, sender: this });
  }

  sendDeployContract(tx: WalletDeployContractTx) {
    return this.world.sendDeployContract({ ...tx, sender: this });
  }

  sendCallContract(tx: WalletCallContractTx) {
    return this.world.sendCallContract({ ...tx, sender: this });
  }

  sendUpgradeContract(tx: WalletUpgradeContractTx) {
    return this.world.sendUpgradeContract({ ...tx, sender: this });
  }

  executeTx(tx: WalletTx) {
    return this.world.executeTx({ ...tx, sender: this });
  }

  transfer(tx: WalletTransferTx) {
    return this.world.transfer({ ...tx, sender: this });
  }

  deployContract(tx: WalletDeployContractTx) {
    return this.world.deployContract({ ...tx, sender: this });
  }

  callContract(tx: WalletCallContractTx) {
    return this.world.callContract({ ...tx, sender: this });
  }

  upgradeContract(tx: WalletUpgradeContractTx) {
    return this.world.upgradeContract({ ...tx, sender: this });
  }

  query(tx: WalletQuery) {
    return this.world.query({ ...tx, sender: this });
  }

  /**
   * @deprecated Use `.getSerializableAccount` instead.
   */
  getSerializableAccountWithKvs() {
    return this.getSerializableAccount();
  }

  /**
   * @deprecated Use `.getAccount` instead.
   */
  getAccountWithKvs() {
    return this.getAccount();
  }
}

export class Contract extends Account {
  world: World;
  explorerUrl: string;

  constructor({ address, world }: { address: AddressLike; world: World }) {
    super(address);
    this.world = world;
    this.explorerUrl = getAccountExplorerUrl(
      this.world.explorerUrl,
      this.toString(),
    );
  }

  getAccountNonce() {
    return this.world.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.world.getAccountBalance(this);
  }

  getAccountKvs() {
    return this.world.getAccountKvs(this);
  }

  getSerializableAccount() {
    return this.world.getSerializableAccount(this);
  }

  getAccountWithoutKvs() {
    return this.world.getAccountWithoutKvs(this);
  }

  getAccount() {
    return this.world.getAccount(this);
  }

  /**
   * @deprecated Use `.getSerializableAccount` instead.
   */
  getSerializableAccountWithKvs() {
    return this.getSerializableAccount();
  }

  /**
   * @deprecated Use `.getAccount` instead.
   */
  getAccountWithKvs() {
    return this.getAccount();
  }
}

export class InteractionPromise<T> implements PromiseLike<T> {
  #promise: Promise<T>;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
    ) => void,
  ) {
    this.#promise = new Promise<T>(executor);
  }

  static from<T>(promise: Promise<T>): InteractionPromise<T> {
    return new InteractionPromise<T>(promise.then.bind(promise));
  }

  static fromFn<T>(fn: () => Promise<T>): InteractionPromise<T> {
    return InteractionPromise.from(fn());
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) {
    return InteractionPromise.from(this.#promise.then(onfulfilled, onrejected));
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ) {
    return this.then(null, onrejected);
  }

  assertPending() {
    return this.then(() => {
      throw new Error("Not pending.");
    }).catch((error) => {
      if (!(error instanceof Error) || error.message !== pendingErrorMessage) {
        throw error;
      }
    });
  }

  assertSucceed() {
    return this.catch(() => {
      throw new Error("No success.");
    });
  }

  assertFail({
    code,
    message,
  }: { code?: number | string; message?: string } = {}) {
    return this.then(() => {
      throw new Error("No failure.");
    }).catch((error) => {
      if (!(error instanceof InteractionError)) {
        throw error;
      }
      if (code !== undefined && code !== error.code) {
        throw new Error(
          `Failed with unexpected error code.\nExpected code: ${code}\nReceived code: ${error.code}`,
        );
      }
      if (message !== undefined && message !== error.msg) {
        throw new Error(
          `Failed with unexpected error message.\nExpected message: ${message}\nReceived message: ${error.msg}`,
        );
      }
    });
  }
}

const getAccountExplorerUrl = (baseExplorerUrl: string, address: string) =>
  `${baseExplorerUrl}/accounts/${address}`;

export const expandCode = (code: string) => {
  if (code.startsWith("file:")) {
    code = readFileHex(code.slice(5));
  }
  return code;
};

export type WorldNewOptions = Prettify<
  | ({
      chainId: "D" | "T" | "1";
    } & WorldNewRealnetOptions)
  | {
      chainId: string;
      proxyUrl: string;
      gasPrice: number;
      explorerUrl?: string;
    }
>;

type WorldNewRealnetOptions = {
  proxyUrl?: string;
  gasPrice?: number;
  explorerUrl?: string;
};

type WorldTx = Prettify<Omit<Optional<Tx, "gasPrice">, "chainId" | "nonce">>;

type WorldTransferTx = Prettify<
  Omit<Optional<TransferTx, "gasPrice">, "chainId" | "nonce">
>;

export type WorldDeployContractTx = Prettify<
  Omit<Optional<DeployContractTx, "gasPrice">, "chainId" | "nonce">
>;

type WorldCallContractTx = Prettify<
  Omit<Optional<CallContractTx, "gasPrice">, "chainId" | "nonce">
>;

type WorldUpgradeContractTx = Prettify<
  Omit<Optional<UpgradeContractTx, "gasPrice">, "chainId" | "nonce">
>;

type WorldQuery = Query;

type WalletTx = Prettify<Omit<WorldTx, "sender">>;

type WalletTransferTx = Prettify<Omit<WorldTransferTx, "sender">>;

export type WalletDeployContractTx = Prettify<
  Omit<WorldDeployContractTx, "sender">
>;

type WalletCallContractTx = Prettify<Omit<WorldCallContractTx, "sender">>;

type WalletUpgradeContractTx = Prettify<Omit<WorldUpgradeContractTx, "sender">>;

type WalletQuery = Prettify<Omit<WorldQuery, "sender">>;
