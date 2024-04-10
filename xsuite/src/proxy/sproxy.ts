import { e, EncodableAccount } from "../data/encoding";
import { Proxy } from "./proxy";

export class SProxy extends Proxy {
  setAccount(account: EncodableAccount) {
    return this.fetch("/admin/set-account", e.account(account));
  }

  setCurrentBlockInfo(block: Block) {
    return this.fetch("/admin/set-current-block-info", block);
  }

  setPreviousBlockInfo(block: Block) {
    return this.fetch("/admin/set-previous-block-info", block);
  }

  terminate() {
    return this.fetch("/admin/terminate")
      .then(() => {
        //
      })
      .catch(() => {
        //
      });
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
