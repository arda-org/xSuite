import { EncodableAccount } from "../data/encoding";
import { Proxy, unrawRes } from "./proxy";
import { accountToSettableAccount } from "./utils";

export class CSProxy extends Proxy {
  getInitialWalletsRaw() {
    return this.fetchRaw("/simulator/initial-wallets");
  }

  async getInitialWallets() {
    const res = unrawRes(await this.getInitialWalletsRaw());
    return {
      stakeWallets: (res.stakeWallets as any[]).map((w) => ({
        address: w.address.bech32 as string,
        privateKey: w.privateKeyHex as string,
      })),
      balanceWallets: Object.values<any>(res.balanceWallets).map((w) => ({
        address: w.address.bech32 as string,
        privateKey: w.privateKeyHex as string,
      })),
    };
  }

  setAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/simulator/set-state-overwrite",
      accounts.map((a) => accountToSettableAccount(a)),
    ).then(() => {});
  }

  setAccount(account: EncodableAccount) {
    return this.setAccounts([account]);
  }

  generateBlocks(numBlocks: number) {
    return this.fetch(`/simulator/generate-blocks/${numBlocks}`, {}).then(
      () => {},
    );
  }

  generateBlock() {
    return this.generateBlocks(1);
  }

  generateBlocksUntilEpochReached(epoch: number) {
    return this.fetch(
      `/simulator/generate-blocks-until-epoch-reached/${epoch}`,
      {},
    ).then(() => {});
  }
}
