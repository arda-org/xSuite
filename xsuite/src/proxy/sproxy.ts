import { e, EncodableAccount } from "../data/encoding";
import { Proxy } from "./proxy";

export class SProxy extends Proxy {
  static setAccount(baseUrl: string, account: EncodableAccount) {
    return Proxy.fetch(`${baseUrl}/admin/set-account`, e.account(account));
  }

  setAccount(account: EncodableAccount) {
    return SProxy.setAccount(this.baseUrl, account);
  }

  static setCurrentBlockInfo(baseUrl: string, block: Block) {
    return Proxy.fetch(`${baseUrl}/admin/set-current-block-info`, block);
  }

  setCurrentBlockInfo(block: Block) {
    return SProxy.setCurrentBlockInfo(this.baseUrl, block);
  }

  static setPreviousBlockInfo(baseUrl: string, block: Block) {
    return Proxy.fetch(`${baseUrl}/admin/set-previous-block-info`, block);
  }

  setPreviousBlockInfo(block: Block) {
    return SProxy.setPreviousBlockInfo(this.baseUrl, block);
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

  /**
   * @deprecated Use `.setCurrentBlockInfo` instead.
   */
  static setCurrentBlock(baseUrl: string, block: Block) {
    return SProxy.setCurrentBlockInfo(baseUrl, block);
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
