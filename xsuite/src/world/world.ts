import { d, e } from "../data";
import { AddressLike, addressLikeToBech } from "../data/addressLike";
import { BytesLike } from "../data/bytesLike";
import { Optional, Prettify, Replace } from "../helpers";
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

  static new({ chainId, proxyUrl, gasPrice, explorerUrl }: WorldNewParams) {
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
      proxy: new Proxy({ proxyUrl, explorerUrl, pauseAfterSend: 1_000 }),
      gasPrice,
      explorerUrl,
    });
  }

  static newDevnet(params: WorldNewRealnetParams = {}) {
    return this.new({ chainId: devnetChainId, ...params });
  }

  static newTestnet(params: WorldNewRealnetParams = {}) {
    return this.new({ chainId: testnetChainId, ...params });
  }

  static newMainnet(params: WorldNewRealnetParams = {}) {
    return this.new({ chainId: mainnetChainId, ...params });
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

  getNetworkStatus(shard: number) {
    return this.proxy.getNetworkStatus(shard);
  }

  getAccountNonce(address: AddressLike) {
    return this.proxy.getAccountNonce(address);
  }

  getAccountBalance(address: AddressLike) {
    return this.proxy.getAccountBalance(address);
  }

  async getAccountEsdtBalance(
    address: AddressLike,
    id: string,
    nonce?: number,
  ) {
    const encV = await this.getAccountEsdtValue(address, id, nonce);
    if (encV === "") return 0n;
    return d.EsdtValue().fromTop(encV).amount ?? 0n;
  }

  getAccountValue(address: AddressLike, key: BytesLike) {
    return this.proxy.getAccountValue(address, key);
  }

  getAccountEsdtValue(address: AddressLike, id: string, nonce?: number) {
    return this.proxy.getAccountValue(address, e.EsdtKey(id, nonce));
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

  sendTxs(txs: WorldTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.sendTxs(txs));
  }

  sendTx(tx: WorldTx) {
    return this.preTx(tx).then((tx) => this.proxy.sendTx(tx));
  }

  sendTransfers(txs: WorldTransferTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.sendTransfers(txs));
  }

  sendTransfer(tx: WorldTransferTx) {
    return this.preTx(tx).then((tx) => this.proxy.sendTransfer(tx));
  }

  sendDeployContracts(txs: WorldDeployContractTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.sendDeployContracts(txs));
  }

  sendDeployContract(tx: WorldDeployContractTx) {
    return this.preTx(tx).then((tx) => this.proxy.sendDeployContract(tx));
  }

  sendCallContracts(txs: WorldCallContractTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.sendCallContracts(txs));
  }

  sendCallContract(tx: WorldCallContractTx) {
    return this.preTx(tx).then((tx) => this.proxy.sendCallContract(tx));
  }

  sendUpgradeContracts(txs: WorldUpgradeContractTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.sendUpgradeContracts(txs));
  }

  sendUpgradeContract(tx: WorldUpgradeContractTx) {
    return this.preTx(tx).then((tx) => this.proxy.sendUpgradeContract(tx));
  }

  private preTxs<T extends IncompleteTx>(txs: T[]) {
    const noncePromises: Record<string, Promise<number>> = {};
    return Promise.all(
      txs.map(async (tx) => {
        const address = addressLikeToBech(tx.sender);
        if (noncePromises[address] === undefined) {
          noncePromises[address] = this.proxy.getAccountNonce(tx.sender);
        } else {
          noncePromises[address] = noncePromises[address].then((n) => n + 1);
        }
        if (tx.code !== undefined) {
          tx.code = expandCode(tx.code);
        }
        return {
          ...tx,
          nonce: await noncePromises[address],
          gasPrice: tx.gasPrice ?? this.gasPrice,
          chainId: this.chainId,
        };
      }),
    );
  }

  private preTx<T extends IncompleteTx>(tx: T) {
    return this.preTxs([tx]).then((r) => r[0]);
  }

  awaitTxs(txHashes: string[]) {
    return this.proxy.awaitTxs(txHashes);
  }

  awaitTx(txHash: string) {
    return this.proxy.awaitTx(txHash);
  }

  resolveTxs(txHashes: string[]) {
    return this.proxy.resolveTxs(txHashes);
  }

  resolveTx(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveTx(txHash));
  }

  resolveTransfers(txHashes: string[]) {
    return this.proxy.resolveTransfers(txHashes);
  }

  resolveTransfer(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveTransfer(txHash));
  }

  resolveDeployContracts(txHashes: string[]) {
    return this.proxy
      .resolveDeployContracts(txHashes)
      .then((rs) => rs.map((r) => this.addContractPostTx(r)));
  }

  resolveDeployContract(txHash: string) {
    return InteractionPromise.from(
      this.proxy
        .resolveDeployContract(txHash)
        .then((r) => this.addContractPostTx(r)),
    );
  }

  resolveCallContracts(txHashes: string[]) {
    return this.proxy.resolveCallContracts(txHashes);
  }

  resolveCallContract(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveCallContract(txHash));
  }

  resolveUpgradeContracts(txHashes: string[]) {
    return this.proxy.resolveUpgradeContracts(txHashes);
  }

  resolveUpgradeContract(txHash: string) {
    return InteractionPromise.from(this.proxy.resolveUpgradeContract(txHash));
  }

  protected addContractPostTx<T extends { address: string }>(
    res: T,
  ): Prettify<Replace<T, { contract: Contract }>> {
    return { ...res, contract: this.newContract(res.address) };
  }

  executeTxs(txs: WorldTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.executeTxs(txs));
  }

  executeTx(tx: WorldTx) {
    return InteractionPromise.from(
      this.preTx(tx).then((tx) => this.proxy.executeTx(tx)),
    );
  }

  doTransfers(txs: WorldTransferTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.doTransfers(txs));
  }

  transfer(tx: WorldTransferTx) {
    return InteractionPromise.from(
      this.preTx(tx).then((tx) => this.proxy.transfer(tx)),
    );
  }

  deployContracts(txs: WorldDeployContractTx[]) {
    return this.preTxs(txs)
      .then((txs) => this.proxy.deployContracts(txs))
      .then((rs) => rs.map((r) => this.addContractPostTx(r)));
  }

  deployContract(tx: WorldDeployContractTx) {
    return InteractionPromise.from(
      this.preTx(tx)
        .then((tx) => this.proxy.deployContract(tx))
        .then((r) => this.addContractPostTx(r)),
    );
  }

  callContracts(txs: WorldCallContractTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.callContracts(txs));
  }

  callContract(tx: WorldCallContractTx) {
    return InteractionPromise.from(
      this.preTx(tx).then((tx) => this.proxy.callContract(tx)),
    );
  }

  upgradeContracts(txs: WorldUpgradeContractTx[]) {
    return this.preTxs(txs).then((txs) => this.proxy.upgradeContracts(txs));
  }

  upgradeContract(tx: WorldUpgradeContractTx) {
    return InteractionPromise.from(
      this.preTx(tx).then((tx) => this.proxy.upgradeContract(tx)),
    );
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

  getAccountEsdtBalance(id: string, nonce?: number) {
    return this.world.getAccountEsdtBalance(this, id, nonce);
  }

  getAccountValue(key: BytesLike) {
    return this.world.getAccountValue(this, key);
  }

  getAccountEsdtValue(id: string, nonce?: number) {
    return this.world.getAccountEsdtValue(this, id, nonce);
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

  getAccountEsdtBalance(id: string, nonce?: number) {
    return this.world.getAccountEsdtBalance(this, id, nonce);
  }

  getAccountValue(key: BytesLike) {
    return this.world.getAccountValue(this, key);
  }

  getAccountEsdtValue(id: string, nonce?: number) {
    return this.world.getAccountEsdtValue(this, id, nonce);
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

  query(tx: ContractQuery) {
    return this.world.query({ ...tx, callee: this });
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
  }: { code?: number | string; message?: string | RegExp } = {}) {
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
      if (
        message !== undefined &&
        (message instanceof RegExp
          ? !message.test(error.msg)
          : message !== error.msg)
      ) {
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

export type WorldNewParams = Prettify<
  | ({
      chainId: "D" | "T" | "1";
    } & WorldNewRealnetParams)
  | {
      chainId: string;
      proxyUrl: string;
      gasPrice: number;
      explorerUrl?: string;
    }
>;

type WorldNewRealnetParams = {
  proxyUrl?: string;
  gasPrice?: number;
  explorerUrl?: string;
};

type IncompleteTx = {
  sender: AddressLike;
  code?: string;
  gasPrice?: number;
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

type ContractQuery = Prettify<Omit<WorldQuery, "callee">>;
