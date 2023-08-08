import { Address, AddressEncodable } from "../data";
import {
  CallContractTxParams,
  DeployContractTxParams,
  TransferTxParams,
  UpgradeContractTxParams,
  Tx,
  TxParams,
  Proxy,
  Query,
} from "../proxy";
import { KeystoreSigner, Signer } from "./signer";
import { readFileHex } from "./utils";

export class World {
  proxy: Proxy;
  #chainId: string;
  #gasPrice?: number;

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
    this.#chainId = chainId;
    this.#gasPrice = gasPrice;
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
    return new WorldWallet(this, signer);
  }

  async newWalletFromFile(filePath: string) {
    return new WorldWallet(this, await KeystoreSigner.fromFile(filePath));
  }

  newWalletFromFile_unsafe(filePath: string, password: string) {
    return new WorldWallet(
      this,
      KeystoreSigner.fromFile_unsafe(filePath, password),
    );
  }

  newContract(address: string | Uint8Array) {
    return new WorldContract(this, address);
  }

  getAccountNonce(address: Address) {
    return this.proxy.getAccountNonce(address);
  }

  getAccountBalance(address: Address) {
    return this.proxy.getAccountBalance(address);
  }

  getAccount(address: Address) {
    return this.proxy.getAccount(address);
  }

  getAccountPairs(address: Address) {
    return this.proxy.getAccountPairs(address);
  }

  getAccountWithPairs(address: Address) {
    return this.proxy.getAccountWithPairs(address);
  }

  executeTx(
    sender: Signer,
    txParams: Omit<TxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#executeTx(sender, txParams));
  }

  async #executeTx(
    sender: Signer,
    { gasPrice, ...txParams }: Omit<TxParams, "sender" | "nonce" | "chainId">,
  ): Promise<TxResult> {
    const nonce = await this.proxy.getAccountNonce(sender);
    const tx = new Tx({
      gasPrice: gasPrice ?? this.#gasPrice,
      ...txParams,
      sender,
      nonce,
      chainId: this.#chainId,
    });
    await tx.sign(sender);
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
    sender: Signer,
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<DeployContractTxResult> {
    return TxResultPromise.from(this.#deployContract(sender, txParams));
  }

  async #deployContract(
    sender: Signer,
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<DeployContractTxResult> {
    txParams.code = expandCode(txParams.code);
    const txResult = await this.#executeTx(
      sender,
      Tx.getParamsToDeployContract(txParams),
    );
    const scDeployEvent = txResult.tx?.logs?.events.find(
      (e: any) => e.identifier === "SCDeploy",
    );
    if (!scDeployEvent) {
      throw new Error("No SCDeploy event.");
    }
    const address = scDeployEvent.address;
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, address, returnData };
  }

  upgradeContract(
    sender: Signer,
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#upgradeContract(sender, txParams));
  }

  async #upgradeContract(
    sender: Signer,
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<CallContractTxResult> {
    txParams.code = expandCode(txParams.code);
    const txResult = await this.#executeTx(
      sender,
      Tx.getParamsToUpgradeContract({ sender, ...txParams }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }

  transfer(
    sender: Signer,
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#transfer(sender, txParams));
  }

  async #transfer(
    sender: Signer,
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<TxResult> {
    return this.#executeTx(
      sender,
      Tx.getParamsToTransfer({ sender, ...txParams }),
    );
  }

  callContract(
    sender: Signer,
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#callContract(sender, txParams));
  }

  async #callContract(
    sender: Signer,
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
  ): Promise<CallContractTxResult> {
    const txResult = await this.#executeTx(
      sender,
      Tx.getParamsToCallContract({ sender, ...txParams }),
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }

  query(query: Query) {
    return this.proxy.query(query);
  }
}

export class WorldWallet extends Signer {
  world: World;
  signer: Signer;

  constructor(world: World, signer: Signer) {
    super(signer.toTopBytes());
    this.world = world;
    this.signer = signer;
  }

  sign(data: Buffer): Promise<Buffer> {
    return this.signer.sign(data);
  }

  getAccountNonce() {
    return this.world.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.world.getAccountBalance(this);
  }

  getAccount() {
    return this.world.getAccount(this);
  }

  getAccountPairs() {
    return this.world.getAccountPairs(this);
  }

  getAccountWithPairs() {
    return this.world.getAccountWithPairs(this);
  }

  executeTx(
    txParams: Omit<TxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return this.world.executeTx(this, txParams);
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return this.world.deployContract(this, txParams).then((data) => ({
      ...data,
      contract: new WorldContract(this.world, data.address),
    }));
  }

  upgradeContract(
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<CallContractTxResult> {
    return this.world.upgradeContract(this, txParams);
  }

  transfer(
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">,
  ): TxResultPromise<TxResult> {
    return this.world.transfer(this, txParams);
  }

  callContract(
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">,
  ) {
    return this.world.callContract(this, txParams);
  }
}

export class WorldContract extends AddressEncodable {
  world: World;

  constructor(world: World, address: string | Uint8Array) {
    super(address);
    this.world = world;
  }

  getAccountNonce() {
    return this.world.getAccountNonce(this);
  }

  getAccountBalance() {
    return this.world.getAccountBalance(this);
  }

  getAccount() {
    return this.world.getAccount(this);
  }

  getAccountPairs() {
    return this.world.getAccountPairs(this);
  }

  getAccountWithPairs() {
    return this.world.getAccountWithPairs(this);
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
  returnData: string[];
};

export type CallContractTxResult = TxResult & {
  returnData: string[];
};
