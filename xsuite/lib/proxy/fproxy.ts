import { Esdt, getEsdtsPairs } from "../pairs";
import {
  Address,
  CodeMetadata,
  Hex,
  codeMetadataToHexString,
  hexToHexString,
  Proxy,
} from "./proxy";

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
  let pairs: Record<string, string> | undefined;
  if ("esdts" in account || "storage" in account) {
    pairs = Object.fromEntries(
      [
        ...getEsdtsPairs(...(account.esdts ?? [])),
        ...(account.storage ?? []),
      ].map(([k, v]) => [hexToHexString(k), hexToHexString(v)])
    );
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
  storage?: [Hex, Hex][];
  code?: string;
  codeMetadata?: CodeMetadata;
  owner?: Address;
};

type RawAccount = {
  address: string;
  nonce?: number;
  balance?: string;
  pairs?: Record<string, string>;
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
