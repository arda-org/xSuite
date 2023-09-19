import { AddressEncodable } from "../data/AddressEncodable";
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
    return this.proxy.query(query);
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

  sign(data: Buffer): Promise<Buffer> {
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

  executeTx(
    txParams: Omit<TxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#executeTx(txParams));
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
      throw new Error(`Tx failed: 100 - Failure with status ${resTx.status}.`);
    }
    if (resTx.executionReceipt?.returnCode) {
      const { returnCode, returnMessage } = resTx.executionReceipt;
      throw new Error(`Tx failed: ${returnCode} - ${returnMessage}`);
    }
    const signalErrorEvent = resTx?.logs?.events.find(
      (e: any) => e.identifier === "signalError",
    );
    if (signalErrorEvent) {
      throw new Error("Tx failed: 100 - signalError event.");
    }
    return { tx: resTx };
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<DeployContractTxResult> {
    return TxResultPromise.from(this.#deployContract(txParams));
  }

  async #deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<DeployContractTxResult> {
    txParams.code = expandCode(txParams.code);
    const txResult = await this.#executeTx(
      Tx.getParamsToDeployContract(txParams),
    );
    const scDeployEvent = txResult.tx?.logs?.events.find(
      (e: any) => e.identifier === "SCDeploy",
    );
    if (!scDeployEvent) {
      throw new Error("No SCDeploy event.");
    }
    const address = scDeployEvent.address;
    const contract = new Contract({ address, proxy: this.proxy });
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, address, contract, returnData };
  }

  upgradeContract(
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#upgradeContract(txParams));
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

  transfer(
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#transfer(txParams));
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
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#callContract(txParams));
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

export class TxResultPromise<T> extends Promise<T> {
  static from<T>(promise: Promise<T>): TxResultPromise<T> {
    return new TxResultPromise<T>((resolve, reject) => {
      promise.then(resolve, reject);
    });
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return new TxResultPromise<TResult1 | TResult2>((resolve, reject) => {
      super.then(
        (value) => {
          if (onfulfilled) {
            try {
              resolve(onfulfilled(value));
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(value as any);
          }
        },
        (error) => {
          if (onrejected) {
            try {
              resolve(onrejected(error));
            } catch (error) {
              reject(error);
            }
          } else {
            reject(error);
          }
        },
      );
    });
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ) {
    return this.then(null, onrejected);
  }

  assertFail({ code, message }: { code?: number; message?: string } = {}) {
    return this.then(() => {
      throw new Error("Transaction has not failed.");
    }).catch((error) => {
      if (error instanceof Error) {
        const matches = error.message.match(/Tx failed: (\d+) - (.+)/);
        if (matches) {
          const errorCode = parseInt(matches[1]);
          const errorMessage = matches[2];
          if (code !== undefined && code !== errorCode) {
            throw new Error(
              `Failed with unexpected error code.\nExpected code: ${code}\nReceived code: ${errorCode}`,
            );
          }
          if (message !== undefined && message !== errorMessage) {
            throw new Error(
              `Failed with unexpected error message.\nExpected message: ${message}\nReceived message: ${errorMessage}`,
            );
          }
        } else {
          throw error;
        }
      } else {
        throw error;
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
    (r: any) => r.data === "@6f6b" || r.data.startsWith("@6f6b@"),
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
