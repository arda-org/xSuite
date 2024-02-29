import { addressToBech32 } from '../data/address';
import { kvsToRawKvs, RawKvs } from '../data/kvs';
import { BroadTx, codeMetadataToHex, Proxy, unrawTxRes } from './proxy';
import { Account } from './sproxy';

export class CSProxy extends Proxy {
  autoGenerateBlocks: boolean;
  verbose: boolean;

  constructor(baseUrl: string, autoGenerateBlocks: boolean = true, verbose: boolean = false) {
    super(baseUrl);

    this.autoGenerateBlocks = autoGenerateBlocks;
    this.verbose = verbose;
  }

  static async setAccount(baseUrl: string, account: Account, autoGenerateBlocks: boolean = true, verbose: boolean = false) {
    const [previousAccount, previousKvs] = await Promise.all([
      CSProxy.getAccount(baseUrl, account.address),
      CSProxy.getAccountKvs(baseUrl, account.address),
    ]);
    const newAccount = accountToRawAccount(account, previousAccount as any, previousKvs as RawKvs);

    if (verbose) {
      console.log('Setting account', newAccount);
    }

    const result = Proxy.fetch(
      `${baseUrl}/simulator/set-state`,
      [newAccount],
    );

    if (autoGenerateBlocks) {
      await result;

      await CSProxy.generateBlocks(baseUrl);
    }

    return result;
  }

  setAccount(account: Account) {
    return CSProxy.setAccount(this.baseUrl, account, this.autoGenerateBlocks, this.verbose);
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

  static async getCompletedTxRaw(baseUrl: string, txHash: string) {
    let res = await Proxy.getTxProcessStatusRaw(baseUrl, txHash);

    console.log('get completed tx', res);

    let retries = 0;

    while (!res || res.code !== 'successful' || res.data.status === 'pending') {
      await new Promise((r) => setTimeout(r, 250));

      if (res && res.data && res.data.status === 'pending') {
        await CSProxy.generateBlocks(baseUrl);
      }

      res = await CSProxy.getTxProcessStatusRaw(baseUrl, txHash);

      retries++;

      console.log('retry', retries);

      // Prevent too many retries in case something does not work as expected
      if (retries > 10) {
        break;
      }
    }

    return await Proxy.getTxRaw(baseUrl, txHash, { withResults: true });
  }

  static async getCompletedTx(baseUrl: string, txHash: string) {
    return unrawTxRes(await CSProxy.getCompletedTxRaw(baseUrl, txHash));
  }

  async getCompletedTx(txHash: string) {
    if (this.verbose) {
      console.log('Get completed tx', txHash);
    }

    return CSProxy.getCompletedTx(this.baseUrl, txHash);
  }

  static generateBlocks(baseUrl: string, numBlocks: number = 1) {
    return Proxy.fetch(`${baseUrl}/simulator/generate-blocks/${numBlocks}`, {});
  }

  generateBlocks(numBlocks: number = 1) {
    return CSProxy.generateBlocks(this.baseUrl, numBlocks);
  }

  static getInitialWallets(baseUrl: string) {
    return Proxy.fetch(`${baseUrl}/simulator/initial-wallets`);
  }

  getInitialWallets() {
    return CSProxy.getInitialWallets(this.baseUrl);
  }
}

const accountToRawAccount = (account: Account, previousAccount: {
  address: string;
  nonce: number;
  balance: bigint;
  code: string | null;
  codeMetadata: string | null;
  owner: string | null;
}, previousKvs: RawKvs) => {
  const rawAccount: any = {
    address: addressToBech32(account.address),
    nonce: account.nonce,
    balance: account.balance?.toString() || '0',
    keys: account.kvs != null ? kvsToRawKvs(account.kvs) : undefined,
    code: account.code,
    codeMetadata:
      account.codeMetadata != null
        ? codeMetadataToHex(account.codeMetadata)
        : undefined,
    ownerAddress: account.owner != null ? addressToBech32(account.owner) : undefined,
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

  if (previousAccount.code && rawAccount.code === '00') {
    rawAccount.code = previousAccount.code;
  }

  return {
    ...previousAccount,
    ...rawAccount,
  };
};
