import { e } from "../data";
import {
  AddressLike,
  addressLikeToBechAddress,
  addressLikeToHexAddress,
} from "../data/addressLike";
import { BytesLike } from "../data/bytesLike";
import { EncodableCodeMetadata, eCodeMetadata } from "../data/encoding";
import { Kvs } from "../data/kvs";
import { base64ToHex } from "../data/utils";

export class Proxy {
  proxyUrl: string;
  headers: HeadersInit;
  explorerUrl: string;
  txCompletionPauseMs: number;

  constructor(params: ProxyParams) {
    params = typeof params === "string" ? { proxyUrl: params } : params;
    this.proxyUrl = params.proxyUrl;
    this.headers = params.headers ?? {};
    this.explorerUrl = params.explorerUrl ?? "";
    this.txCompletionPauseMs = params.txCompletionPauseMs ?? 1000;
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

  sendTxRaw(tx: BroadTx) {
    return this.fetchRaw("/transaction/send", broadTxToRawTx(tx));
  }

  async sendTx(tx: BroadTx) {
    const res = unrawRes(await this.sendTxRaw(tx));
    return res.txHash as string;
  }

  getTxRaw(txHash: string, options: GetTxOptions = {}) {
    let path = `/transaction/${txHash}`;
    if (options.withResults) path += "?withResults=true";
    return this.fetchRaw(path);
  }

  async getTx(txHash: string, options?: GetTxOptions) {
    return unrawTxRes(await this.getTxRaw(txHash, options));
  }

  getTxProcessStatusRaw(txHash: string) {
    return this.fetchRaw(`/transaction/${txHash}/process-status`);
  }

  async getTxProcessStatus(txHash: string) {
    const res = unrawRes(await this.getTxProcessStatusRaw(txHash));
    return res.status as string;
  }

  async getCompletedTxRaw(txHash: string) {
    let res = await this.getTxProcessStatusRaw(txHash);
    while (res.code !== "successful" || res.data.status === "pending") {
      await new Promise((r) => setTimeout(r, this.txCompletionPauseMs));
      res = await this.getTxProcessStatusRaw(txHash);
    }
    return await this.getTxRaw(txHash, { withResults: true });
  }

  async getCompletedTx(txHash: string) {
    const { hash, ..._res } = unrawTxRes(await this.getCompletedTxRaw(txHash));
    const explorerUrl = `${this.explorerUrl}/transactions/${hash}`;
    // Destructuring gives an invalid type: https://github.com/microsoft/TypeScript/issues/56456
    const res = Object.assign({ explorerUrl, hash }, _res);
    if (res.status !== "success") {
      throw new TxError("errorStatus", res.status, res);
    }
    if (res.executionReceipt?.returnCode) {
      const { returnCode, returnMessage } = res.executionReceipt;
      throw new TxError(returnCode, returnMessage, res);
    }
    const signalErrorEvent = res?.logs?.events.find(
      (e: any) => e.identifier === "signalError",
    );
    if (signalErrorEvent) {
      const error = atob(signalErrorEvent.topics[1]);
      throw new TxError("signalError", error, res);
    }
    return res as Record<string, any> & { hash: string; explorerUrl: string };
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

  getAccountRaw(address: AddressLike) {
    return this.fetchRaw(`/address/${addressLikeToBechAddress(address)}`);
  }

  async getSerializableAccount(address: AddressLike) {
    const res = unrawRes(await this.getAccountRaw(address));
    return {
      address: res.account.address,
      nonce: res.account.nonce,
      balance: res.account.balance,
      code: res.account.code,
      codeHash: base64ToHex(res.account.codeHash ?? ""),
      codeMetadata: base64ToHex(res.account.codeMetadata ?? ""),
      owner: res.account.ownerAddress,
    } as {
      address: string;
      nonce: number;
      balance: string;
      code: string;
      codeMetadata: string;
      codeHash: string;
      owner: string;
    };
  }

  async getAccount(address: AddressLike) {
    const { balance, ...account } = await this.getSerializableAccount(address);
    return { balance: BigInt(balance), ...account };
  }

  getAccountNonceRaw(address: AddressLike) {
    return this.fetchRaw(`/address/${addressLikeToBechAddress(address)}/nonce`);
  }

  async getAccountNonce(address: AddressLike) {
    const res = unrawRes(await this.getAccountNonceRaw(address));
    return res.nonce as number;
  }

  getAccountBalanceRaw(address: AddressLike) {
    return this.fetchRaw(
      `/address/${addressLikeToBechAddress(address)}/balance`,
    );
  }

  async getAccountBalance(address: AddressLike) {
    const res = unrawRes(await this.getAccountBalanceRaw(address));
    return BigInt(res.balance);
  }

  getAccountKvsRaw(address: AddressLike) {
    return this.fetchRaw(`/address/${addressLikeToBechAddress(address)}/keys`);
  }

  async getAccountKvs(address: AddressLike) {
    const res = unrawRes(await this.getAccountKvsRaw(address));
    return res.pairs as Kvs;
  }

  getSerializableAccountWithKvs(address: AddressLike) {
    return Promise.all([
      this.getSerializableAccount(address),
      this.getAccountKvs(address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getAccountWithKvs(address: AddressLike) {
    return Promise.all([
      this.getAccount(address),
      this.getAccountKvs(address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
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

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";

export type ProxyParams =
  | string
  | {
      proxyUrl: string;
      headers?: HeadersInit;
      explorerUrl?: string;
      txCompletionPauseMs?: number;
    };

export type BroadTx = Tx | RawTx;

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

type GetTxOptions = { withResults?: boolean };
