import { EncodableAccount, eAccountUnfiltered } from "../data/encoding";
import { hexToBase64 } from "../data/utils";
import { getValuesInOrder, Proxy } from "./proxy";

export class FSProxy extends Proxy {
  async getInitialAddresses() {
    const res = await this.fetch("/simulator/initial-wallets");
    return {
      withStake: (res.stakeWallets as any[]).map(
        (w) => w.address.bech32 as string,
      ),
      withBalance: getValuesInOrder<any>(res.balanceWallets).map(
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

  updateAccounts(accounts: EncodableAccount[]) {
    return this.fetch(
      "/simulator/set-state",
      accounts.map((a) => encodableAccountToSettableAccount(a)),
    ).then(() => {});
  }

  updateAccount(account: EncodableAccount) {
    return this.updateAccounts([account]);
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

  awaitTx(txHash: string) {
    return this.processTx(txHash);
  }
}

const encodableAccountToSettableAccount = (account: EncodableAccount) => {
  const { codeHash, codeMetadata, kvs, owner, ...rAcc } =
    eAccountUnfiltered(account);
  return {
    ...rAcc,
    codeHash: codeHash !== undefined ? hexToBase64(codeHash) : undefined,
    codeMetadata:
      codeMetadata !== undefined ? hexToBase64(codeMetadata) : undefined,
    pairs: kvs,
    ownerAddress: owner,
  };
};
