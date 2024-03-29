import { e } from "../data";
import {
  Address,
  addressToBechAddress,
  addressToHexAddress,
} from "../data/address";
import { BytesLike } from "../data/bytesLike";
import { EncodableCodeMetadata, eCodeMetadata } from "../data/encoding";
import { Kvs } from "../data/kvs";
import { base64ToHex } from "../data/utils";

export class Proxy {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  static fetchRaw(url: string, data?: any) {
    return fetch(
      url,
      data !== undefined
        ? { method: "POST", body: JSON.stringify(data) }
        : undefined,
    ).then((r) => r.json());
  }

  fetchRaw(path: string, data?: any) {
    return Proxy.fetchRaw(`${this.baseUrl}${path}`, data);
  }

  static async fetch(url: string, data?: any) {
    return unrawRes(await Proxy.fetchRaw(url, data));
  }

  fetch(path: string, data?: any) {
    return Proxy.fetch(`${this.baseUrl}${path}`, data);
  }

  static sendTxRaw(baseUrl: string, tx: BroadTx) {
    return Proxy.fetchRaw(`${baseUrl}/transaction/send`, broadTxToRawTx(tx));
  }

  sendTxRaw(tx: BroadTx) {
    return Proxy.sendTxRaw(this.baseUrl, tx);
  }

  static async sendTx(baseUrl: string, tx: BroadTx) {
    const res = unrawRes(await Proxy.sendTxRaw(baseUrl, tx));
    return res.txHash as string;
  }

  sendTx(tx: BroadTx) {
    return Proxy.sendTx(this.baseUrl, tx);
  }

  static getTxRaw(baseUrl: string, txHash: string, options: GetTxOptions = {}) {
    let url = `${baseUrl}/transaction/${txHash}`;
    if (options.withResults) url += "?withResults=true";
    return Proxy.fetchRaw(url);
  }

  getTxRaw(txHash: string, options?: GetTxOptions) {
    return Proxy.getTxRaw(this.baseUrl, txHash, options);
  }

  static async getTx(baseUrl: string, txHash: string, options?: GetTxOptions) {
    return unrawTxRes(await Proxy.getTxRaw(baseUrl, txHash, options));
  }

  getTx(txHash: string, options?: GetTxOptions) {
    return Proxy.getTx(this.baseUrl, txHash, options);
  }

  static async getTxProcessStatusRaw(baseUrl: string, txHash: string) {
    return Proxy.fetchRaw(`${baseUrl}/transaction/${txHash}/process-status`);
  }

  getTxProcessStatusRaw(txHash: string) {
    return Proxy.getTxProcessStatusRaw(this.baseUrl, txHash);
  }

  static async getTxProcessStatus(baseUrl: string, txHash: string) {
    const res = unrawRes(await Proxy.getTxProcessStatusRaw(baseUrl, txHash));
    return res.status as string;
  }

  getTxProcessStatus(txHash: string) {
    return Proxy.getTxProcessStatus(this.baseUrl, txHash);
  }

  static async getCompletedTxRaw(baseUrl: string, txHash: string) {
    let res = await Proxy.getTxProcessStatusRaw(baseUrl, txHash);
    while (res.code !== "successful" || res.data.status === "pending") {
      await new Promise((r) => setTimeout(r, 1000));
      res = await Proxy.getTxProcessStatusRaw(baseUrl, txHash);
    }
    return await Proxy.getTxRaw(baseUrl, txHash, { withResults: true });
  }

  getCompletedTxRaw(txHash: string) {
    return Proxy.getCompletedTxRaw(this.baseUrl, txHash);
  }

  static async getCompletedTx(baseUrl: string, txHash: string) {
    return unrawTxRes(await Proxy.getCompletedTxRaw(baseUrl, txHash));
  }

  getCompletedTx(txHash: string) {
    return Proxy.getCompletedTx(this.baseUrl, txHash);
  }

  static queryRaw(baseUrl: string, query: BroadQuery) {
    return Proxy.fetchRaw(
      `${baseUrl}/vm-values/query`,
      broadQueryToRawQuery(query),
    );
  }

  queryRaw(query: BroadQuery) {
    return Proxy.queryRaw(this.baseUrl, query);
  }

  static async query(baseUrl: string, query: BroadQuery) {
    const res = unrawRes(await Proxy.queryRaw(baseUrl, query));
    return {
      ...res.data,
      returnData: res.data.returnData.map(base64ToHex),
    } as Record<string, any> & { returnData: string[] };
  }

  query(query: BroadQuery) {
    return Proxy.query(this.baseUrl, query);
  }

  static getAccountRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBechAddress(address)}`,
    );
  }

  getAccountRaw(address: Address) {
    return Proxy.getAccountRaw(this.baseUrl, address);
  }

  static async getSerializableAccount(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountRaw(baseUrl, address));
    const account: {
      address: string;
      nonce: number;
      balance: string;
      code?: string | undefined;
      codeMetadata?: string | undefined;
      owner?: string | undefined;
    } = {
      address: res.account.address,
      nonce: res.account.nonce,
      balance: res.account.balance,
    };
    if (res.account.code) {
      account.code = res.account.code;
    }
    if (res.account.codeMetadata) {
      account.codeMetadata = base64ToHex(res.account.codeMetadata);
    }
    if (res.account.ownerAddress) {
      account.owner = res.account.ownerAddress;
    }
    return account;
  }

  getSerializableAccount(address: Address) {
    return Proxy.getSerializableAccount(this.baseUrl, address);
  }

  static async getAccount(baseUrl: string, address: Address) {
    const { balance, ...account } = await Proxy.getSerializableAccount(
      baseUrl,
      address,
    );
    return { balance: BigInt(balance), ...account };
  }

  getAccount(address: Address) {
    return Proxy.getAccount(this.baseUrl, address);
  }

  static getAccountNonceRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBechAddress(address)}/nonce`,
    );
  }

  getAccountNonceRaw(address: Address) {
    return Proxy.getAccountNonceRaw(this.baseUrl, address);
  }

  static async getAccountNonce(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountNonceRaw(baseUrl, address));
    return res.nonce as number;
  }

  getAccountNonce(address: Address) {
    return Proxy.getAccountNonce(this.baseUrl, address);
  }

  static getAccountBalanceRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBechAddress(address)}/balance`,
    );
  }

  getAccountBalanceRaw(address: Address) {
    return Proxy.getAccountBalanceRaw(this.baseUrl, address);
  }

  static async getAccountBalance(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountBalanceRaw(baseUrl, address));
    return BigInt(res.balance);
  }

  getAccountBalance(address: Address) {
    return Proxy.getAccountBalance(this.baseUrl, address);
  }

  static getAccountKvsRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBechAddress(address)}/keys`,
    );
  }

  getAccountKvsRaw(address: Address) {
    return Proxy.getAccountKvsRaw(this.baseUrl, address);
  }

  static async getAccountKvs(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountKvsRaw(baseUrl, address));
    return res.pairs as Kvs;
  }

  getAccountKvs(address: Address) {
    return Proxy.getAccountKvs(this.baseUrl, address);
  }

  static getSerializableAccountWithKvs(baseUrl: string, address: Address) {
    return Promise.all([
      Proxy.getSerializableAccount(baseUrl, address),
      Proxy.getAccountKvs(baseUrl, address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getSerializableAccountWithKvs(address: Address) {
    return Proxy.getSerializableAccountWithKvs(this.baseUrl, address);
  }

  static getAccountWithKvs(baseUrl: string, address: Address) {
    return Promise.all([
      Proxy.getAccount(baseUrl, address),
      Proxy.getAccountKvs(baseUrl, address),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getAccountWithKvs(address: Address) {
    return Proxy.getAccountWithKvs(this.baseUrl, address);
  }
}

export class Tx {
  unsignedRawTx: Omit<RawTx, "signature">;
  signature: string | undefined;

  constructor(params: TxParams) {
    this.unsignedRawTx = {
      nonce: params.nonce,
      value: (params.value ?? 0n).toString(),
      receiver: addressToBechAddress(params.receiver),
      sender: addressToBechAddress(params.sender),
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

  static getParamsToTransfer<T, U extends Address>({
    receiver: _receiver,
    sender,
    esdts,
    ...txParams
  }: Pick<TransferTxParams, "receiver" | "esdts"> & { sender: U } & T) {
    let receiver: Address;
    let data: string | undefined;
    if (esdts?.length) {
      receiver = sender;
      const dataParts: string[] = [];
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToHexAddress(_receiver));
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

  static getParamsToCallContract<T, U extends Address>({
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
    let receiver: Address;
    if (esdts?.length) {
      receiver = sender;
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToHexAddress(callee));
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
      scAddress: addressToBechAddress(query.callee),
      funcName: query.funcName,
      args: e.vs(query.funcArgs ?? []),
      caller:
        query.sender !== undefined
          ? addressToBechAddress(query.sender)
          : undefined,
      value: query.value !== undefined ? query.value.toString() : undefined,
    };
  }
  return query;
};

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";

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
  callee: Address;
  funcName: string;
  funcArgs?: BytesLike[];
  sender?: Address;
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
  receiver: Address;
  sender: Address;
  gasPrice: number;
  gasLimit: number;
  data?: string;
  chainId: string;
  version?: number;
};

export type DeployContractTxParams = {
  nonce: number;
  value?: number | bigint;
  sender: Address;
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
  callee: Address;
  sender: Address;
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
  receiver: Address;
  sender: Address;
  gasPrice: number;
  gasLimit: number;
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

export type CallContractTxParams = {
  nonce: number;
  value?: number | bigint;
  callee: Address;
  sender: Address;
  gasPrice: number;
  gasLimit: number;
  funcName: string;
  funcArgs?: BytesLike[];
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

type GetTxOptions = { withResults?: boolean };
