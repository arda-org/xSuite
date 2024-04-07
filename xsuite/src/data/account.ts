import { Kvs } from "./kvs";

export type Account = {
  address: string;
  nonce?: number;
  balance?: string;
  code?: string;
  codeHash?: string;
  codeMetadata?: string;
  owner?: string;
  kvs?: Kvs;
};
