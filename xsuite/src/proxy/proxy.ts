import { e } from "../data";
import { zeroBechAddress } from "../data/address";
import {
  AddressLike,
  addressLikeToBech,
  addressLikeToHex,
} from "../data/addressLike";
import { BytesLike, bytesLikeToHex } from "../data/bytesLike";
import {
  devnetMvxExplorerUrl,
  devnetMvxProxyUrl,
  mainnetMvxExplorerUrl,
  mainnetMvxProxyUrl,
  testnetMvxExplorerUrl,
  testnetMvxProxyUrl,
} from "../data/constants";
import {
  Encodable,
  EncodableCodeMetadata,
  eCodeMetadata,
} from "../data/encoding";
import { Kvs } from "../data/kvs";
import { base64ToHex, u8aToHex } from "../data/utils";
import { Optional, Prettify } from "../helpers";

export class Proxy {
  proxyUrl: string;
  explorerUrl: string;
  headers: HeadersInit;
  fetcher?: Fetcher;
  blockNonce?: number;
  pauseAfterSend?: number; // TODO-MvX: remove this when blockchain fixed

  constructor(params: ProxyNewParamsExtended) {
    params = typeof params === "string" ? { proxyUrl: params } : params;
    this.proxyUrl = params.proxyUrl;
    this.explorerUrl = params.explorerUrl ?? "";
    this.headers = params.headers ?? {};
    this.fetcher = params.fetcher;
    this.blockNonce = params.blockNonce;
    this.pauseAfterSend = params.pauseAfterSend;
  }

  static new(params: ProxyNewParamsExtended) {
    return new Proxy(params);
  }

  static newDevnet(params: ProxyNewRealnetParams = {}) {
    return this.new({
      proxyUrl: devnetMvxProxyUrl,
      explorerUrl: devnetMvxExplorerUrl,
      ...params,
    });
  }

  static newTestnet(params: ProxyNewRealnetParams = {}) {
    return this.new({
      proxyUrl: testnetMvxProxyUrl,
      explorerUrl: testnetMvxExplorerUrl,
      ...params,
    });
  }

  static newMainnet(params: ProxyNewRealnetParams = {}) {
    return this.new({
      proxyUrl: mainnetMvxProxyUrl,
      explorerUrl: mainnetMvxExplorerUrl,
      ...params,
    });
  }

  fetchRaw(path: string, data?: any) {
    const init: RequestInit = { headers: this.headers };
    if (data !== undefined) {
      init.method = "POST";
      init.body = JSON.stringify(data);
    }
    return (this.fetcher ?? fetch)(
      this.proxyUrl + makePath(path, { blockNonce: this.blockNonce }),
      init,
    ).then((r) => r.json());
  }

  async fetch(path: string, data?: any) {
    const res = await this.fetchRaw(path, data);
    if (res.code === "successful") {
      return res.data;
    } else {
      const resStr = JSON.stringify(res, null, 2);
      throw new Error(`Unsuccessful proxy request. Response: ${resStr}`);
    }
  }

  async sendTxs(txs: BroadTx[]) {
    const rawTxs: RawTx[] = [];
    for (const tx of txs) {
      rawTxs.push(await broadTxToRawTx(tx));
    }
    const res = await this.fetch("/transaction/send-multiple", rawTxs);
    const txsHashesSent = getValuesInOrder(res.txsHashes) as string[];
    if (txsHashesSent.length !== rawTxs.length) {
      throw new Error(
        `Only ${txsHashesSent.length} of ${rawTxs.length} transactions were sent. The other ones were invalid.`,
      );
    }
    // TODO-MvX: remove this when blockchain fixed
    if (this.pauseAfterSend) {
      await new Promise((r) => setTimeout(r, this.pauseAfterSend));
    }
    return txsHashesSent;
  }

  async sendTx(tx: BroadTx) {
    const res = await this.fetch("/transaction/send", await broadTxToRawTx(tx));
    // TODO-MvX: remove this when blockchain fixed
    if (this.pauseAfterSend) {
      await new Promise((r) => setTimeout(r, this.pauseAfterSend));
    }
    return res.txHash as string;
  }

  sendTransfers(txs: TransferTx[]) {
    return this.sendTxs(txs.map(transferTxToTx));
  }

  sendTransfer(tx: TransferTx) {
    return this.sendTx(transferTxToTx(tx));
  }

  sendDeployContracts(txs: DeployContractTx[]) {
    return this.sendTxs(txs.map(deployContractTxToTx));
  }

  sendDeployContract(tx: DeployContractTx) {
    return this.sendTx(deployContractTxToTx(tx));
  }

  sendCallContracts(txs: CallContractTx[]) {
    return this.sendTxs(txs.map(callContractTxToTx));
  }

  sendCallContract(tx: CallContractTx) {
    return this.sendTx(callContractTxToTx(tx));
  }

  sendUpgradeContracts(txs: UpgradeContractTx[]) {
    return this.sendTxs(txs.map(upgradeContractTxToTx));
  }

  sendUpgradeContract(tx: UpgradeContractTx) {
    return this.sendTx(upgradeContractTxToTx(tx));
  }

  async awaitTx(txHash: string) {
    let res = await this.getTxProcessStatus(txHash);
    while (res === "pending") {
      await new Promise((r) => setTimeout(r, 1000));
      res = await this.getTxProcessStatus(txHash);
    }
  }

  async awaitTxs(txHashes: string[]) {
    for (const txHash of txHashes) {
      await this.awaitTx(txHash);
    }
  }

  async resolveTx(txHash: string): Promise<TxResult> {
    if ((await this.getTxProcessStatus(txHash)) === "pending") {
      throw new Error(pendingErrorMessage);
    }
    let tx = await this.getTx(txHash);
    const hash: string = tx.hash;
    const explorerUrl = `${this.explorerUrl}/transactions/${hash}`;
    tx = { explorerUrl, hash, ...tx };
    if (tx.executionReceipt?.returnCode) {
      const { returnCode, returnMessage } = tx.executionReceipt;
      throw new TxError(returnCode, returnMessage, tx);
    }
    throwIfErrorInTxEvents(tx);
    const scrs = tx?.smartContractResults;
    if (scrs) {
      for (const scr of scrs) {
        if (scr.returnMessage) {
          throw new TxError("returnMessage", scr.returnMessage, tx);
        }
      }
      for (const scr of scrs) {
        throwIfErrorInTxEvents(scr);
      }
    }
    if (tx.status !== "success") {
      throw new TxError("errorStatus", tx.status, tx);
    }
    const gasUsed: number = tx.gasUsed;
    const fee: bigint = BigInt(tx.fee);
    return { explorerUrl, hash, gasUsed, fee, tx };
  }

  resolveTxs(txHashes: string[]) {
    return Promise.all(txHashes.map((h) => this.resolveTx(h)));
  }

  resolveTransfer(txHash: string) {
    return this.resolveTx(txHash);
  }

  resolveTransfers(txHashes: string[]) {
    return this.resolveTxs(txHashes);
  }

  async resolveDeployContract(txHash: string): Promise<DeployContractResult> {
    const res = await this.resolveTx(txHash);
    const returnData = getTxReturnData(res.tx);
    const address = res.tx.logs.events.find(
      (e: any) => e.identifier === "SCDeploy",
    )!.address;
    return { ...res, returnData, address };
  }

  resolveDeployContracts(txHashes: string[]) {
    return Promise.all(txHashes.map((h) => this.resolveDeployContract(h)));
  }

  async resolveCallContract(txHash: string): Promise<CallContractResult> {
    const res = await this.resolveTx(txHash);
    const returnData = getTxReturnData(res.tx);
    return { ...res, returnData };
  }

  resolveCallContracts(txHashes: string[]) {
    return Promise.all(txHashes.map((h) => this.resolveCallContract(h)));
  }

  resolveUpgradeContract(txHash: string) {
    return this.resolveCallContract(txHash);
  }

  resolveUpgradeContracts(txHashes: string[]) {
    return this.resolveCallContracts(txHashes);
  }

  async executeTxs(txs: BroadTx[]) {
    const txHashes = await this.sendTxs(txs);
    await this.awaitTxs(txHashes);
    return this.resolveTxs(txHashes);
  }

  async executeTx(tx: BroadTx) {
    const txHash = await this.sendTx(tx);
    await this.awaitTx(txHash);
    return this.resolveTx(txHash);
  }

  async doTransfers(txs: TransferTx[]) {
    const txHashs = await this.sendTransfers(txs);
    await this.awaitTxs(txHashs);
    return this.resolveTransfers(txHashs);
  }

  async transfer(tx: TransferTx) {
    const txHash = await this.sendTransfer(tx);
    await this.awaitTx(txHash);
    return this.resolveTransfer(txHash);
  }

  async deployContracts(txs: DeployContractTx[]) {
    const txHashes = await this.sendDeployContracts(txs);
    await this.awaitTxs(txHashes);
    return this.resolveDeployContracts(txHashes);
  }

  async deployContract(tx: DeployContractTx) {
    const txHash = await this.sendDeployContract(tx);
    await this.awaitTx(txHash);
    return this.resolveDeployContract(txHash);
  }

  async callContracts(txs: CallContractTx[]) {
    const txHashes = await this.sendCallContracts(txs);
    await this.awaitTxs(txHashes);
    return this.resolveCallContracts(txHashes);
  }

  async callContract(tx: CallContractTx) {
    const txHash = await this.sendCallContract(tx);
    await this.awaitTx(txHash);
    return this.resolveCallContract(txHash);
  }

  async upgradeContracts(txs: UpgradeContractTx[]) {
    const txHashes = await this.sendUpgradeContracts(txs);
    await this.awaitTxs(txHashes);
    return this.resolveUpgradeContracts(txHashes);
  }

  async upgradeContract(tx: UpgradeContractTx) {
    const txHash = await this.sendUpgradeContract(tx);
    await this.awaitTx(txHash);
    return this.resolveUpgradeContract(txHash);
  }

  async query(query: BroadQuery): Promise<QueryResult> {
    const { data } = await this.fetch(
      "/vm-values/query",
      broadQueryToRawQuery(query),
    );
    if (![0, "ok"].includes(data.returnCode)) {
      throw new QueryError(data.returnCode, data.returnMessage, data);
    }
    return {
      returnData: data.returnData.map(base64ToHex),
      query: data,
    };
  }

  async getNetworkStatus(shard: number): Promise<NetworkStatus> {
    const { status } = await this.fetch(`/network/status/${shard}`);
    return {
      blockTimestamp: status.erd_block_timestamp,
      crossCheckBlockHeight: status.erd_cross_check_block_height,
      round: status.erd_current_round,
      epoch: status.erd_epoch_number,
      highestFinalNonce: status.erd_highest_final_nonce,
      nonce: status.erd_nonce,
      nonceAtEpochStart: status.erd_nonce_at_epoch_start,
      noncesPassedInCurrentEpoch: status.erd_nonces_passed_in_current_epoch,
      roundAtEpochStart: status.erd_round_at_epoch_start,
      roundsPassedInCurrentEpoch: status.erd_rounds_passed_in_current_epoch,
      roundsPerEpoch: status.erd_rounds_per_epoch,
    };
  }

  getTx(txHash: string) {
    return this._getTx(txHash, { withResults: true });
  }

  getTxWithoutResults(txHash: string) {
    return this._getTx(txHash);
  }

  private async _getTx(txHash: string, { withResults }: GetTxRawOptions = {}) {
    const res = await this.fetch(
      makePath(`/transaction/${txHash}`, { withResults }),
    );
    return res.transaction as Record<string, any>;
  }

  async getTxProcessStatus(txHash: string) {
    const res = await this.fetch(`/transaction/${txHash}/process-status`);
    return res.status as string;
  }

  async getAccountNonce(address: AddressLike) {
    const res = await this.fetch(
      `/address/${addressLikeToBech(address)}/nonce`,
    );
    return res.nonce as number;
  }

  async getAccountBalance(address: AddressLike) {
    const res = await this.fetch(
      `/address/${addressLikeToBech(address)}/balance`,
    );
    return BigInt(res.balance);
  }

  async getAccountValue(address: AddressLike, key: BytesLike): Promise<string> {
    const res = await this.fetch(
      `/address/${addressLikeToBech(address)}/key/${bytesLikeToHex(key)}`,
    );
    return res.value;
  }

  async getAccountKvs(address: AddressLike) {
    const res = await this.fetch(`/address/${addressLikeToBech(address)}/keys`);
    return res.pairs as Kvs;
  }

  getSerializableAccountWithoutKvs(address: AddressLike) {
    return this._getSerializableAccount(address);
  }

  getSerializableAccount(address: AddressLike) {
    return this._getSerializableAccount(address, { withKeys: true });
  }

  private async _getSerializableAccount(
    address: AddressLike,
    { withKeys }: GetAccountRawOptions = {},
  ) {
    const res = await this.fetch(
      makePath(`/address/${addressLikeToBech(address)}`, { withKeys }),
    );
    return getSerializableAccount(res.account);
  }

  getAccountWithoutKvs(address: AddressLike) {
    return this._getAccount(address);
  }

  getAccount(address: AddressLike) {
    return this._getAccount(address, { withKeys: true });
  }

  private async _getAccount(
    address: AddressLike,
    options?: GetAccountRawOptions,
  ) {
    const { balance, ...account } = await this._getSerializableAccount(
      address,
      options,
    );
    return { balance: BigInt(balance), ...account };
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

const throwIfErrorInTxEvents = (tx: any) => {
  const events = tx?.logs?.events;
  if (events) {
    for (const event of events) {
      if (event.identifier === "signalError") {
        const error = atob(event.topics[1]);
        throw new TxError("signalError", error, tx);
      }
    }
    for (const event of events) {
      if (event.identifier === "internalVMErrors") {
        const error = atob(event.data);
        throw new TxError("internalVMErrors", error, tx);
      }
    }
  }
};

const makePath = (
  path: string,
  params: Record<string, { toString: () => string } | undefined> = {},
) => {
  if (!path.startsWith("/")) {
    throw new Error("Invalid path.");
  }
  const [basePath, existingQuery] = path.split("?");
  const searchParams = new URLSearchParams(existingQuery);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) {
      searchParams.append(k, v.toString());
    }
  }
  const newQuery = searchParams.toString();
  return newQuery ? `${basePath}?${newQuery}` : basePath;
};

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

const transferTxToTx = ({
  receiver: _receiver,
  sender,
  esdts,
  ...tx
}: TransferTx): Tx => {
  let receiver: AddressLike;
  let data: string | undefined;
  if (esdts?.length) {
    receiver = sender;
    const dataParts: string[] = [];
    dataParts.push("MultiESDTNFTTransfer");
    dataParts.push(addressLikeToHex(_receiver));
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
  return { receiver, sender, data, ...tx };
};

const deployContractTxToTx = ({
  code,
  codeMetadata,
  codeArgs,
  ...tx
}: DeployContractTx): Tx => {
  return {
    receiver: zeroBechAddress,
    data: [
      code,
      "0500",
      eCodeMetadata(codeMetadata),
      ...e.vs(codeArgs ?? []),
    ].join("@"),
    ...tx,
  };
};

const callContractTxToTx = ({
  callee,
  sender,
  funcName,
  funcArgs,
  esdts,
  ...tx
}: CallContractTx): Tx => {
  const dataParts: string[] = [];
  let receiver: AddressLike;
  if (esdts?.length) {
    receiver = sender;
    dataParts.push("MultiESDTNFTTransfer");
    dataParts.push(addressLikeToHex(callee));
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
    ...tx,
  };
};

const upgradeContractTxToTx = ({
  callee,
  code,
  codeMetadata,
  codeArgs,
  ...tx
}: UpgradeContractTx): Tx => {
  return {
    receiver: callee,
    data: [
      "upgradeContract",
      code,
      eCodeMetadata(codeMetadata),
      ...e.vs(codeArgs ?? []),
    ].join("@"),
    ...tx,
  };
};

const broadTxToRawTx = async (tx: BroadTx): Promise<RawTx> => {
  if (isRawTx(tx)) {
    return tx;
  }
  const unsignedRawTx = {
    nonce: tx.nonce,
    value: (tx.value ?? 0n).toString(),
    receiver: addressLikeToBech(tx.receiver),
    sender: addressLikeToBech(tx.sender),
    gasPrice: tx.gasPrice,
    gasLimit: tx.gasLimit,
    data: tx.data === undefined ? undefined : btoa(tx.data),
    chainID: tx.chainId,
    version: tx.version ?? 1,
  };
  const signature = await tx.sender
    .sign(new TextEncoder().encode(JSON.stringify(unsignedRawTx)))
    .then(u8aToHex);
  return { ...unsignedRawTx, signature };
};

const isRawTx = (tx: BroadTx): tx is RawTx => typeof tx.sender === "string";

const broadQueryToRawQuery = (query: BroadQuery): RawQuery => {
  if ("callee" in query) {
    query = {
      scAddress: addressLikeToBech(query.callee),
      funcName: query.funcName,
      args: e.vs(query.funcArgs ?? []),
      caller:
        query.sender !== undefined
          ? addressLikeToBech(query.sender)
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

const getTxReturnData = (tx: any): string[] => {
  const returnData: string[] = [];
  const scrs = tx?.smartContractResults;
  const writeLogEvent = tx?.logs?.events.find(
    (e: any) => e.identifier === "writeLog",
  );
  if (writeLogEvent) {
    const scrReturnData = atob(writeLogEvent.data).split("@").slice(2);
    returnData.push(...scrReturnData);
  }
  if (scrs) {
    for (const scr of scrs) {
      if (scr.data === "@6f6b" || scr.data?.startsWith("@6f6b@")) {
        const scrReturnData = scr.data.split("@").slice(2);
        if (scr.prevTxHash !== scr.originalTxHash) {
          returnData.push(...scrReturnData);
        } else {
          returnData.unshift(...scrReturnData);
        }
      }
      const writeLogEvent = scr?.logs?.events.find(
        (e: any) => e.identifier === "writeLog",
      );
      if (writeLogEvent) {
        const scrReturnData = atob(writeLogEvent.data).split("@").slice(2);
        returnData.push(...scrReturnData);
      }
    }
  }
  return returnData;
};

export const getValuesInOrder = <T>(o: Record<string, T>) => {
  const values: T[] = [];
  for (let i = 0; i < Object.keys(o).length; i++) {
    values.push(o[i]);
  }
  return values;
};

export const pendingErrorMessage = "Transaction still pending.";

type ProxyNewParamsExtended = string | ProxyNewParams;

export type ProxyNewParams = {
  proxyUrl: string;
  explorerUrl?: string;
  headers?: HeadersInit;
  fetcher?: Fetcher;
  blockNonce?: number;
  pauseAfterSend?: number; // TODO-MvX: remove this when blockchain fixed } & ProxyNewRealnetParams
};

export type ProxyNewRealnetParams = Prettify<
  Optional<ProxyNewParams, "proxyUrl">
>;

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type BroadTx = Tx | RawTx;

export type Tx = {
  nonce: number;
  value?: number | bigint;
  receiver: AddressLike;
  sender: Signer;
  gasPrice: number;
  gasLimit: number;
  data?: string;
  chainId: string;
  version?: number;
};

export type TransferTx = {
  nonce: number;
  value?: number | bigint;
  receiver: AddressLike;
  sender: Signer;
  gasPrice: number;
  gasLimit: number;
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

export type DeployContractTx = {
  nonce: number;
  value?: number | bigint;
  sender: Signer;
  gasPrice: number;
  gasLimit: number;
  code: string;
  codeMetadata: EncodableCodeMetadata;
  codeArgs?: BytesLike[];
  chainId: string;
  version?: number;
};

export type CallContractTx = {
  nonce: number;
  value?: number | bigint;
  callee: AddressLike;
  sender: Signer;
  gasPrice: number;
  gasLimit: number;
  funcName: string;
  funcArgs?: BytesLike[];
  esdts?: { id: string; nonce?: number; amount: number | bigint }[];
  chainId: string;
  version?: number;
};

export type UpgradeContractTx = {
  nonce: number;
  value?: number | bigint;
  callee: AddressLike;
  sender: Signer;
  gasPrice: number;
  gasLimit: number;
  code: string;
  codeMetadata: EncodableCodeMetadata;
  codeArgs?: BytesLike[];
  chainId: string;
  version?: number;
};

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

type Signer = Encodable & { sign: (data: Uint8Array) => Promise<Uint8Array> };

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

type GetTxRawOptions = { withResults?: boolean };

type GetAccountRawOptions = { withKeys?: boolean };

type TxResult = Prettify<{
  hash: string;
  explorerUrl: string;
  gasUsed: number;
  fee: bigint;
  tx: { [x: string]: any };
}>;

type DeployContractResult = Prettify<
  TxResult & {
    returnData: string[];
    address: string;
  }
>;

type CallContractResult = Prettify<TxResult & { returnData: string[] }>;

type QueryResult = {
  returnData: string[];
  query: { [x: string]: any };
};

type NetworkStatus = {
  blockTimestamp: number;
  crossCheckBlockHeight: string;
  round: number;
  epoch: number;
  highestFinalNonce: number;
  nonce: number;
  nonceAtEpochStart: number;
  noncesPassedInCurrentEpoch: number;
  roundAtEpochStart: number;
  roundsPassedInCurrentEpoch: number;
  roundsPerEpoch: number;
};
