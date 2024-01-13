import { Address, addressToBech32 } from "../data/address";
import { Kvs, RawKvs, kvsToRawKvs } from "../data/kvs";
import { CodeMetadata, codeMetadataToHex, Proxy } from "./proxy";

export class SProxy extends Proxy {
  static setAccount(baseUrl: string, account: Account) {
    return Proxy.fetch(
      `${baseUrl}/admin/set-account`,
      accountToRawAccount(account),
    );
  }

  setAccount(account: Account) {
    return SProxy.setAccount(this.baseUrl, account);
  }

  static setCurrentBlock(baseUrl: string, block: Block) {
    return Proxy.fetch(`${baseUrl}/admin/set-current-block`, block);
  }

  setCurrentBlock(block: Block) {
    return SProxy.setCurrentBlock(this.baseUrl, block);
  }

  static setPreviousBlock(baseUrl: string, block: Block) {
    return Proxy.fetch(`${baseUrl}/admin/set-previous-block`, block);
  }

  setPreviousBlock(block: Block) {
    return SProxy.setPreviousBlock(this.baseUrl, block);
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
    return SProxy.terminate(this.baseUrl);
  }
}

const accountToRawAccount = (account: Account): RawAccount => {
  return {
    address: addressToBech32(account.address),
    nonce: account.nonce,
    balance: account.balance?.toString(),
    kvs: account.kvs != null ? kvsToRawKvs(account.kvs) : undefined,
    code: account.code,
    codeMetadata:
      account.codeMetadata != null
        ? codeMetadataToHex(account.codeMetadata)
        : undefined,
    owner: account.owner != null ? addressToBech32(account.owner) : undefined,
  };
};

export type Account = {
  address: Address;
  nonce?: number;
  balance?: number | bigint | string;
  code?: string | null;
  codeMetadata?: CodeMetadata | null;
  owner?: Address | null;
  kvs?: Kvs;
};

type RawAccount = {
  address: string;
  nonce?: number;
  balance?: string;
  code?: string | null;
  codeMetadata?: string | null;
  owner?: string | null;
  kvs?: RawKvs;
};

export type Block = {
  timestamp?: number;
  nonce?: number;
  round?: number;
  epoch?: number;
};
