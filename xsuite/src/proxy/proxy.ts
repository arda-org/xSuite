import { e } from "../data";
import { Encodable } from "../data/Encodable";
import { Address, addressToAddressEncodable } from "../data/address";
import { Hex, hexToHexString } from "../data/hex";
import { RawKvs } from "../data/kvs";
import { b64ToHexString } from "../data/utils";

export class Proxy {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  static fetchRaw(url: string, data?: any) {
    return fetch(
      url,
      data !== undefined
        ? {
            method: "POST",
            body: JSON.stringify(data),
          }
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
    return res.data as Record<string, any>;
  }

  query(query: BroadQuery) {
    return Proxy.query(this.baseUrl, query);
  }

  static getAccountRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(`${baseUrl}/address/${address}`);
  }

  getAccountRaw(address: Address) {
    return Proxy.getAccountRaw(this.baseUrl, address);
  }

  static async getAccount(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountRaw(baseUrl, address));
    return {
      nonce: res.account.nonce,
      balance: BigInt(res.account.balance),
      code: res.account.code ? res.account.code : null,
      codeMetadata: res.account.codeMetadata
        ? b64ToHexString(res.account.codeMetadata)
        : null,
      owner: res.account.ownerAddress ? res.account.ownerAddress : null,
    } as {
      nonce: number;
      balance: bigint;
      code: string | null;
      codeMetadata: string | null;
      owner: string | null;
    };
  }

  getAccount(address: Address) {
    return Proxy.getAccount(this.baseUrl, address);
  }

  static getAccountNonceRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(`${baseUrl}/address/${address}/nonce`);
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
    return Proxy.fetchRaw(`${baseUrl}/address/${address}/balance`);
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
    return Proxy.fetchRaw(`${baseUrl}/address/${address}/keys`);
  }

  getAccountKvsRaw(address: Address) {
    return Proxy.getAccountKvsRaw(this.baseUrl, address);
  }

  static async getAccountKvs(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountKvsRaw(baseUrl, address));
    return res.pairs as RawKvs;
  }

  getAccountKvs(address: Address) {
    return Proxy.getAccountKvs(this.baseUrl, address);
  }

  static getAccountWithKvs(baseUrl: string, address: Address) {
    return Promise.all([
      Proxy.getAccount(baseUrl, address),
      Proxy.getAccountKvs(baseUrl, address),
    ]).then(([account, data]) => ({ ...account, kvs: data }));
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
      receiver: params.receiver.toString(),
      sender: params.sender.toString(),
      gasPrice: params.gasPrice ?? 0,
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
        codeMetadataToHexString(codeMetadata),
        ...(codeArgs ?? []).map(hexToHexString),
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
        codeMetadataToHexString(codeMetadata),
        ...(codeArgs ?? []).map(hexToHexString),
      ].join("@"),
      ...txParams,
    };
  }

  static getParamsToTransfer<T>({
    receiver: _receiver,
    sender,
    esdts,
    ...txParams
  }: Pick<TransferTxParams, "sender" | "receiver" | "esdts"> & T) {
    let receiver: Address;
    let data: string | undefined;
    if (esdts?.length) {
      receiver = sender;
      const dataParts: string[] = [];
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToAddressEncodable(_receiver).toTopHex());
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

  static getParamsToCallContract<T>({
    callee,
    sender,
    funcName,
    funcArgs,
    esdts,
    ...txParams
  }: Pick<
    CallContractTxParams,
    "sender" | "callee" | "funcName" | "funcArgs" | "esdts"
  > &
    T) {
    const dataParts: string[] = [];
    let receiver: Address;
    if (esdts?.length) {
      receiver = sender;
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToAddressEncodable(callee).toTopHex());
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
    dataParts.push(...(funcArgs ?? []).map(hexToHexString));
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
      scAddress: query.callee.toString(),
      funcName: query.funcName,
      args: (query.funcArgs ?? []).map(hexToHexString),
    };
  }
  return query;
};

export const codeMetadataToHexString = (codeMetadata: CodeMetadata): string => {
  if (typeof codeMetadata === "string") {
    return codeMetadata;
  }
  if (Array.isArray(codeMetadata)) {
    const bytes: number[] = [];
    let byteZero = 0;
    if (codeMetadata.includes("upgradeable")) {
      byteZero |= 1;
    }
    if (codeMetadata.includes("readable")) {
      byteZero |= 4;
    }
    let byteOne = 0;
    if (codeMetadata.includes("payable")) {
      byteOne |= 2;
    }
    if (codeMetadata.includes("payableBySc")) {
      byteOne |= 4;
    }
    if (byteZero > 0 || byteOne > 0) {
      bytes.push(byteZero, byteOne);
    }
    codeMetadata = e.Bytes(bytes);
  }
  return codeMetadata.toTopHex();
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
  funcArgs?: Hex[];
};

type RawQuery = {
  scAddress: string;
  funcName: string;
  args: string[];
};

export type TxParams = {
  nonce: number;
  value?: number | bigint;
  receiver: Address;
  sender: Address;
  gasPrice?: number;
  gasLimit: number;
  data?: string;
  chainId: string;
  version?: number;
};

export type DeployContractTxParams = {
  nonce: number;
  value?: number | bigint;
  sender: Address;
  gasPrice?: number;
  gasLimit: number;
  code: string;
  codeMetadata: CodeMetadata;
  codeArgs?: Hex[];
  chainId: string;
  version?: number;
};

export type CodeMetadata = string | Encodable | CodeProperty[];

type CodeProperty = "upgradeable" | "readable" | "payable" | "payableBySc";

export type UpgradeContractTxParams = {
  nonce: number;
  value?: number | bigint;
  callee: Address;
  sender: Address;
  gasPrice?: number;
  gasLimit: number;
  code: string;
  codeMetadata: CodeMetadata;
  codeArgs?: Hex[];
  chainId: string;
  version?: number;
};

export type TransferTxParams = {
  nonce: number;
  value?: number | bigint;
  receiver: Address;
  sender: Address;
  gasPrice?: number;
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
  gasPrice?: number;
  gasLimit: number;
  funcName: string;
  funcArgs?: Hex[];
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

type GetTxOptions = { withResults?: boolean };
