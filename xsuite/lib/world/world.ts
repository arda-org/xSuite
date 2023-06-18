import { AddressEncodable } from "../enc";
import {
  CallContractTxParams,
  DeployContractTxParams,
  Transaction,
  TxParams,
  Address,
  Proxy,
} from "../proxy";
import { TransferTxParams, UpgradeContractTxParams } from "../proxy/proxy";
import { Signer } from "./signer";

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

  newContract(address: string | Uint8Array) {
    return new WorldContract(this, address);
  }

  getAccountWithPairs(address: Address) {
    return this.proxy.getAccountWithPairs(address);
  }

  executeTx(
    sender: Signer,
    txParams: Omit<TxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#executeTx(sender, txParams));
  }

  async #executeTx(
    sender: Signer,
    { gasPrice, ...txParams }: Omit<TxParams, "sender" | "nonce" | "chainId">
  ): Promise<TxResult> {
    const nonce = await this.proxy.getAccountNonce(sender);
    const tx = new Transaction({
      gasPrice: gasPrice ?? this.#gasPrice,
      ...txParams,
      sender,
      nonce,
      chainId: this.#chainId,
    });
    await tx.sign(sender);
    const txHash = await this.proxy.sendTx(tx);
    const resTx = await this.proxy.getCompletedTx(txHash);
    if (resTx.status === "success") {
      return { tx: resTx };
    } else if (resTx.status === "invalid") {
      const { returnCode, returnMessage } = resTx.receipt;
      throw new Error(`Tx failed: ${returnCode} - ${returnMessage}`);
    } else {
      throw new Error("Unknown tx status.");
    }
  }

  deployContract(
    sender: Signer,
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<DeployContractTxResult> {
    return TxResultPromise.from(this.#deployContract(sender, txParams));
  }

  async #deployContract(
    sender: Signer,
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ): Promise<DeployContractTxResult> {
    const txResult = await this.#executeTx(
      sender,
      Transaction.getParamsToDeployContract(txParams)
    );
    const scDeployEvent = txResult.tx?.logs?.events.find(
      (e: any) => e.identifier === "SCDeploy"
    );
    if (!scDeployEvent) {
      throw new Error("No SCDeploy event.");
    }
    const deployedAddress = scDeployEvent.address;
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, deployedAddress, returnData };
  }

  upgradeContract(
    sender: Signer,
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#upgradeContract(sender, txParams));
  }

  async #upgradeContract(
    sender: Signer,
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">
  ): Promise<CallContractTxResult> {
    const txResult = await this.#executeTx(
      sender,
      Transaction.getParamsToUpgradeContract({ sender, ...txParams })
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }

  transfer(
    sender: Signer,
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<TxResult> {
    return TxResultPromise.from(this.#transfer(sender, txParams));
  }

  async #transfer(
    sender: Signer,
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">
  ): Promise<TxResult> {
    return this.#executeTx(
      sender,
      Transaction.getParamsToTransfer({ sender, ...txParams })
    );
  }

  callContract(
    sender: Signer,
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<CallContractTxResult> {
    return TxResultPromise.from(this.#callContract(sender, txParams));
  }

  async #callContract(
    sender: Signer,
    txParams: Omit<CallContractTxParams, "sender" | "nonce" | "chainId">
  ): Promise<CallContractTxResult> {
    const txResult = await this.#executeTx(
      sender,
      Transaction.getParamsToCallContract({ sender, ...txParams })
    );
    const returnData = getTxReturnData(txResult.tx);
    return { ...txResult, returnData };
  }
}

export class WorldWallet extends AddressEncodable {
  world: World;
  signer: Signer;

  constructor(world: World, signer: Signer) {
    super(signer.toTopBytes());
    this.world = world;
    this.signer = signer;
  }

  getAccountWithPairs() {
    return this.world.getAccountWithPairs(this);
  }

  executeTx(
    txParams: Omit<TxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<TxResult> {
    return this.world.executeTx(this.signer, txParams);
  }

  deployContract(
    txParams: Omit<DeployContractTxParams, "sender" | "nonce" | "chainId">
  ) {
    return this.world.deployContract(this.signer, txParams);
  }

  upgradeContract(
    txParams: Omit<UpgradeContractTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<CallContractTxResult> {
    return this.world.upgradeContract(this.signer, txParams);
  }

  transfer(
    txParams: Omit<TransferTxParams, "sender" | "nonce" | "chainId">
  ): TxResultPromise<TxResult> {
    return this.world.transfer(this.signer, txParams);
  }

  callContract(
    callee: Address,
    txParams: Omit<
      CallContractTxParams,
      "sender" | "nonce" | "chainId" | "callee"
    >
  ) {
    return this.world.callContract(this.signer, { callee, ...txParams });
  }
}

export class WorldContract extends AddressEncodable {
  world: World;

  constructor(world: World, address: string | Uint8Array) {
    super(address);
    this.world = world;
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
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
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
        }
      );
    });
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ) {
    return this.then(null, onrejected);
  }

  assertFail({ code, message }: { code?: number; message?: string }) {
    return this.then(() => {
      throw new Error("Transaction has not failed.");
    }).catch((error) => {
      if (error instanceof Error) {
        const matches = error.message.match(/Tx failed: (\d+) - (.+)/);
        if (matches) {
          const errorCode = parseInt(matches[1]);
          const errorMessage = matches[2];
          if (code !== undefined && code !== errorCode) {
            throw new Error(`Failed with unexpected error code.`);
          }
          if (message !== undefined && message !== errorMessage) {
            throw new Error(`Failed with unexpected error message.`);
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
    (e: any) => e.identifier === "writeLog"
  );
  if (writeLogEvent) {
    return atob(writeLogEvent.data).split("@").slice(2);
  }
  const scr = tx?.smartContractResults.find(
    (r: any) => r.data === "@6f6b" || r.data.startsWith("@6f6b@")
  );
  if (scr) {
    return scr.data.split("@").slice(2);
  }
  return [];
};

export type TxResult = {
  tx: any;
};

export type DeployContractTxResult = TxResult & {
  deployedAddress: string;
  returnData: string[];
};

export type CallContractTxResult = TxResult & {
  returnData: string[];
};
