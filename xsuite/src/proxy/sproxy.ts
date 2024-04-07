import { e, EncodableAccount } from "../data/encoding";
import { Proxy, ProxyParams } from "./proxy";

export class SProxy extends Proxy {
  static setAccount(params: ProxyParams, account: EncodableAccount) {
    return Proxy.fetch(params, "/admin/set-account", e.account(account));
  }

  setAccount(account: EncodableAccount) {
    return SProxy.setAccount(this.params, account);
  }

  static setCurrentBlockInfo(params: ProxyParams, block: Block) {
    return Proxy.fetch(params, "/admin/set-current-block-info", block);
  }

  setCurrentBlockInfo(block: Block) {
    return SProxy.setCurrentBlockInfo(this.params, block);
  }

  static setPreviousBlockInfo(params: ProxyParams, block: Block) {
    return Proxy.fetch(params, "/admin/set-previous-block-info", block);
  }

  setPreviousBlockInfo(block: Block) {
    return SProxy.setPreviousBlockInfo(this.params, block);
  }

  static terminate(params: ProxyParams) {
    return Proxy.fetch(params, "/admin/terminate")
      .then(() => {
        //
      })
      .catch(() => {
        //
      });
  }

  terminate() {
    return SProxy.terminate(this.params);
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
