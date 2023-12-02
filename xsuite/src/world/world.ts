import { AddressEncodable } from "../data/AddressEncodable";
import { b64ToHex } from "../data/utils";
import { Optional, Prettify } from "../helpers";
import {
  devnetMinGasPrice,
  devnetExplorerUrl,
  devnetPublicProxyUrl,
  mainnetMinGasPrice,
  mainnetChainId,
  mainnetExplorerUrl,
  mainnetPublicProxyUrl,
  testnetMinGasPrice,
  testnetExplorerUrl,
  testnetPublicProxyUrl,
  devnetChainId,
  testnetChainId,
} from "../interact/envChain";
import {
  CallContractTxParams,
  DeployContractTxParams,
  Query,
  TransferTxParams,
  Tx,
  TxParams,
  UpgradeContractTxParams,
  Proxy,
} from "../proxy/proxy";
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
      proxy: new Proxy(proxyUrl),
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
    return new Wallet({
      signer,
      proxy: this.proxy,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
      baseExplorerUrl: this.explorerUrl,
    });
  }

  async newWalletFromFile(filePath: string) {
    return this.newWallet(await KeystoreSigner.fromFile(filePath));
  }

  newWalletFromFile_unsafe(filePath: string, password: string) {
    return this.newWallet(KeystoreSigner.fromFile_unsafe(filePath, password));
  }

  newContract(address: string | Uint8Array) {
    return new Contract({
      address,
      proxy: this.proxy,
      baseExplorerUrl: this.explorerUrl,
    });
  }

  query(query: Query) {
    return InteractionPromise.from(this.#query(query));
  }

  async #query(query: Query): Promise<QueryResult> {
    const resQuery = await this.proxy.query(query);
    if (![0, "ok"].includes(resQuery.returnCode)) {
      throw new QueryError(
        resQuery.returnCode,
        resQuery.returnMessage,
        resQuery,
      );
    }
    return {
      query: resQuery,
      returnData: [...resQuery.returnData].map(b64ToHex),
    };
  }
}

export class Wallet extends Signer {
  signer: Signer;
  proxy: Proxy;
  chainId: string;
  gasPrice: number;
  explorerUrl: string;
  baseExplorerUrl: string;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
    baseExplorerUrl = "",
  }: {
    signer: Signer;
    proxy: Proxy;
    chainId: string;
    gasPrice: number;
    baseExplorerUrl?: string;
  }) {
    super(signer.toTopBytes());
    this.signer = signer;
    this.proxy = proxy;
    this.chainId = chainId;
    this.gasPrice = gasPrice;
    this.baseExplorerUrl = baseExplorerUrl;
    this.explorerUrl = getAccountExplorerUrl(
      this.baseExplorerUrl,
      this.toString(),
    );
  }

  sign(data: Buffer) {
    return this.signer.sign(data);
  }

  getAccountNonce() {
    return this.proxy.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.proxy.getAccountBalance(this);
  }

  getAccount() {
    return this.proxy.getAccount(this);
  }

  getAccountKvs() {
    return this.proxy.getAccountKvs(this);
  }

  getAccountWithKvs() {
    return this.proxy.getAccountWithKvs(this);
  }

  executeTx(params: WorldExecuteTxParams) {
    return InteractionPromise.from(this.#executeTx(params));
  }

  async #executeTx({
    gasPrice,
    ...params
  }: WorldExecuteTxParams): Promise<TxResult> {
    const nonce = await this.proxy.getAccountNonce(this);
    const tx = new Tx({
      gasPrice: gasPrice ?? this.gasPrice,
      ...params,
      sender: this,
      nonce,
      chainId: this.chainId,
    });
    await tx.sign(this);
    const txHash = await this.proxy.sendTx(tx);
    const { hash, ..._resTx } = await this.proxy.getCompletedTx(txHash);
    const explorerUrl = getTxExplorerUrl(this.baseExplorerUrl, hash);
    // Destructuring gives an invalid type: https://github.com/microsoft/TypeScript/issues/56456
    const resTx = Object.assign({ explorerUrl, hash }, _resTx);
    if (resTx.status !== "success") {
      throw new TxError("errorStatus", resTx.status, resTx);
    }
    if (resTx.executionReceipt?.returnCode) {
      const { returnCode, returnMessage } = resTx.executionReceipt;
      throw new TxError(returnCode, returnMessage, resTx);
    }
    const signalErrorEvent = resTx?.logs?.events.find(
      (e: any) => e.identifier === "signalError",
    );
    if (signalErrorEvent) {
      const error = atob(signalErrorEvent.topics[1]);
      throw new TxError("signalError", error, resTx);
    }
    return { tx: resTx };
  }

  deployContract(params: WorldDeployContractParams) {
    return InteractionPromise.from(this.#deployContract(params));
  }

  async #deployContract(
    params: WorldDeployContractParams,
  ): Promise<DeployContractTxResult> {
    params.code = expandCode(params.code);
    const txResult = await this.#executeTx(
      Tx.getParamsToDeployContract(params),
    );
    const address = txResult.tx.logs.events.find(
      (e: any) => e.identifier === "SCDeploy",
    )!.address;
    const contract = new Contract({
      address,
      proxy: this.proxy,
      baseExplorerUrl: this.baseExplorerUrl,
    });
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, address, contract, returnData };
  }

  upgradeContract(params: WorldUpgradeContractParams) {
    return InteractionPromise.from(this.#upgradeContract(params));
  }

  async #upgradeContract(
    params: WorldUpgradeContractParams,
  ): Promise<CallContractTxResult> {
    params.code = expandCode(params.code);
    const txResult = await this.#executeTx(
      Tx.getParamsToUpgradeContract({ sender: this, ...params }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }

  transfer(params: WorldTransferParams) {
    return InteractionPromise.from(this.#transfer(params));
  }

  #transfer(params: WorldTransferParams): Promise<TxResult> {
    return this.#executeTx(Tx.getParamsToTransfer({ sender: this, ...params }));
  }

  callContract(params: WorldCallContractParams) {
    return InteractionPromise.from(this.#callContract(params));
  }

  async #callContract(
    params: WorldCallContractParams,
  ): Promise<CallContractTxResult> {
    const txResult = await this.#executeTx(
      Tx.getParamsToCallContract({ sender: this, ...params }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }
}

export class Contract extends AddressEncodable {
  proxy: Proxy;
  explorerUrl: string;
  baseExplorerUrl: string;

  constructor({
    address,
    proxy,
    baseExplorerUrl = "",
  }: {
    address: string | Uint8Array;
    proxy: Proxy;
    baseExplorerUrl?: string;
  }) {
    super(address);
    this.proxy = proxy;
    this.baseExplorerUrl = baseExplorerUrl;
    this.explorerUrl = getAccountExplorerUrl(
      this.baseExplorerUrl,
      this.toString(),
    );
  }

  getAccountNonce() {
    return this.proxy.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.proxy.getAccountBalance(this);
  }

  getAccount() {
    return this.proxy.getAccount(this);
  }

  getAccountKvs() {
    return this.proxy.getAccountKvs(this);
  }

  getAccountWithKvs() {
    return this.proxy.getAccountWithKvs(this);
  }
}

class InteractionError extends Error {
  interaction: string;
  code: number | string;
  msg: string;
  result: any;

  constructor(
    interaction: string,
    code: number | string,
    message: string,
    result: any,
  ) {
    super(
      `${interaction} failed: ${code} - ${message} - Result:\n` +
        JSON.stringify(result, null, 2),
    );
    this.interaction = interaction;
    this.code = code;
    this.msg = message;
    this.result = result;
  }
}

class TxError extends InteractionError {
  constructor(code: number | string, message: string, result: any) {
    super("Transaction", code, message, result);
  }
}

class QueryError extends InteractionError {
  constructor(code: number | string, message: string, result: any) {
    super("Query", code, message, result);
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

const getTxExplorerUrl = (baseExplorerUrl: string, txHash: string) =>
  `${baseExplorerUrl}/transactions/${txHash}`;

const getTxReturnData = (tx: any): string[] => {
  const writeLogEvent = tx?.logs?.events.find(
    (e: any) => e.identifier === "writeLog",
  );
  if (writeLogEvent) {
    return atob(writeLogEvent.data).split("@").slice(2);
  }
  const scr = tx?.smartContractResults.find(
    (r: any) => r.data === "@6f6b" || r.data?.startsWith("@6f6b@"),
  );
  if (scr) {
    return scr.data.split("@").slice(2);
  }
  return [];
};

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

type WorldExecuteTxParams = Prettify<
  Optional<Omit<TxParams, "sender" | "nonce" | "chainId">, "gasPrice">
>;

export type WorldDeployContractParams = Prettify<
  Optional<
    Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
    "gasPrice"
  >
>;

type WorldUpgradeContractParams = Prettify<
  Optional<
    Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
    "gasPrice"
  >
>;

type WorldTransferParams = Prettify<
  Optional<Omit<TransferTxParams, "sender" | "nonce" | "chainId">, "gasPrice">
>;

type WorldCallContractParams = Prettify<
  Optional<
    Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
    "gasPrice"
  >
>;

type QueryResult = {
  query: any;
  returnData: string[];
};

export type TxResult = {
  tx: Prettify<{ hash: string; explorerUrl: string } & Record<string, any>>;
};

export type DeployContractTxResult = Prettify<
  TxResult & { address: string; contract: Contract; returnData: string[] }
>;

export type CallContractTxResult = Prettify<
  TxResult & { returnData: string[] }
>;
