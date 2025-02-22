import { EncodableAccount, eAccountUnfiltered } from "../data/encoding";
import { getSerializableAccount, Proxy } from "./proxy";

export class LSProxy extends Proxy {
  constructor(...[params]: ConstructorParameters<typeof Proxy>) {
    params = typeof params === "string" ? { proxyUrl: params } : params;
    params.pauseAfterSend ??= 0;
    super(params);
  }

  async getAllSerializableAccounts() {
    const res = await this.fetch("/admin/get-all-accounts");
    return (res.accounts as any[])
      .map(getSerializableAccount)
      .sort((a, b) => a.address.localeCompare(b.address));
  }

  setAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/admin/set-accounts",
      accounts.map((a) => eAccountUnfiltered(a)),
    ).then(() => {});
  }

  setAccount(account: EncodableAccount) {
    return this.setAccounts([account]);
  }

  updateAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/admin/update-accounts",
      accounts.map((a) => eAccountUnfiltered(a)),
    ).then(() => {});
  }

  updateAccount(account: EncodableAccount) {
    return this.updateAccounts([account]);
  }

  setCurrentBlockInfo(block: Block) {
    return this.fetch("/admin/set-current-block-info", block).then(() => {});
  }

  setPreviousBlockInfo(block: Block) {
    return this.fetch("/admin/set-previous-block-info", block).then(() => {});
  }

  /**
   * @deprecated Use `.getAllSerializableAccounts` instead.
   */
  getAllSerializableAccountsWithKvs() {
    return this.getAllSerializableAccounts();
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
