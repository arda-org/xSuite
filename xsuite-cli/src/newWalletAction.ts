import { KeystoreSigner } from "xsuite/world";

export const newWalletAction = async ({
  path: walletPath,
}: {
  path: string;
}) => {
  await KeystoreSigner.create(walletPath);
};
