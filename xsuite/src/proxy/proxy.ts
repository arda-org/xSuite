import { e } from "../data";
import { zeroBechAddress } from "../data/address";
import {
  AddressLike,
  addressLikeToBechAddress,
  addressLikeToHexAddress,
} from "../data/addressLike";
import { BytesLike } from "../data/bytesLike";
import { EncodableCodeMetadata, eCodeMetadata } from "../data/encoding";
import { Kvs } from "../data/kvs";
import { base64ToHex } from "../data/utils";
import { Prettify } from "../helpers";
import { InteractionPromise } from "../world/world";

export class Proxy {
  proxyUrl: string;
  headers: HeadersInit;
  explorerUrl: string;

  constructor(params: ProxyParams) {
    params = typeof params === "string" ? { proxyUrl: params } : params;
    this.proxyUrl = params.proxyUrl;
    this.headers = params.headers ?? {};
    this.explorerUrl = params.explorerUrl ?? "";
  }

  fetchRaw(path: string, data?: any) {
    const baseUrl = this.proxyUrl;
    const init: RequestInit = { headers: this.headers };
    if (data !== undefined) {
      init.method = "POST";
      init.body = JSON.stringify(data);
    }
    return fetch(`${baseUrl}${path}`, init).then((r) => r.json());
  }

  async fetch(path: string, data?: any) {
    return unrawRes(await this.fetchRaw(path, data));
  }

  getTxRaw(txHash: string, { withResults }: GetTxRequestOptions = {}) {
    let path = `/transaction/${txHash}`;
    if (withResults) path += "?withResults=true";
    return this.fetchRaw(path);
  }

  getTx(txHash: string) {
    return this._getTx(txHash, { withResults: true });
  }

  getTxWithoutResults(txHash: string) {
    return this._getTx(txHash, { withResults: false });
  }

  private async _getTx(txHash: string, options?: GetTxRequestOptions) {
    const { hash, ..._res } = unrawTxRes(await this.getTxRaw(txHash, options));
    const explorerUrl = `${this.explorerUrl}/transactions/${hash}`;
    // Destructuring gives an invalid type: https://github.com/microsoft/TypeScript/issues/56456
    return Object.assign({ explorerUrl, hash }, _res) as TxResult;
  }

  sendTxRaw(tx: BroadTx) {
    return this.fetchRaw("/transaction/send", broadTxToRawTx(tx));
  }

  // TODO: avoir sendCallContract, etc

  async sendTx(tx: BroadTx) {
    const res = unrawRes(await this.sendTxRaw(tx));
    return res.txHash as string;
  }

  async awaitTx(txHash: string) {
    let res = await this.getTx(txHash);
    let status = getTxStatus(res);
    while (status.type === "pending") {
      await new Promise((r) => setTimeout(r, 1000));
      res = await this.getTx(txHash);
      status = getTxStatus(res);
    }
  }

  resolveTx(txHash: string) {
    return this._resolveTx(txHash) as InteractionPromise<TxResult>;
  }

  resolveTransfer(txHash: string) {
    return this.resolveTx(txHash);
  }

  resolveDeployContract(txHash: string) {
    return InteractionPromise.fromFn<DeployContractResult>(async () => {
      const { returnData, newAddress, ...res } = await this._resolveTx(txHash);
      if (returnData === undefined) {
        throw new Error("Undefined returnData.");
      }
      if (newAddress === undefined) {
        throw new Error("Undefined newAddress.");
      }
      return { ...res, returnData, newAddress };
    });
  }

  resolveCallContract(txHash: string) {
    return InteractionPromise.fromFn<CallContractResult>(async () => {
      const { returnData, ...res } = await this.resolveTx(txHash);
      if (returnData === undefined) {
        throw new Error("Undefined returnData.");
      }
      return { ...res, returnData };
    });
  }

  resolveUpgradeContract(txHash: string) {
    return this.resolveCallContract(txHash);
  }

  private _resolveTx(txHash: string) {
    return InteractionPromise.fromFn(async () => {
      const res = await this.getTx(txHash);
      const status = getTxStatus(res);
      if (status.type === "pending") {
        throw new Error(pendingErrorMessage);
      }
      if (status.type === "error") {
        throw new TxError(status.code, status.message, res);
      }
      const { returnData, newAddress } = status;
      return { ...res, returnData, newAddress };
    });
  }

  awaitResolvedTx(txHash: string) {
    return this._awaitResolved(() => this.resolveTx.call(this, txHash));
  }

  awaitResolvedTransfer(txHash: string) {
    return this._awaitResolved(() => this.resolveTransfer.call(this, txHash));
  }

  awaitResolvedDeployContract(txHash: string) {
    return this._awaitResolved(() =>
      this.resolveDeployContract.call(this, txHash),
    );
  }

  awaitResolvedCallContract(txHash: string) {
    return this._awaitResolved(() =>
      this.resolveCallContract.call(this, txHash),
    );
  }

  awaitResolvedUpgradeContract(txHash: string) {
    return this._awaitResolved(() =>
      this.resolveUpgradeContract.call(this, txHash),
    );
  }

  private _awaitResolved<T>(resolve: () => InteractionPromise<T>) {
    return InteractionPromise.fromFn<T>(async () => {
      let p = resolve();
      while (await isResolvePending(p)) {
        await new Promise((r) => setTimeout(r, 1000));
        p = resolve();
      }
      return await p;
    });
  }

  async getCompletedTx(txHash: string) {
    let res = await this.getTx(txHash);
    let status = getTxStatus(res);
    while (status.type === "pending") {
      await new Promise((r) => setTimeout(r, 1000));
      res = await this.getTx(txHash);
      status = getTxStatus(res);
    }
    if (status.type === "error") {
      throw new TxError(status.code, status.message, res);
    }
    return Object.assign({ returnData: status.returnData }, res);
  }

  queryRaw(query: BroadQuery) {
    return this.fetchRaw("/vm-values/query", broadQueryToRawQuery(query));
  }

  async query(query: BroadQuery) {
    const { data } = unrawRes(await this.queryRaw(query));
    if (![0, "ok"].includes(data.returnCode)) {
      throw new QueryError(data.returnCode, data.returnMessage, data);
    }
    return {
      ...data,
      returnData: data.returnData.map(base64ToHex),
    } as Record<string, any> & { returnData: string[] };
  }

  getAccountNonceRaw(
    address: AddressLike,
    { shardId }: AccountRequestOptions = {},
  ) {
    let path = `/address/${addressLikeToBechAddress(address)}/nonce`;
    if (shardId !== undefined) path += `?forced-shard-id=${shardId}`;
    return this.fetchRaw(path);
  }

  async getAccountNonce(address: AddressLike, options?: AccountRequestOptions) {
    const res = unrawRes(await this.getAccountNonceRaw(address, options));
    return res.nonce as number;
  }

  getAccountBalanceRaw(
    address: AddressLike,
    { shardId }: AccountRequestOptions = {},
  ) {
    let path = `/address/${addressLikeToBechAddress(address)}/balance`;
    if (shardId !== undefined) path += `?forced-shard-id=${shardId}`;
    return this.fetchRaw(path);
  }

  async getAccountBalance(
    address: AddressLike,
    options?: AccountRequestOptions,
  ) {
    const res = unrawRes(await this.getAccountBalanceRaw(address, options));
    return BigInt(res.balance);
  }

  getAccountKvsRaw(
    address: AddressLike,
    { shardId }: AccountRequestOptions = {},
  ) {
    let path = `/address/${addressLikeToBechAddress(address)}/keys`;
    if (shardId !== undefined) path += `?forced-shard-id=${shardId}`;
    return this.fetchRaw(path);
  }

  async getAccountKvs(address: AddressLike, options?: AccountRequestOptions) {
    const res = unrawRes(await this.getAccountKvsRaw(address, options));
    return res.pairs as Kvs;
  }

  getAccountRaw(address: AddressLike, { shardId }: AccountRequestOptions = {}) {
    let path = `/address/${addressLikeToBechAddress(address)}`;
    if (shardId !== undefined) path += `?forced-shard-id=${shardId}`;
    return this.fetchRaw(path);
  }

  async getSerializableAccountWithoutKvs(
    address: AddressLike,
    options?: AccountRequestOptions,
  ) {
    const res = unrawRes(await this.getAccountRaw(address, options));
    return getSerializableAccount(res.account);
  }

  getSerializableAccount(
    address: AddressLike,
    options?: AccountRequestOptions,
  ) {
    // TODO-MvX: When ?withKeys=true out, rewrite this part
    return Promise.all([
      this.getSerializableAccountWithoutKvs(address, options),
      this.getAccountKvs(address, options),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  async getAccountWithoutKvs(
    address: AddressLike,
    options?: AccountRequestOptions,
  ) {
    const { balance, ...account } = await this.getSerializableAccountWithoutKvs(
      address,
      options,
    );
    return { balance: BigInt(balance), ...account };
  }

  getAccount(address: AddressLike, options?: AccountRequestOptions) {
    // TODO-MvX: When ?withKeys=true out, rewrite this part
    return Promise.all([
      this.getAccountWithoutKvs(address, options),
      this.getAccountKvs(address, options),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
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

export class Tx {
  unsignedRawTx: Omit<RawTx, "signature">;
  signature: string | undefined;

  constructor(params: TxParams) {
    this.unsignedRawTx = {
      nonce: params.nonce,
      value: (params.value ?? 0n).toString(),
      receiver: addressLikeToBechAddress(params.receiver),
      sender: addressLikeToBechAddress(params.sender),
      gasPrice: params.gasPrice,
      gasLimit: params.gasLimit,
      data: params.data === undefined ? undefined : btoa(params.data),
      chainID: params.chainId,
      version: params.version ?? 1,
    };
  }

  static getParamsToDeployContract<T>({
    code,
    codeMetadata,
    codeArgs,
    ...txParams
  }: Pick<DeployContractTxParams, "code" | "codeMetadata" | "codeArgs"> & T) {
    return {
      receiver: zeroBechAddress,
      data: [
        code,
        "0500",
        eCodeMetadata(codeMetadata),
        ...e.vs(codeArgs ?? []),
      ].join("@"),
      ...txParams,
    };
  }

  static getParamsToUpgradeContract<T>({
    callee,
    code,
    codeMetadata,
    codeArgs,
    ...txParams
  }: Pick<
    UpgradeContractTxParams,
    "callee" | "code" | "codeMetadata" | "codeArgs"
  > &
    T) {
    return {
      receiver: callee,
      data: [
        "upgradeContract",
        code,
        eCodeMetadata(codeMetadata),
        ...e.vs(codeArgs ?? []),
      ].join("@"),
      ...txParams,
    };
  }

  static getParamsToTransfer<T, U extends AddressLike>({
    receiver: _receiver,
    sender,
    esdts,
    ...txParams
  }: Pick<TransferTxParams, "receiver" | "esdts"> & { sender: U } & T) {
    let receiver: AddressLike;
    let data: string | undefined;
    if (esdts?.length) {
      receiver = sender;
      const dataParts: string[] = [];
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressLikeToHexAddress(_receiver));
      dataParts.push(e.U(esdts.length).toTopHex());
      for (const esdt of esdts) {
        dataParts.push(e.Str(esdt.id).toTopHex());
        dataParts.push(e.U(esdt.nonce ?? 0).toTopHex());
        dataParts.push(e.U(esdt.amount).toTopHex());
      }
      data = dataParts.join("@");
    } else {
      receiver = _receiver;
    }
    return {
      receiver,
      sender,
      data,
      ...txParams,
    };
  }

  static getParamsToCallContract<T, U extends AddressLike>({
    callee,
    sender,
    funcName,
    funcArgs,
    esdts,
    ...txParams
  }: Pick<
    CallContractTxParams,
    "callee" | "funcName" | "funcArgs" | "esdts"
  > & { sender: U } & T) {
    const dataParts: string[] = [];
    let receiver: AddressLike;
    if (esdts?.length) {
      receiver = sender;
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressLikeToHexAddress(callee));
      dataParts.push(e.U(esdts.length).toTopHex());
      for (const esdt of esdts) {
        dataParts.push(e.Str(esdt.id).toTopHex());
        dataParts.push(e.U(esdt.nonce ?? 0).toTopHex());
        dataParts.push(e.U(esdt.amount).toTopHex());
      }
      dataParts.push(e.Str(funcName).toTopHex());
    } else {
      receiver = callee;
      dataParts.push(funcName);
    }
    dataParts.push(...e.vs(funcArgs ?? []));
    return {
      receiver,
      sender,
      data: dataParts.join("@"),
      ...txParams,
    };
  }

  async sign(signer: { sign: (data: Buffer) => Promise<Buffer> }) {
    this.signature = await signer
      .sign(Buffer.from(JSON.stringify(this.unsignedRawTx)))
      .then((b) => b.toString("hex"));
  }

  toRawTx(): RawTx {
    if (this.signature === undefined) {
      throw new Error("Transaction not signed.");
    }
    return { ...this.unsignedRawTx, signature: this.signature };
  }
}

export class InteractionError extends Error {
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

export const unrawRes = (res: any) => {
  if (res.code === "successful") {
    return res.data;
  } else {
    const resStr = JSON.stringify(res, null, 2);
    throw new Error(`Unsuccessful proxy request. Response: ${resStr}`);
  }
};

const unrawTxRes = (r: any) => {
  return unrawRes(r).transaction as Record<string, any>;
};

const broadTxToRawTx = (tx: BroadTx): RawTx => {
  if (tx instanceof Tx) {
    return tx.toRawTx();
  }
  return tx;
};

const broadQueryToRawQuery = (query: BroadQuery): RawQuery => {
  if ("callee" in query) {
    query = {
      scAddress: addressLikeToBechAddress(query.callee),
      funcName: query.funcName,
      args: e.vs(query.funcArgs ?? []),
      caller:
        query.sender !== undefined
          ? addressLikeToBechAddress(query.sender)
          : undefined,
      value: query.value !== undefined ? query.value.toString() : undefined,
    };
  }
  return query;
};

export const getSerializableAccount = (rawAccount: any) => {
  return {
    address: rawAccount.address,
    nonce: rawAccount.nonce,
    balance: rawAccount.balance,
    code: rawAccount.code,
    codeHash: base64ToHex(rawAccount.codeHash ?? ""),
    codeMetadata: base64ToHex(rawAccount.codeMetadata ?? ""),
    owner: rawAccount.ownerAddress,
    kvs: rawAccount.pairs ?? {},
  } as {
    address: string;
    nonce: number;
    balance: string;
    code: string;
    codeMetadata: string;
    codeHash: string;
    owner: string;
    kvs: Kvs;
  };
};

export const getTxStatus = (result: any): TxStatus => {
  if (result.executionReceipt?.returnCode) {
    const { returnCode, returnMessage } = result.executionReceipt;
    return { type: "error", code: returnCode, message: returnMessage };
  }
  const signalErrorEvent =
    result?.logs?.events.find((e: any) => e.identifier === "signalError") ??
    result?.smartContractResults
      ?.find(
        (r: any) =>
          r?.logs?.events?.some((e: any) => e.identifier === "signalError"),
      )
      ?.logs?.events?.find((e: any) => e.identifier === "signalError");
  if (signalErrorEvent) {
    const message = atob(signalErrorEvent.topics[1]);
    return { type: "error", code: "signalError", message };
  }
  if (
    result?.logs?.events?.some(
      (e: any) => e.identifier === "completedTxEvent",
    ) ||
    result?.smartContractResults?.some(
      (r: any) =>
        r?.logs?.events?.some((e: any) => e.identifier === "completedTxEvent"),
    ) ||
    (result.receiver === zeroBechAddress &&
      result?.logs?.events?.find((e: any) => e.identifier === "SCDeploy")) ||
    "receipt" in result
  ) {
    const newAddress = result?.logs?.events?.find(
      (e: any) => e.identifier === "SCDeploy",
    )?.address;
    const writeLogEvent = result?.logs?.events?.find(
      (e: any) => e.identifier === "writeLog",
    );
    if (writeLogEvent) {
      const returnData = atob(writeLogEvent.data).split("@").slice(2);
      return { type: "success", returnData, newAddress };
    }
    const scr = result?.smartContractResults?.find(
      (r: any) => r.data === "@6f6b" || r.data?.startsWith("@6f6b@"),
    );
    if (scr) {
      const returnData = scr.data.split("@").slice(2);
      return { type: "success", returnData, newAddress };
    }
    return { type: "success" };
  }
  return { type: "pending" };
};

const isResolvePending = (p: InteractionPromise<any>) =>
  p
    .then(() => false)
    .catch((e) => e instanceof Error && e.message === pendingErrorMessage);

export const pendingErrorMessage = "Transaction still pending.";

export type ProxyParams =
  | string
  | { proxyUrl: string; headers?: HeadersInit; explorerUrl?: string };

type BroadTx = Tx | RawTx;

type RawTx = {
  nonce: number;
  value: string;
  receiver: string;
  sender: string;
  gasPrice: number;
  gasLimit: number;
  data?: string;
  signature: string;
  chainID: string;
  version: number;
};

type BroadQuery = Query | RawQuery;

export type Query = {
  callee: AddressLike;
  funcName: string;
  funcArgs?: BytesLike[];
  sender?: AddressLike;
  value?: number | bigint;
};

type RawQuery = {
  scAddress: string;
  funcName: string;
  args: string[];
  caller?: string;
  value?: string;
};

export type TxParams = {
  nonce: number;
  value?: number | bigint;
  receiver: AddressLike;
  sender: AddressLike;
  gasPrice: number;
  gasLimit: number;
  data?: string;
  chainId: string;
  version?: number;
};

export type DeployContractTxParams = {
  nonce: number;
  value?: number | bigint;
  sender: AddressLike;
  gasPrice: number;
  gasLimit: number;
  code: string;
  codeMetadata: EncodableCodeMetadata;
  codeArgs?: BytesLike[];
  chainId: string;
  version?: number;
};

export type UpgradeContractTxParams = {
  nonce: number;
  value?: number | bigint;
  callee: AddressLike;
  sender: AddressLike;
  gasPrice: number;
  gasLimit: number;
  code: string;
  codeMetadata: EncodableCodeMetadata;
  codeArgs?: BytesLike[];
  chainId: string;
  version?: number;
};

export type TransferTxParams = {
  nonce: number;
  value?: number | bigint;
  receiver: AddressLike;
  sender: AddressLike;
  gasPrice: number;
  gasLimit: number;
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

export type CallContractTxParams = {
  nonce: number;
  value?: number | bigint;
  callee: AddressLike;
  sender: AddressLike;
  gasPrice: number;
  gasLimit: number;
  funcName: string;
  funcArgs?: BytesLike[];
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

type GetTxRequestOptions = { withResults?: boolean };

type AccountRequestOptions = { shardId?: number };

type TxStatus =
  | { type: "pending" }
  | { type: "success"; returnData?: string[]; newAddress?: string }
  | { type: "error"; code: string; message: string };

type TxResult = Prettify<
  {
    hash: string;
    explorerUrl: string;
  } & Record<string, any>
>;

type DeployContractResult = Prettify<
  TxResult & { returnData: string[]; newAddress: string }
>;

type CallContractResult = Prettify<TxResult & { returnData: string[] }>;
