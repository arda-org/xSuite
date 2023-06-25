import { Address } from "../enc";
import { Esdt, getEsdtsKvs, Kv, kvsToPairs, Pairs } from "../pairs";
import { CodeMetadata, codeMetadataToHexString, Proxy } from "./proxy";

export class FProxy extends Proxy {
  static setAccount(baseUrl: string, account: Account) {
    return Proxy.fetch(
      `${baseUrl}/admin/set-account`,
      accountToRawAccount(account)
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
    return Proxy.fetch(`${baseUrl}/admin/terminate`);
  }

  terminate() {
    return FProxy.terminate(this.baseUrl);
  }
}

const accountToRawAccount = (account: Account): RawAccount => {
  let pairs: Pairs | undefined;
  if ("esdts" in account || "storage" in account) {
    pairs = kvsToPairs([
      ...getEsdtsKvs(account.esdts ?? []),
      ...(account.storage ?? []),
    ]);
  } else if ("pairs" in account) {
    pairs = account.pairs;
  }
  return {
    address: account.address.toString(),
    nonce: account.nonce,
    balance: account.balance?.toString(),
    pairs,
    code: account.code,
    codeMetadata:
      account.codeMetadata !== undefined
        ? codeMetadataToHexString(account.codeMetadata)
        : undefined,
    owner: account.owner !== undefined ? account.owner.toString() : undefined,
  };
};

type Account = HighlevelAccount | RawAccount;

export type HighlevelAccount = {
  address: Address;
  nonce?: number;
  balance?: bigint;
  esdts?: Esdt[];
  storage?: Kv[];
  code?: string;
  codeMetadata?: CodeMetadata;
  owner?: Address;
};

type RawAccount = {
  address: string;
  nonce?: number;
  balance?: string;
  pairs?: Pairs;
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
