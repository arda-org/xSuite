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

  constructor(params: ProxyNewParamsExtended) {
    params = typeof params === "string" ? { proxyUrl: params } : params;
    this.proxyUrl = params.proxyUrl;
    this.explorerUrl = params.explorerUrl ?? "";
    this.headers = params.headers ?? {};
    this.fetcher = params.fetcher;
    this.blockNonce = params.blockNonce;
  }

  static new(params: ProxyNewParamsExtended) {
    return new this(params);
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
    return txsHashesSent;
  }

  async sendTx(tx: BroadTx) {
    const res = await this.fetch("/transaction/send", await broadTxToRawTx(tx));
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

  async resolveTxResult(txHash: string): Promise<TxResult> {
    let elapsedBlocks = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const txDataStartTime = Date.now();
      let txData: TxData | undefined;
      try {
        txData = await this.getTxData(txHash);
      } catch (e) {
        if (elapsedBlocks >= 1) {
          throw e;
        }
      }
      if (txData) {
        const hash: string = txData.hash;
        const explorerUrl = `${this.explorerUrl}/transactions/${hash}`;
        txData = { explorerUrl, hash, ...txData };
        const error = findErrorInTxData(txData);
        if (error) {
          return {
            type: "fail",
            errorCode: error.code,
            errorMessage: error.message,
            tx: txData,
          };
        }
        const success = findSuccessInTxData(txData);
        if (success) {
          const gasUsed: number = txData.gasUsed;
          const fee: bigint = BigInt(txData.fee);
          return {
            type: "success",
            explorerUrl,
            hash,
            gasUsed,
            fee,
            tx: txData,
          };
        }
      }
      elapsedBlocks += await this.beforeNextTxData(txDataStartTime);
    }
  }

  async beforeNextTxData(lastTxDataStartTime: number) {
    const blocks = 1 / 6;
    const duration = lastTxDataStartTime + 6_000 * blocks - Date.now();
    if (duration > 0) await new Promise((r) => setTimeout(r, duration));
    return blocks;
  }

  async resolveTxResults(txHashes: string[]): Promise<TxResult[]> {
    const txResults: TxResult[] = [];
    for (const txHash of txHashes) {
      txResults.push(await this.resolveTxResult(txHash));
    }
    return txResults;
  }

  async resolveTx(txHash: string): Promise<TxSuccessResult> {
    return assertTxSuccess(await this.resolveTxResult(txHash));
  }

  async resolveTxs(txHashes: string[]) {
    return (await this.resolveTxResults(txHashes)).map(assertTxSuccess);
  }

  resolveTransfer(txHash: string) {
    return this.resolveTx(txHash);
  }

  resolveTransfers(txHashes: string[]) {
    return this.resolveTxs(txHashes);
  }

  async resolveDeployContract(
    txHash: string,
  ): Promise<DeployContractSuccessResult> {
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

  async resolveCallContract(
    txHash: string,
  ): Promise<CallContractSuccessResult> {
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
    return this.resolveTxs(txHashes);
  }

  async executeTx(tx: BroadTx) {
    const txHash = await this.sendTx(tx);
    return this.resolveTx(txHash);
  }

  async doTransfers(txs: TransferTx[]) {
    const txHashes = await this.sendTransfers(txs);
    return this.resolveTransfers(txHashes);
  }

  async transfer(tx: TransferTx) {
    const txHash = await this.sendTransfer(tx);
    return this.resolveTransfer(txHash);
  }

  async deployContracts(txs: DeployContractTx[]) {
    const txHashes = await this.sendDeployContracts(txs);
    return this.resolveDeployContracts(txHashes);
  }

  async deployContract(tx: DeployContractTx) {
    const txHash = await this.sendDeployContract(tx);
    return this.resolveDeployContract(txHash);
  }

  async callContracts(txs: CallContractTx[]) {
    const txHashes = await this.sendCallContracts(txs);
    return this.resolveCallContracts(txHashes);
  }

  async callContract(tx: CallContractTx) {
    const txHash = await this.sendCallContract(tx);
    return this.resolveCallContract(txHash);
  }

  async upgradeContracts(txs: UpgradeContractTx[]) {
    const txHashes = await this.sendUpgradeContracts(txs);
    return this.resolveUpgradeContracts(txHashes);
  }

  async upgradeContract(tx: UpgradeContractTx) {
    const txHash = await this.sendUpgradeContract(tx);
    return this.resolveUpgradeContract(txHash);
  }

  async query(query: BroadQuery): Promise<QuerySuccessResult> {
    const data = await this._getQueryData(query);
    if (![0, "ok"].includes(data.returnCode)) {
      throw new QueryError(data.returnCode, data.returnMessage, data);
    }
    return {
      returnData: data.returnData.map(base64ToHex),
      query: data,
    };
  }

  private async _getQueryData(query: BroadQuery) {
    const res = await this.fetch(
      "/vm-values/query",
      broadQueryToRawQuery(query),
    );
    return res.data as QueryData;
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

  getTxData(txHash: string) {
    return this._getTxData(txHash, { withResults: true });
  }

  getTxDataWithoutResults(txHash: string) {
    return this._getTxData(txHash);
  }

  private async _getTxData(
    txHash: string,
    { withResults }: GetTxRawOptions = {},
  ) {
    const res = await this.fetch(
      makePath(`/transaction/${txHash}`, { withResults }),
    );
    return res.transaction as TxData;
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

  async getAccountUsername(address: AddressLike) {
    const res = await this.fetch(
      `/address/${addressLikeToBech(address)}/username`,
    );
    return res.username as string;
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

  /**
   * @deprecated Use `.getTxData` instead.
   */
  getTx(txHash: string) {
    return this.getTxData(txHash);
  }

  /**
   * @deprecated Use `.getTxDataWithoutResults` instead.
   */
  getTxWithoutResults(txHash: string) {
    return this.getTxDataWithoutResults(txHash);
  }
}

const findErrorInTxData = (txData: any): TxErrorDetails | undefined => {
  if (txData.executionReceipt?.returnCode) {
    const { returnCode, returnMessage } = txData.executionReceipt;
    return { code: returnCode, message: returnMessage };
  }
  const events = txData.logs?.events;
  if (events) {
    for (const event of events) {
      if (event.identifier === "signalError") {
        const data = atob(event.topics[1]);
        return { code: "signalError", message: data };
      }
    }
    for (const event of events) {
      if (event.identifier === "internalVMErrors") {
        const data = atob(event.data);
        return { code: "internalVMErrors", message: data };
      }
    }
  }
  const scrs = txData.smartContractResults;
  if (scrs) {
    for (const scr of scrs) {
      if (scr.returnMessage) {
        return { code: "returnMessage", message: scr.returnMessage };
      }
    }
    for (const scr of scrs) {
      const error = findErrorInTxData(scr);
      if (error) return error;
    }
  }
  if (
    txData.status &&
    txData.status !== "success" &&
    txData.status !== "pending"
  ) {
    return { code: txData.status, message: txData.receipt?.data ?? "" };
  }
};

const findSuccessInTxData = (txData: any): true | undefined => {
  if (
    txData.status === "success" &&
    !txData.logs &&
    !txData.smartContractResults
  ) {
    return true;
  }
  const events = txData.logs?.events;
  if (events) {
    for (const event of events) {
      if (
        event.identifier === "completedTxEvent" ||
        event.identifier === "SCDeploy"
      ) {
        return true;
      }
    }
  }
  const scrs = txData.smartContractResults;
  if (scrs) {
    for (const scr of scrs) {
      const success = findSuccessInTxData(scr);
      if (success) return success;
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
  data: any;

  constructor(
    interaction: string,
    code: number | string,
    message: string,
    data: any,
  ) {
    super(
      `${interaction} failed: ${code} - ${message} - Result:\n` +
        JSON.stringify(data, null, 2),
    );
    this.interaction = interaction;
    this.code = code;
    this.msg = message;
    this.data = data;
  }
}

class TxError extends InteractionError {
  constructor(code: number | string, message: string, data: any) {
    super("Transaction", code, message, data);
  }
}

class QueryError extends InteractionError {
  constructor(code: number | string, message: string, data: any) {
    super("Query", code, message, data);
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

const assertTxSuccess = (txResult: TxResult): TxSuccessResult => {
  if (txResult.type === "fail") {
    throw new TxError(txResult.errorCode, txResult.errorMessage, txResult.tx);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, ...txSuccessResult } = txResult;
  return txSuccessResult;
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

type ProxyNewParamsExtended = string | ProxyNewParams;

export type ProxyNewParams = {
  proxyUrl: string;
  explorerUrl?: string;
  headers?: HeadersInit;
  fetcher?: Fetcher;
  blockNonce?: number;
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

type TxData = Record<string, any>;

type TxResult = Prettify<
  ({ type: "success" } & TxSuccessResult) | ({ type: "fail" } & TxErrorResult)
>;

type TxErrorDetails = { code: string; message: string };

type TxSuccessResult = Prettify<{
  hash: string;
  explorerUrl: string;
  gasUsed: number;
  fee: bigint;
  tx: TxData;
}>;

type TxErrorResult = Prettify<{
  errorCode: number | string;
  errorMessage: string;
  tx: TxData;
}>;

type DeployContractSuccessResult = Prettify<
  TxSuccessResult & {
    returnData: string[];
    address: string;
  }
>;

type CallContractSuccessResult = Prettify<
  TxSuccessResult & { returnData: string[] }
>;

type QueryData = Record<string, any>;

type QuerySuccessResult = Prettify<{
  returnData: string[];
  query: QueryData;
}>;

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
