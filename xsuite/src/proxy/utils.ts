import { e, EncodableAccount } from "../data/encoding";
import { isContract, hexToBase64 } from "../data/utils";

export const accountToSettableAccount = (account: EncodableAccount) => {
  const { code, codeHash, codeMetadata, ...rAcc } = e.account(account);
  return {
    ...rAcc,
    code: code === undefined && isContract(rAcc.address) ? "00" : code,
    codeHash: codeHash !== undefined ? hexToBase64(codeHash) : undefined,
    codeMetadata:
      codeMetadata !== undefined ? hexToBase64(codeMetadata) : undefined,
    keys: account.kvs !== undefined ? e.kvs(account.kvs) : undefined, // TODO-MvX: better if called "pairs"
  };
};
