import { Encodable, e, AddressEncodable } from "../enc";

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
        : undefined
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

  static sendTxRaw(baseUrl: string, tx: Tx) {
    return Proxy.fetchRaw(`${baseUrl}/transaction/send`, txToRawTx(tx));
  }

  sendTxRaw(tx: Tx) {
    return Proxy.sendTxRaw(this.baseUrl, tx);
  }

  static async sendTx(baseUrl: string, tx: Tx) {
    const res = unrawRes(await Proxy.sendTxRaw(baseUrl, tx));
    return res.txHash as string;
  }

  sendTx(tx: Tx) {
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

  static async getCompletedTxRaw(baseUrl: string, txHash: string) {
    let res = await this.getTxRaw(baseUrl, txHash, { withResults: true });
    while (!isTxCompleted(res)) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await this.getTxRaw(baseUrl, txHash, { withResults: true });
    }
    return res;
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

  static getAccountRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(`${baseUrl}/address/${addressToBech32(address)}`);
  }

  getAccountRaw(address: Address) {
    return Proxy.getAccountRaw(this.baseUrl, address);
  }

  static async getAccount(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountRaw(baseUrl, address));
    return {
      nonce: res.account.nonce,
      balance: BigInt(res.account.balance),
      code: res.account.code,
    } as {
      nonce: number;
      balance: bigint;
      code: string;
    };
  }

  getAccount(address: Address) {
    return Proxy.getAccount(this.baseUrl, address);
  }

  static getAccountNonceRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBech32(address)}/nonce`
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

  static getAccountPairsRaw(baseUrl: string, address: Address) {
    return Proxy.fetchRaw(
      `${baseUrl}/address/${addressToBech32(address)}/keys`
    );
  }

  getAccountPairsRaw(address: Address) {
    return Proxy.getAccountPairsRaw(this.baseUrl, address);
  }

  static async getAccountPairs(baseUrl: string, address: Address) {
    const res = unrawRes(await Proxy.getAccountPairsRaw(baseUrl, address));
    return res.pairs as Record<string, string>;
  }

  getAccountPairs(address: Address) {
    return Proxy.getAccountPairs(this.baseUrl, address);
  }

  static getAccountWithPairs(baseUrl: string, address: Address) {
    return Promise.all([
      Proxy.getAccount(baseUrl, address),
      Proxy.getAccountPairs(baseUrl, address),
    ]).then(([account, pairs]) => ({ ...account, pairs }));
  }

  getAccountWithPairs(address: Address) {
    return Proxy.getAccountWithPairs(this.baseUrl, address);
  }
}

export class Transaction {
  unsignedRawTx: Omit<RawTx, "signature">;
  signature: string | undefined;

  constructor(params: TxParams) {
    this.unsignedRawTx = {
      nonce: params.nonce,
      value: (params.value ?? 0n).toString(),
      receiver: addressToBech32(params.receiver),
      sender: addressToBech32(params.sender),
      gasPrice: params.gasPrice ?? 0,
      gasLimit: params.gasLimit,
      data: params.data === undefined ? undefined : btoa(params.data),
      chainID: params.chainId,
      version: params.version ?? 1,
    };
  }

  static deployContract(params: DeployContractTxParams) {
    return new Transaction(Transaction.getParamsToDeployContract(params));
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

  static upgradeContract(params: UpgradeContractTxParams) {
    return new Transaction(Transaction.getParamsToUpgradeContract(params));
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
        code,
        codeMetadataToHexString(codeMetadata),
        ...(codeArgs ?? []).map(hexToHexString),
      ].join("@"),
      ...txParams,
    };
  }

  static transfer(params: TransferTxParams) {
    return new Transaction(Transaction.getParamsToTransfer(params));
  }

  static getParamsToTransfer<T>({
    receiver: _receiver,
    sender,
    esdts,
    ...txParams
  }: Pick<TransferTxParams, "sender" | "receiver" | "esdts"> & T) {
    const dataParts: string[] = [];
    let receiver: string | AddressEncodable;
    if (esdts?.length) {
      receiver = sender;
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToHexString(_receiver));
      dataParts.push(e.U(esdts.length).toTopHex());
      for (const esdt of esdts) {
        dataParts.push(e.Str(esdt.id).toTopHex());
        dataParts.push(e.U(esdt.nonce ?? 0).toTopHex());
        dataParts.push(e.U(esdt.amount).toTopHex());
      }
    } else {
      receiver = _receiver;
    }
    return {
      receiver,
      sender,
      data: dataParts.join("@"),
      ...txParams,
    };
  }

  static callContract(params: CallContractTxParams) {
    return new Transaction(Transaction.getParamsToCallContract(params));
  }

  static getParamsToCallContract<T>({
    callee,
    sender,
    functionName,
    functionArgs,
    esdts,
    ...txParams
  }: Pick<
    CallContractTxParams,
    "sender" | "callee" | "functionName" | "functionArgs" | "esdts"
  > &
    T) {
    const dataParts: string[] = [];
    let receiver: string | AddressEncodable;
    if (esdts?.length) {
      receiver = sender;
      dataParts.push("MultiESDTNFTTransfer");
      dataParts.push(addressToHexString(callee));
      dataParts.push(e.U(esdts.length).toTopHex());
      for (const esdt of esdts) {
        dataParts.push(e.Str(esdt.id).toTopHex());
        dataParts.push(e.U(esdt.nonce ?? 0).toTopHex());
        dataParts.push(e.U(esdt.amount).toTopHex());
      }
      dataParts.push(e.Str(functionName).toTopHex());
    } else {
      receiver = callee;
      dataParts.push(functionName);
    }
    dataParts.push(...(functionArgs ?? []).map(hexToHexString));
    return {
      receiver,
      sender,
      data: dataParts.join("@"),
      ...txParams,
    };
  }

  async sign(signer: { sign: (message: string) => Promise<string> }) {
    this.signature = await signer.sign(JSON.stringify(this.unsignedRawTx));
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
    throw new Error("Unsuccessful proxy request.");
  }
};

const unrawTxRes = (r: any) => {
  return unrawRes(r).transaction as Record<string, any>;
};

const txToRawTx = (tx: Tx): RawTx => {
  if (tx instanceof Transaction) {
    return tx.toRawTx();
  }
  return tx;
};

export const addressToBech32 = (address: Address) => {
  if (typeof address === "string") {
    return address;
  }
  return address.toBech32();
};

const addressToHexString = (address: Address) => {
  if (typeof address === "string") {
    address = e.Addr(address);
  }
  return address.toTopHex();
};

export const codeMetadataToHexString = (codeMetadata: CodeMetadata): string => {
  if (typeof codeMetadata === "string") {
    return codeMetadata;
  }
  if (codeMetadata === undefined) {
    codeMetadata = [];
  }
  if (Array.isArray(codeMetadata)) {
    let byteZero = 0;
    let byteOne = 0;
    if (codeMetadata.includes("upgradeable")) {
      byteZero |= 1;
    }
    if (codeMetadata.includes("readable")) {
      byteZero |= 4;
    }
    if (codeMetadata.includes("payable")) {
      byteOne |= 2;
    }
    if (codeMetadata.includes("payableBySc")) {
      byteOne |= 4;
    }
    codeMetadata = e.Bytes([byteZero, byteOne]);
  }
  return codeMetadata.toTopHex();
};

export const hexToHexString = (hex: Hex) => {
  if (typeof hex === "string") {
    return hex;
  }
  return hex.toTopHex();
};

const isTxCompleted = (res: any): boolean => {
  const events: any[] | undefined = res?.data?.transaction?.logs?.events;
  if (events) {
    return events.some((e) => completionEvents.includes(e.identifier));
  }
  return false;
};

const completionEvents = ["completedTxEvent", "SCDeploy", "signalError"];

const zeroBechAddress =
  "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu";

export type Address = string | AddressEncodable;

type Tx = Transaction | RawTx;

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

export type TxParams = {
  nonce: number;
  value?: bigint;
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
  value?: bigint;
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

export type Hex = string | Encodable;

export type UpgradeContractTxParams = {
  nonce: number;
  value?: bigint;
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
  value?: bigint;
  receiver: Address;
  sender: Address;
  gasPrice?: number;
  gasLimit: number;
  esdts?: { id: string; nonce?: number; amount: bigint }[];
  chainId: string;
  version?: number;
};

export type CallContractTxParams = {
  nonce: number;
  value?: bigint;
  callee: Address;
  sender: Address;
  gasPrice?: number;
  gasLimit: number;
  functionName: string;
  functionArgs?: Hex[];
  esdts?: { id: string; nonce?: number; amount: bigint }[];
  chainId: string;
  version?: number;
};

type GetTxOptions = { withResults?: boolean };
