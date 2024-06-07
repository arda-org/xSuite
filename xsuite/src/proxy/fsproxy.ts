import { EncodableAccount, e } from "../data/encoding";
import { hexToBase64 } from "../data/utils";
import { Proxy, unrawRes } from "./proxy";

export class FSProxy extends Proxy {
  getInitialWalletsRaw() {
    return this.fetchRaw("/simulator/initial-wallets");
  }

  async getInitialAddresses() {
    const res = unrawRes(await this.getInitialWalletsRaw());
    return {
      withStake: (res.stakeWallets as any[]).map(
        (w) => w.address.bech32 as string,
      ),
      withBalance: Object.values<any>(res.balanceWallets).map(
        (w) => w.address.bech32 as string,
      ),
    };
  }

  setAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/simulator/set-state-overwrite",
      accounts.map((a) => encodableAccountToSettableAccount(a)),
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

  advanceToEpoch(epoch: number) {
    return this.fetch(
      `/simulator/force-epoch-change?targetEpoch=${epoch}`,
      {},
    ).then(() => {});
  }

  processTx(txHash: string) {
    return this.fetch(
      `/simulator/generate-blocks-until-transaction-processed/${txHash}`,
      {},
    ).then(() => {});
  }
}

const encodableAccountToSettableAccount = (account: EncodableAccount) => {
  const { codeHash, codeMetadata, kvs, owner, ...rAcc } = e.account(account);
  return {
    ...rAcc,
    codeHash: codeHash !== undefined ? hexToBase64(codeHash) : undefined,
    codeMetadata:
      codeMetadata !== undefined ? hexToBase64(codeMetadata) : undefined,
    keys: kvs !== undefined ? e.kvs(kvs) : undefined, // TODO-MvX: better if called "pairs"
    ownerAddress: owner,
  };
};
