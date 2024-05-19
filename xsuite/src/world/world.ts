import { AddressLike } from "../data/addressLike";
import { Optional, Prettify } from "../helpers";
import {
  devnetChainId,
  devnetExplorerUrl,
  devnetMinGasPrice,
  devnetPublicProxyUrl,
  mainnetChainId,
  mainnetExplorerUrl,
  mainnetMinGasPrice,
  mainnetPublicProxyUrl,
  testnetChainId,
  testnetExplorerUrl,
  testnetMinGasPrice,
  testnetPublicProxyUrl,
} from "../interact/envChain";
import {
  CallContractTxParams,
  DeployContractTxParams,
  InteractionError,
  pendingErrorMessage,
  Proxy,
  Query,
  TransferTxParams,
  Tx,
  TxParams,
  UpgradeContractTxParams,
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

  query(params: WorldQueryParams) {
    return InteractionPromise.fromFn<QueryResult>(async () => {
      const resQuery = await this.proxy.query(params);
      return { query: resQuery, returnData: resQuery.returnData! };
    });
  }

  async sendTx(params: WorldExecuteTxParams) {
    const nonce = await this.proxy.getAccountNonce(params.sender);
    const tx = new Tx({
      ...params,
      nonce,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
    await tx.sign(params.sender);
    return this.proxy.sendTx(tx);
  }

  sendTransfer(params: WorldTransferParams) {
    return this.sendTx(Tx.getParamsToTransfer(params));
  }

  sendDeployContract(params: WorldDeployContractParams) {
    params.code = expandCode(params.code);
    return this.sendTx(Tx.getParamsToDeployContract(params));
  }

  sendCallContract(params: WorldCallContractParams) {
    return this.sendTx(Tx.getParamsToCallContract(params));
  }

  sendUpgradeContract(params: WorldUpgradeContractParams) {
    params.code = expandCode(params.code);
    return this.sendTx(Tx.getParamsToUpgradeContract(params));
  }

  awaitTx(txHash: string) {
    return this.proxy.awaitTx(txHash);
  }

  resolveTx(txHash: string) {
    return InteractionPromise.fromFn<TxResult>(async () => {
      const res = await this.proxy.resolveTx(txHash);
      return { ...res, tx: res };
    });
  }

  resolveTransfer(txHash: string) {
    return InteractionPromise.fromFn<TxResult>(async () => {
      const res = await this.proxy.resolveTransfer(txHash);
      return { ...res, tx: res };
    });
  }

  resolveDeployContract(txHash: string) {
    return InteractionPromise.fromFn<DeployContractResult>(async () => {
      const { newAddress, ...res } =
        await this.proxy.resolveDeployContract(txHash);
      const newContract = new Contract({ address: newAddress, world: this });
      return {
        ...res,
        newAddress,
        newContract,
        tx: res,
        address: newAddress,
        contract: newContract,
      };
    });
  }

  resolveCallContract(txHash: string) {
    return InteractionPromise.fromFn<CallContractResult>(async () => {
      const res = await this.proxy.resolveCallContract(txHash);
      return { ...res, tx: res };
    });
  }

  resolveUpgradeContract(txHash: string) {
    return InteractionPromise.fromFn<CallContractResult>(async () => {
      const res = await this.proxy.resolveUpgradeContract(txHash);
      return { ...res, tx: res };
    });
  }

  executeTx(params: WorldExecuteTxParams) {
    return InteractionPromise.fromFn<TxResult>(async () => {
      const txHash = await this.sendTx(params);
      await this.awaitTx(txHash);
      return await this.resolveTx(txHash);
    });
  }

  transfer(params: WorldTransferParams) {
    return InteractionPromise.fromFn<TxResult>(async () => {
      const txHash = await this.sendTransfer(params);
      await this.awaitTx(txHash);
      return await this.resolveTransfer(txHash);
    });
  }

  deployContract(params: WorldDeployContractParams) {
    return InteractionPromise.fromFn<DeployContractResult>(async () => {
      const txHash = await this.sendDeployContract(params);
      await this.awaitTx(txHash);
      return await this.resolveDeployContract(txHash);
    });
  }

  callContract(params: WorldCallContractParams) {
    return InteractionPromise.fromFn<CallContractResult>(async () => {
      const txHash = await this.sendCallContract(params);
      await this.awaitTx(txHash);
      return await this.resolveCallContract(txHash);
    });
  }

  upgradeContract(params: WorldUpgradeContractParams) {
    return InteractionPromise.fromFn<CallContractResult>(async () => {
      const txHash = await this.sendUpgradeContract(params);
      await this.awaitTx(txHash);
      return await this.resolveUpgradeContract(txHash);
    });
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

  sign(data: Buffer) {
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

  query(params: WalletQueryParams) {
    return this.world.query({ ...params, sender: this });
  }

  sendTx(params: WalletExecuteTxParams) {
    return this.world.sendTx({ ...params, sender: this });
  }

  executeTx(params: WalletExecuteTxParams) {
    return this.world.executeTx({ ...params, sender: this });
  }

  sendDeployContract(params: WalletDeployContractParams) {
    return this.world.sendDeployContract({ ...params, sender: this });
  }

  deployContract(params: WalletDeployContractParams) {
    return this.world.deployContract({ ...params, sender: this });
  }

  sendUpgradeContract(params: WalletUpgradeContractParams) {
    return this.world.sendUpgradeContract({ ...params, sender: this });
  }

  upgradeContract(params: WalletUpgradeContractParams) {
    return this.world.upgradeContract({ ...params, sender: this });
  }

  sendTransfer(params: WalletTransferParams) {
    return this.world.sendTransfer({ ...params, sender: this });
  }

  transfer(params: WalletTransferParams) {
    return this.world.transfer({ ...params, sender: this });
  }

  sendCallContract(params: WalletCallContractParams) {
    return this.world.sendCallContract({ ...params, sender: this });
  }

  callContract(params: WalletCallContractParams) {
    return this.world.callContract({ ...params, sender: this });
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

type QueryParams = Query;

type ExecuteTxParams = Omit<TxParams, "sender" | "nonce"> & { sender: Signer };

type DeployContractParams = Omit<DeployContractTxParams, "sender" | "nonce"> & {
  sender: Signer;
};

type UpgradeContractParams = Omit<
  UpgradeContractTxParams,
  "sender" | "nonce"
> & { sender: Signer };

type TransferParams = Omit<TransferTxParams, "sender" | "nonce"> & {
  sender: Signer;
};

type CallContractParams = Omit<CallContractTxParams, "sender" | "nonce"> & {
  sender: Signer;
};

type WorldQueryParams = QueryParams;

export type WorldExecuteTxParams = Prettify<
  Omit<Optional<ExecuteTxParams, "gasPrice">, "chainId">
>;

export type WorldDeployContractParams = Prettify<
  Omit<Optional<DeployContractParams, "gasPrice">, "chainId">
>;

type WorldUpgradeContractParams = Prettify<
  Omit<Optional<UpgradeContractParams, "gasPrice">, "chainId">
>;

type WorldTransferParams = Prettify<
  Omit<Optional<TransferParams, "gasPrice">, "chainId">
>;

type WorldCallContractParams = Prettify<
  Omit<Optional<CallContractParams, "gasPrice">, "chainId">
>;

type WalletQueryParams = Omit<QueryParams, "sender">;

type WalletExecuteTxParams = Prettify<Omit<WorldExecuteTxParams, "sender">>;

export type WalletDeployContractParams = Prettify<
  Omit<WorldDeployContractParams, "sender">
>;

type WalletUpgradeContractParams = Prettify<
  Omit<WorldUpgradeContractParams, "sender">
>;

type WalletTransferParams = Prettify<Omit<WorldTransferParams, "sender">>;

type WalletCallContractParams = Prettify<
  Omit<WorldCallContractParams, "sender">
>;

type QueryResult = {
  query: any;
  returnData: string[];
};

export type TxResult = Prettify<{
  hash: string;
  explorerUrl: string;
  [x: string]: any;
  /**
   * @deprecated Use `.hash`, `.explorerUrl`, etc instead of `.tx.hash`, `.tx.explorerUrl`, etc.
   */
  tx: { hash: string; explorerUrl: string; [x: string]: any };
}>;

export type DeployContractResult = Prettify<
  TxResult & {
    returnData: string[];
    newAddress: string;
    newContract: Contract;
    /**
     * @deprecated Use `.newAddress` instead.
     */
    address: string;
    /**
     * @deprecated Use `.newContract` instead.
     */
    contract: Contract;
  }
>;

export type CallContractResult = Prettify<TxResult & { returnData: string[] }>;
