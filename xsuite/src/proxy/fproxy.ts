import { Address, Esdt, s, Pairs, pairsToRawPairs, RawPairs } from "../data";
import { CodeMetadata, codeMetadataToHexString, Proxy } from "./proxy";

export class FProxy extends Proxy {
  static setAccount(baseUrl: string, account: BroadAccount) {
    return Proxy.fetch(
      `${baseUrl}/admin/set-account`,
      accountToRawAccount(account)
    );
  }

  setAccount(account: BroadAccount) {
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

const accountToRawAccount = (account: BroadAccount): RawAccount => {
  let pairs: RawPairs | undefined;
  if ("esdts" in account || "storage" in account) {
    pairs = pairsToRawPairs([
      s.Esdts(account.esdts ?? []),
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

type BroadAccount = Account | RawAccount;

export type Account = {
  address: Address;
  nonce?: number;
  balance?: bigint;
  esdts?: Esdt[];
  storage?: Pairs;
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
