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
  params: ProxyParams;

  constructor(params: ProxyParams) {
    this.params = params;
  }

  static fetchRaw(params: ProxyParams, path: string, data?: any) {
    let baseUrl: string;
    const init: RequestInit = {};
    if (typeof params === "string") {
      baseUrl = params;
    } else {
      baseUrl = params.baseUrl;
      init.headers = params.headers;
    }
    if (data !== undefined) {
      init.method = "POST";
      init.body = JSON.stringify(data);
    }
    return fetch(`${baseUrl}${path}`, init).then((r) => r.json());
  }

  fetchRaw(path: string, data?: any) {
    return Proxy.fetchRaw(this.params, path, data);
  }

  static async fetch(params: ProxyParams, path: string, data?: any) {
    return unrawRes(await Proxy.fetchRaw(params, path, data));
  }

  fetch(path: string, data?: any) {
    return Proxy.fetch(this.params, path, data);
  }

  static sendTxRaw(params: ProxyParams, tx: BroadTx) {
    return Proxy.fetchRaw(params, "/transaction/send", broadTxToRawTx(tx));
  }

  sendTxRaw(tx: BroadTx) {
    return Proxy.sendTxRaw(this.params, tx);
  }

  static async sendTx(params: ProxyParams, tx: BroadTx) {
    const res = unrawRes(await Proxy.sendTxRaw(params, tx));
    return res.txHash as string;
  }

  sendTx(tx: BroadTx) {
    return Proxy.sendTx(this.params, tx);
  }

  static getTxRaw(
    params: ProxyParams,
    txHash: string,
    options: GetTxOptions = {},
  ) {
    let path = `/transaction/${txHash}`;
    if (options.withResults) path += "?withResults=true";
    return Proxy.fetchRaw(params, path);
  }

  getTxRaw(txHash: string, options?: GetTxOptions) {
    return Proxy.getTxRaw(this.params, txHash, options);
  }

  static async getTx(
    params: ProxyParams,
    txHash: string,
    options?: GetTxOptions,
  ) {
    return unrawTxRes(await Proxy.getTxRaw(params, txHash, options));
  }

  getTx(txHash: string, options?: GetTxOptions) {
    return Proxy.getTx(this.params, txHash, options);
  }

  static async getTxProcessStatusRaw(params: ProxyParams, txHash: string) {
    return Proxy.fetchRaw(params, `/transaction/${txHash}/process-status`);
  }

  getTxProcessStatusRaw(txHash: string) {
    return Proxy.getTxProcessStatusRaw(this.params, txHash);
  }

  static async getTxProcessStatus(params: ProxyParams, txHash: string) {
    const res = unrawRes(await Proxy.getTxProcessStatusRaw(params, txHash));
    return res.status as string;
  }

  getTxProcessStatus(txHash: string) {
    return Proxy.getTxProcessStatus(this.params, txHash);
  }

  static async getCompletedTxRaw(params: ProxyParams, txHash: string) {
    let res = await Proxy.getTxProcessStatusRaw(params, txHash);
    while (res.code !== "successful" || res.data.status === "pending") {
      await new Promise((r) => setTimeout(r, 1000));
      res = await Proxy.getTxProcessStatusRaw(params, txHash);
    }
    return await Proxy.getTxRaw(params, txHash, { withResults: true });
  }

  getCompletedTxRaw(txHash: string) {
    return Proxy.getCompletedTxRaw(this.params, txHash);
  }

  static async getCompletedTx(params: ProxyParams, txHash: string) {
    return unrawTxRes(await Proxy.getCompletedTxRaw(params, txHash));
  }

  getCompletedTx(txHash: string) {
    return Proxy.getCompletedTx(this.params, txHash);
  }

  static queryRaw(params: ProxyParams, query: BroadQuery) {
    return Proxy.fetchRaw(
      params,
      "/vm-values/query",
      broadQueryToRawQuery(query),
    );
  }

  queryRaw(query: BroadQuery) {
    return Proxy.queryRaw(this.params, query);
  }

  static async query(params: ProxyParams, query: BroadQuery) {
    const res = unrawRes(await Proxy.queryRaw(params, query));
    return {
      ...res.data,
      returnData: res.data.returnData.map(base64ToHex),
    } as Record<string, any> & { returnData: string[] };
  }

  query(query: BroadQuery) {
    return Proxy.query(this.params, query);
  }

  static getAccountRaw(params: ProxyParams, address: AddressLike) {
    return Proxy.fetchRaw(
      params,
      `/address/${addressLikeToBechAddress(address)}`,
    );
  }

  getAccountRaw(address: AddressLike) {
    return Proxy.getAccountRaw(this.params, address);
  }

  static async getSerializableAccount(
    params: ProxyParams,
    address: AddressLike,
  ) {
    const res = unrawRes(await Proxy.getAccountRaw(params, address));
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

  getSerializableAccount(address: AddressLike) {
    return Proxy.getSerializableAccount(this.params, address);
  }

  static async getAccount(params: ProxyParams, address: AddressLike) {
    const { balance, ...account } = await Proxy.getSerializableAccount(
      params,
      address,
    );
    return { balance: BigInt(balance), ...account };
  }

  getAccount(address: AddressLike) {
    return Proxy.getAccount(this.params, address);
  }

  static getAccountNonceRaw(params: ProxyParams, address: AddressLike) {
    return Proxy.fetchRaw(
      params,
      `/address/${addressLikeToBechAddress(address)}/nonce`,
    );
  }

  getAccountNonceRaw(address: AddressLike) {
    return Proxy.getAccountNonceRaw(this.params, address);
  }

  static async getAccountNonce(params: ProxyParams, address: AddressLike) {
    const res = unrawRes(await Proxy.getAccountNonceRaw(params, address));
    return res.nonce as number;
  }

  getAccountNonce(address: AddressLike) {
    return Proxy.getAccountNonce(this.params, address);
  }

  static getAccountBalanceRaw(params: ProxyParams, address: AddressLike) {
    return Proxy.fetchRaw(
      params,
      `/address/${addressLikeToBechAddress(address)}/balance`,
    );
  }

  getAccountBalanceRaw(address: AddressLike) {
    return Proxy.getAccountBalanceRaw(this.params, address);
  }

  static async getAccountBalance(params: ProxyParams, address: AddressLike) {
    const res = unrawRes(await Proxy.getAccountBalanceRaw(params, address));
    return BigInt(res.balance);
  }

  getAccountBalance(address: AddressLike) {
    return Proxy.getAccountBalance(this.params, address);
  }

  static getAccountKvsRaw(params: ProxyParams, address: AddressLike) {
    return Proxy.fetchRaw(
      params,
      `/address/${addressLikeToBechAddress(address)}/keys`,
    );
  }

  getAccountKvsRaw(address: AddressLike) {
    return Proxy.getAccountKvsRaw(this.params, address);
  }

  static async getAccountKvs(params: ProxyParams, address: AddressLike) {
    const res = unrawRes(await Proxy.getAccountKvsRaw(params, address));
    return res.pairs as Kvs;
  }

  getAccountKvs(address: AddressLike) {
    return Proxy.getAccountKvs(this.params, address);
  }

  static getSerializableAccountWithKvs(
    params: ProxyParams,
    address: AddressLike,
  ) {
    return Promise.all([
      Proxy.getSerializableAccount(params, address),
      Proxy.getAccountKvs(params, address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getSerializableAccountWithKvs(address: AddressLike) {
    return Proxy.getSerializableAccountWithKvs(this.params, address);
  }

  static getAccountWithKvs(params: ProxyParams, address: AddressLike) {
    return Promise.all([
      Proxy.getAccount(params, address),
      Proxy.getAccountKvs(params, address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getAccountWithKvs(address: AddressLike) {
    return Proxy.getAccountWithKvs(this.params, address);
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

const unrawRes = (res: any) => {
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

export type ProxyParams = string | { baseUrl: string; headers?: HeadersInit };

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

type GetTxOptions = { withResults?: boolean };
