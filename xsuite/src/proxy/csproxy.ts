import { AddressLike, addressLikeToBechAddress } from "../data/addressLike";
import { e, eCodeMetadata, EncodableAccount } from "../data/encoding";
import { Kvs } from "../data/kvs";
import { base64ToHex } from "../data/utils";
import { BroadTx, Proxy, unrawRes } from "./proxy";

export class CSProxy extends Proxy {
  autoGenerateBlocks: boolean;

  constructor(params: CSProxyParams) {
    super(params);

    this.autoGenerateBlocks = params.autoGenerateBlocks;
    this.txCompletionPauseMs = params.txCompletionPauseMs ?? 250;
  }

  async setAccount(account: EncodableAccount) {
    const newAccount = accountToRawAccount(account);

    const result = this.fetch("/simulator/set-state-overwrite", [newAccount]);

    if (this.autoGenerateBlocks) {
      await result;

      await this.generateBlock();
    }

    return result;
  }

  async sendTx(tx: BroadTx) {
    const result = super.sendTx(tx);

    if (this.autoGenerateBlocks) {
      await result;

      await new Promise((r) => setTimeout(r, this.txCompletionPauseMs));

      await this.generateBlock();
    }

    return result;
  }

  async getCompletedTxRaw(txHash: string) {
    let res = await this.getTxProcessStatusRaw(txHash);

    let retries = 0;

    while (!res || res.code !== "successful" || res.data.status === "pending") {
      // We need delay since cross shard changes might not have been processed immediately
      await new Promise((r) => setTimeout(r, this.txCompletionPauseMs));

      if (res && res.data && res.data.status === "pending") {
        await this.generateBlock();
      }

      res = await this.getTxProcessStatusRaw(txHash);

      retries++;

      // Prevent too many retries in case something does not work as expected
      if (retries > 10) {
        throw new Error(`Transaction ${txHash} could not be completed`);
      }
    }

    return await this.getTxRaw(txHash, { withResults: true });
  }

  generateBlocks(numBlocks: number) {
    return this.fetch(`/simulator/generate-blocks/${numBlocks}`, {});
  }

  generateBlock() {
    return this.generateBlocks(1);
  }

  generateBlocksUntilEpochReached(epoch: number) {
    return this.fetch(
      `/simulator/generate-blocks-until-epoch-reached/${epoch}`,
      {},
    );
  }

  getInitialWallets() {
    return this.fetch("/simulator/initial-wallets");
  }

  getAccountRaw(address: AddressLike, shardId: number | undefined = undefined) {
    return this.fetchRaw(
      `/address/${addressLikeToBechAddress(address)}` +
        (shardId !== undefined ? `?forced-shard-id=${shardId}` : ""),
    );
  }

  async getSerializableAccount(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    const res = unrawRes(await this.getAccountRaw(address, shardId));
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

  async getAccount(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    const { balance, ...account } = await this.getSerializableAccount(
      address,
      shardId,
    );
    return { balance: BigInt(balance), ...account };
  }

  getAccountNonceRaw(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    return this.fetchRaw(
      `/address/${addressLikeToBechAddress(address)}/nonce` +
        (shardId !== undefined ? `?forced-shard-id=${shardId}` : ""),
    );
  }

  async getAccountNonce(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    const res = unrawRes(await this.getAccountNonceRaw(address, shardId));
    return res.nonce as number;
  }

  getAccountBalanceRaw(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    return this.fetchRaw(
      `/address/${addressLikeToBechAddress(address)}/balance` +
        (shardId !== undefined ? `?forced-shard-id=${shardId}` : ""),
    );
  }

  async getAccountBalance(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    const res = unrawRes(await this.getAccountBalanceRaw(address, shardId));
    return BigInt(res.balance);
  }

  getAccountKvsRaw(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    return this.fetchRaw(
      `/address/${addressLikeToBechAddress(address)}/keys` +
        (shardId !== undefined ? `?forced-shard-id=${shardId}` : ""),
    );
  }

  async getAccountKvs(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    const res = unrawRes(await this.getAccountKvsRaw(address, shardId));
    return res.pairs as Kvs;
  }

  getSerializableAccountWithKvs(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    return Promise.all([
      this.getSerializableAccount(address, shardId),
      this.getAccountKvs(address, shardId),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }

  getAccountWithKvs(
    address: AddressLike,
    shardId: number | undefined = undefined,
  ) {
    return Promise.all([
      this.getAccount(address, shardId),
      this.getAccountKvs(address, shardId),
    ]).then(([account, kvs]) => ({ ...account, kvs }));
  }
}

const accountToRawAccount = (account: EncodableAccount) => {
  return {
    address: addressLikeToBechAddress(account.address),
    nonce: account.nonce,
    balance: account.balance?.toString() || "0",
    code: account.code,
    codeHash: account.codeHash ? eCodeMetadata(account.codeHash) : "",
    codeMetadata: account.codeMetadata
      ? Buffer.from(eCodeMetadata(account.codeMetadata), "hex").toString(
          "base64",
        )
      : "",
    keys: account.kvs ? e.kvs(account.kvs) : {},
    ownerAddress: account.owner ? addressLikeToBechAddress(account.owner) : "",
    developerReward: "0",
  };
};

export type CSProxyParams = {
  proxyUrl: string;
  explorerUrl?: string;
  autoGenerateBlocks: boolean;
  txCompletionPauseMs?: number;
};
