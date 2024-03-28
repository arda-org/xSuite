import { Address } from '../data/address';
import { Optional, Prettify } from '../helpers';
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
} from '../interact/envChain';
import {
  CallContractTxParams,
  DeployContractTxParams,
  Proxy,
  Query,
  TransferTxParams,
  Tx,
  TxParams,
  UpgradeContractTxParams,
} from '../proxy/proxy';
import { Account } from './account';
import { KeystoreSigner, Signer } from './signer';
import { readFileHex } from './utils';

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

  getAccountNonce(address: Address) {
    return getAccountNonce(this.proxy, address);
  }

  getAccountBalance(address: Address) {
    return getAccountBalance(this.proxy, address);
  }

  getAccount(address: Address) {
    return getAccount(this.proxy, address);
  }

  getAccountKvs(address: Address) {
    return getAccountKvs(this.proxy, address);
  }

  getSerializableAccountWithKvs(address: Address) {
    return getSerializableAccountWithKvs(this.proxy, address);
  }

  getAccountWithKvs(address: Address) {
    return getAccountWithKvs(this.proxy, address);
  }

  query(params: WorldQueryParams) {
    return query(this.proxy, params);
  }

  executeTx(params: WorldExecuteTxParams) {
    return executeTx(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
  }

  sendTx(params: WorldExecuteTxParams) {
    return sendTx(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
  }

  deployContract(params: WorldDeployContractParams) {
    return deployContract(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
  }

  upgradeContract(params: WorldUpgradeContractParams) {
    return upgradeContract(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
  }

  transfer(params: WorldTransferParams) {
    return transfer(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
  }

  callContract(params: WorldCallContractParams) {
    return callContract(this.proxy, this.explorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      chainId: this.chainId,
    });
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
    super(signer.toTopU8A());
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
    return getAccountNonce(this.proxy, this);
  }

  getAccountBalance() {
    return getAccountBalance(this.proxy, this);
  }

  getAccount() {
    return getAccount(this.proxy, this);
  }

  getAccountKvs() {
    return getAccountKvs(this.proxy, this);
  }

  getSerializableAccountWithKvs() {
    return getSerializableAccountWithKvs(this.proxy, this);
  }

  getAccountWithKvs() {
    return getAccountWithKvs(this.proxy, this);
  }

  query(params: WalletQueryParams) {
    return query(this.proxy, { ...params, sender: this });
  }

  executeTx(params: WalletExecuteTxParams) {
    return executeTx(this.proxy, this.baseExplorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      sender: this,
      chainId: this.chainId,
    });
  }

  deployContract(params: WalletDeployContractParams) {
    return deployContract(this.proxy, this.baseExplorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      sender: this,
      chainId: this.chainId,
    });
  }

  upgradeContract(params: WalletUpgradeContractParams) {
    return upgradeContract(this.proxy, this.baseExplorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      sender: this,
      chainId: this.chainId,
    });
  }

  transfer(params: WalletTransferParams) {
    return transfer(this.proxy, this.baseExplorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      sender: this,
      chainId: this.chainId,
    });
  }

  callContract(params: WalletCallContractParams) {
    return callContract(this.proxy, this.baseExplorerUrl, {
      ...params,
      gasPrice: params.gasPrice ?? this.gasPrice,
      sender: this,
      chainId: this.chainId,
    });
  }
}

export class Contract extends Account {
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
    return getAccountNonce(this.proxy, this);
  }

  getAccountBalance() {
    return getAccountBalance(this.proxy, this);
  }

  getAccount() {
    return getAccount(this.proxy, this);
  }

  getAccountKvs() {
    return getAccountKvs(this.proxy, this);
  }

  getSerializableAccountWithKvs() {
    return getSerializableAccountWithKvs(this.proxy, this);
  }

  getAccountWithKvs() {
    return getAccountWithKvs(this.proxy, this);
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

const getAccountNonce = (proxy: Proxy, address: Address) =>
  proxy.getAccountNonce(address);

const getAccountBalance = (proxy: Proxy, address: Address) =>
  proxy.getAccountBalance(address);

const getAccount = (proxy: Proxy, address: Address) =>
  proxy.getAccount(address);

const getAccountKvs = (proxy: Proxy, address: Address) =>
  proxy.getAccountKvs(address);

const getSerializableAccountWithKvs = (proxy: Proxy, address: Address) =>
  proxy.getSerializableAccountWithKvs(address);

const getAccountWithKvs = (proxy: Proxy, address: Address) =>
  proxy.getAccountWithKvs(address);

const query = (proxy: Proxy, params: QueryParams) =>
  InteractionPromise.fromFn<QueryResult>(async () => {
    const resQuery = await proxy.query(params);
    if (![0, "ok"].includes(resQuery.returnCode)) {
      throw new QueryError(
        resQuery.returnCode,
        resQuery.returnMessage,
        resQuery,
      );
    }
    return { query: resQuery, returnData: resQuery.returnData };
  });

const executeTx = (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: ExecuteTxParams,
) => {
  return InteractionPromise.fromFn<ExecuteTxResult>(async () => {
    const txHash = await sendTx(proxy, baseExplorerUrl, params);
    const { hash, ..._resTx } = await proxy.getCompletedTx(txHash);
    const explorerUrl = getTxExplorerUrl(baseExplorerUrl, hash);
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
  });
};

const sendTx = async (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: ExecuteTxParams,
) => {
  const nonce = await proxy.getAccountNonce(params.sender);
  const tx = new Tx({ ...params, nonce });
  await tx.sign(params.sender);

  return await proxy.sendTx(tx);
};

const deployContract = (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: DeployContractParams,
) =>
  InteractionPromise.fromFn<DeployContractResult>(async () => {
    params.code = expandCode(params.code);
    const txResult = await executeTx(
      proxy,
      baseExplorerUrl,
      Tx.getParamsToDeployContract(params),
    );
    const address = txResult.tx.logs.events.find(
      (e: any) => e.identifier === "SCDeploy",
    )!.address;
    const contract = new Contract({
      address,
      proxy,
      baseExplorerUrl,
    });
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, address, contract, returnData };
  });

const upgradeContract = (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: UpgradeContractParams,
) =>
  InteractionPromise.fromFn<CallContractResult>(async () => {
    params.code = expandCode(params.code);
    const txResult = await executeTx(
      proxy,
      baseExplorerUrl,
      Tx.getParamsToUpgradeContract(params),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  });

const transfer = (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: TransferParams,
) =>
  InteractionPromise.fromFn<ExecuteTxResult>(async () => {
    return executeTx(proxy, baseExplorerUrl, Tx.getParamsToTransfer(params));
  });

const callContract = (
  proxy: Proxy,
  baseExplorerUrl: string,
  params: CallContractParams,
) =>
  InteractionPromise.fromFn<CallContractResult>(async () => {
    const txResult = await executeTx(
      proxy,
      baseExplorerUrl,
      Tx.getParamsToCallContract(params),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  });

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

type WorldDeployContractParams = Prettify<
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

export type ExecuteTxResult = Prettify<{
  tx: { hash: string; explorerUrl: string } & Record<string, any>;
}>;

export type DeployContractResult = Prettify<
  ExecuteTxResult & {
    address: string;
    contract: Contract;
    returnData: string[];
  }
>;

export type CallContractResult = Prettify<
  ExecuteTxResult & { returnData: string[] }
>;
