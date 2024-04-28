import { e, EncodableAccount } from "../data/encoding";
import { getSerializableAccount, Proxy, unrawRes } from "./proxy";

export class SProxy extends Proxy {
  getAllAccountsRaw() {
    return this.fetchRaw("/admin/get-all-accounts");
  }

  async getAllSerializableAccountsWithKvs() {
    const res = unrawRes(await this.getAllAccountsRaw());
    return (res.accounts as any[]).map(getSerializableAccount);
  }

  setAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/admin/set-accounts",
      accounts.map((a) => e.account(a)),
    );
  }

  setAccount(account: EncodableAccount) {
    return this.setAccounts([account]);
  }

  setCurrentBlockInfo(block: Block) {
    return this.fetch("/admin/set-current-block-info", block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.fetch("/admin/set-previous-block-info", block);
  }

  /**
   * @deprecated Use `.setCurrentBlockInfo` instead.
   */
  setCurrentBlock(block: Block) {
    return this.setCurrentBlockInfo(block);
  }
}

export type Block = {
  timestamp?: number;
  nonce?: number;
  round?: number;
  epoch?: number;
};
