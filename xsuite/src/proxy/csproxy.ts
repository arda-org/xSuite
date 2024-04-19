import { addressLikeToBechAddress } from "../data/addressLike";
import { e, eCodeMetadata, EncodableAccount } from "../data/encoding";
import { Kvs } from "../data/kvs";
import { BroadTx, Proxy } from "./proxy";

export class CSProxy extends Proxy {
  autoGenerateBlocks: boolean;
  waitCompletedTimeout: number;

  constructor(params: CSProxyParams) {
    super(params);

    this.autoGenerateBlocks = params.autoGenerateBlocks;
    this.waitCompletedTimeout = params.waitCompletedTimeout ?? 250;
  }

  async setAccount(account: EncodableAccount) {
    const previousKvs = await this.getAccountKvs(account.address);
    const newAccount = accountToRawAccount(account, previousKvs);

    const result = this.fetch("/simulator/set-state", [newAccount]);

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

      await new Promise((r) => setTimeout(r, this.waitCompletedTimeout));

      await this.generateBlock();
    }

    return result;
  }

  async getCompletedTxRaw(txHash: string) {
    let res = await this.getTxProcessStatusRaw(txHash);

    let retries = 0;

    while (!res || res.code !== "successful" || res.data.status === "pending") {
      // We need delay since cross shard changes might not have been processed immediately
      await new Promise((r) => setTimeout(r, this.waitCompletedTimeout));

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

  async getCompletedTx(txHash: string) {
    return super.getCompletedTx(txHash);
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
}

const accountToRawAccount = (account: EncodableAccount, previousKvs: Kvs) => {
  const rawAccount: any = {
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

  // When setting state, chain simulator appends the keys to the previous ones instead of overwriting all,
  // hence we need to set an empty value for the previous keys that no longer exist
  if (Object.keys(previousKvs).length) {
    for (const key in previousKvs) {
      if (!(key in rawAccount.keys)) {
        rawAccount.keys[key] = "";
      }
    }
  }

  return rawAccount;
};

export type CSProxyParams = {
  proxyUrl: string;
  explorerUrl?: string;
  autoGenerateBlocks: boolean;
  waitCompletedTimeout?: number;
};
