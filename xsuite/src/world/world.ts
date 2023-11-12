import { AddressEncodable } from "../data/AddressEncodable";
import { b64ToHexString } from "../data/utils";
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
  proxy: Proxy;
  chainId: string;
  gasPrice?: number;

  constructor({
    proxy,
    chainId,
    gasPrice,
  }: {
    proxy: Proxy;
    chainId: string;
    gasPrice?: number;
  }) {
    this.proxy = proxy;
    this.chainId = chainId;
    this.gasPrice = gasPrice;
  }

  static new({
    proxyUrl,
    chainId,
    gasPrice,
  }: {
    proxyUrl: string;
    chainId: string;
    gasPrice?: number;
  }) {
    return new World({ proxy: new Proxy(proxyUrl), chainId, gasPrice });
  }

  newWallet(signer: Signer) {
    return new Wallet({
      proxy: this.proxy,
      signer,
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  async newWalletFromFile(filePath: string) {
    return new Wallet({
      proxy: this.proxy,
      signer: await KeystoreSigner.fromFile(filePath),
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newWalletFromFile_unsafe(filePath: string, password: string) {
    return new Wallet({
      proxy: this.proxy,
      signer: KeystoreSigner.fromFile_unsafe(filePath, password),
      chainId: this.chainId,
      gasPrice: this.gasPrice,
    });
  }

  newContract(address: string | Uint8Array) {
    return new Contract({ address, proxy: this.proxy });
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
      returnData: resQuery.returnData.map(b64ToHexString),
    };
  }
}

export class Wallet extends Signer {
  signer: Signer;
  proxy: Proxy;
  chainId: string;
  gasPrice?: number;

  constructor({
    signer,
    proxy,
    chainId,
    gasPrice,
  }: {
    signer: Signer;
    proxy: Proxy;
    chainId: string;
    gasPrice?: number;
  }) {
    super(signer.toTopBytes());
    this.proxy = proxy;
    this.signer = signer;
    this.chainId = chainId;
    this.gasPrice = gasPrice;
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

  executeTx(txParams: Omit<TxParams, "sender" | "nonce" | "chainId">) {
    return InteractionPromise.from(this.#executeTx(txParams));
  }

  async #executeTx({
    gasPrice,
    ...txParams
  }: Omit<TxParams, "sender" | "nonce" | "chainId">): Promise<TxResult> {
    const nonce = await this.proxy.getAccountNonce(this);
    const tx = new Tx({
      gasPrice: gasPrice ?? this.gasPrice,
      ...txParams,
      sender: this,
      nonce,
      chainId: this.chainId,
    });
    await tx.sign(this);
    const txHash = await this.proxy.sendTx(tx);
    const resTx = await this.proxy.getCompletedTx(txHash);
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

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return InteractionPromise.from(this.#deployContract(txParams));
  }

  async #deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<DeployContractTxResult> {
    txParams.code = expandCode(txParams.code);
    const txResult = await this.#executeTx(
      Tx.getParamsToDeployContract(txParams),
    );
    const address = txResult.tx.logs.events.find(
      (e: any) => e.identifier === "SCDeploy",
    )!.address;
    const contract = new Contract({ address, proxy: this.proxy });
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, address, contract, returnData };
  }

  upgradeContract(
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return InteractionPromise.from(this.#upgradeContract(txParams));
  }

  async #upgradeContract(
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<CallContractTxResult> {
    txParams.code = expandCode(txParams.code);
    const txResult = await this.#executeTx(
      Tx.getParamsToUpgradeContract({ sender: this, ...txParams }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }

  transfer(txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">) {
    return InteractionPromise.from(this.#transfer(txParams));
  }

  async #transfer(
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<TxResult> {
    return this.#executeTx(
      Tx.getParamsToTransfer({ sender: this, ...txParams }),
    );
  }

  callContract(
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return InteractionPromise.from(this.#callContract(txParams));
  }

  async #callContract(
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<CallContractTxResult> {
    const txResult = await this.#executeTx(
      Tx.getParamsToCallContract({ sender: this, ...txParams }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }
}

export class Contract extends AddressEncodable {
  proxy: Proxy;

  constructor({
    address,
    proxy,
  }: {
    address: string | Uint8Array;
    proxy: Proxy;
  }) {
    super(address);
    this.proxy = proxy;
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
  response: any;

  constructor(
    interaction: string,
    code: number | string,
    message: string,
    response: any,
  ) {
    super(
      `${interaction} failed: ${code} - ${message} - Response:\n` +
        JSON.stringify(response, null, 2),
    );
    this.interaction = interaction;
    this.code = code;
    this.msg = message;
    this.response = response;
  }
}

class TxError extends InteractionError {
  constructor(code: number | string, message: string, response: any) {
    super("Transaction", code, message, response);
  }
}

class QueryError extends InteractionError {
  constructor(code: number | string, message: string, response: any) {
    super("Query", code, message, response);
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

type QueryResult = {
  query: any;
  returnData: string[];
};

export type TxResult = {
  tx: any;
};

export type DeployContractTxResult = TxResult & {
  address: string;
  contract: Contract;
  returnData: string[];
};

export type CallContractTxResult = TxResult & {
  returnData: string[];
};
