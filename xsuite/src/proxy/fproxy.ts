import { Address, Pairs, pairsToRawPairs, RawPairs } from "../data";
import { CodeMetadata, codeMetadataToHexString, Proxy } from "./proxy";

export class FProxy extends Proxy {
  static setAccount(baseUrl: string, account: Account) {
    return Proxy.fetch(
      `${baseUrl}/admin/set-account`,
      accountToRawAccount(account),
    );
  }

  setAccount(account: Account) {
    return FProxy.setAccount(this.baseUrl, account);
  }

  static setCurrentBlock(baseUrl: string, block: Block) {
    return Proxy.fetch(`${baseUrl}/admin/set-current-block`, block);
  }

  setCurrentBlock(block: Block) {
    return FProxy.setCurrentBlock(this.baseUrl, block);
  }

  static terminate(baseUrl: string) {
    return Proxy.fetch(`${baseUrl}/admin/terminate`)
      .then(() => {
        //
      })
      .catch(() => {
        //
      });
  }

  terminate() {
    return FProxy.terminate(this.baseUrl);
  }
}

const accountToRawAccount = (account: Account): RawAccount => {
  return {
    address: account.address.toString(),
    nonce: account.nonce,
    balance: account.balance?.toString(),
    pairs:
      account.pairs !== undefined ? pairsToRawPairs(account.pairs) : undefined,
    code: account.code,
    codeMetadata:
      account.codeMetadata !== undefined
        ? codeMetadataToHexString(account.codeMetadata)
        : undefined,
    owner: account.owner !== undefined ? account.owner.toString() : undefined,
  };
};

export type Account = {
  address: Address;
  nonce?: number;
  balance?: number | bigint;
  pairs?: Pairs;
  code?: string;
  codeMetadata?: CodeMetadata;
  owner?: Address;
};

type RawAccount = {
  address: string;
  nonce?: number;
  balance?: string;
  pairs?: RawPairs;
  code?: string;
  codeMetadata?: string;
  owner?: string;
};

export type Block = {
  timestamp?: number;
  nonce?: number;
  round?: number;
  epoch?: number;
};
