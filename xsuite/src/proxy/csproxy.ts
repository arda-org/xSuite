import { BroadTx, Proxy, ProxyParams, unrawTxRes } from './proxy';
import { e, eCodeMetadata, EncodableAccount } from '../data/encoding';
import { Kvs } from '../data/kvs';
import { addressLikeToBechAddress } from '../data/addressLike';

export class CSProxy extends Proxy {
  stopChainSimulator: () => void;
  autoGenerateBlocks: boolean;
  verbose: boolean;

  constructor(baseUrl: ProxyParams, stopChainSimulator: () => void, autoGenerateBlocks: boolean = true, verbose: boolean = false) {
    super(baseUrl);

    this.stopChainSimulator = stopChainSimulator;
    this.autoGenerateBlocks = autoGenerateBlocks;
    this.verbose = verbose;
  }

  async setAccount(account: EncodableAccount) {
    const [previousAccount, previousKvs] = await Promise.all([
      this.getAccount(account.address),
      this.getAccountKvs(account.address),
    ]);
    const newAccount = accountToRawAccount(account, previousAccount as any, previousKvs as Kvs);

    if (this.verbose) {
      console.log('Setting account', newAccount);
    }

    const result = this.fetch(
      `/simulator/set-state`,
      [newAccount],
    );

    if (this.autoGenerateBlocks) {
      await result;

      await this.generateBlocks();
    }

    return result;
  }

  async sendTx(tx: BroadTx) {
    if (this.verbose) {
      console.log('Sending transaction', tx);
    }

    const result = super.sendTx(tx);

    if (this.autoGenerateBlocks) {
      await result;

      await this.generateBlocks();
    }

    return result;
  }

  async getCompletedTxRaw(txHash: string) {
    let res = await this.getTxProcessStatusRaw(txHash);

    let retries = 0;

    while (!res || res.code !== 'successful' || res.data.status === 'pending') {
      // We need delay since cross shard changes might not have been processed immediately
      await new Promise((r) => setTimeout(r, 250));

      if (res && res.data && res.data.status === 'pending') {
        await this.generateBlocks();
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
    if (this.verbose) {
      console.log('Get completed tx', txHash);
    }

    return super.getCompletedTx(txHash);
  }

  generateBlocks(numBlocks: number = 1) {
    return this.fetch(`/simulator/generate-blocks/${numBlocks}`, {});
  }

  getInitialWallets() {
    return this.fetch(`/simulator/initial-wallets`);
  }

  terminate() {
    this.stopChainSimulator();
  }
}

const accountToRawAccount = (account: EncodableAccount, previousAccount: {
  address: string;
  nonce: number;
  balance: bigint;
  code: string | null;
  codeMetadata: string | null;
  owner: string | null;
}, previousKvs: Kvs) => {
  const rawAccount: any = {
    address: addressLikeToBechAddress(account.address),
    nonce: account.nonce,
    balance: account.balance?.toString() || '0',
    keys: account.kvs != null ? e.kvs(account.kvs) : undefined,
    code: account.code,
    codeMetadata:
      account.codeMetadata != null
        ? eCodeMetadata(account.codeMetadata)
        : undefined,
    ownerAddress: account.owner != null ? addressLikeToBechAddress(account.owner) : undefined,
    developerReward: '0',
  };

  if (rawAccount.keys !== undefined && Object.keys(previousKvs).length) {
    for (const key in previousKvs) {
      if (!(key in rawAccount.keys)) {
        rawAccount.keys[key] = '';
      }
    }
  }

  Object.keys(rawAccount).forEach(key => rawAccount[key] === undefined ? delete rawAccount[key] : {});

  // Preserve properties which need to have default values on initial account creation
  if (previousAccount.code && rawAccount.code === '00') {
    rawAccount.code = previousAccount.code;
  }
  if (previousAccount.balance > 0n && !account.balance?.toString()) {
    rawAccount.balance = previousAccount.balance.toString();
  }

  return {
    ...previousAccount,
    ...rawAccount,
  };
};
