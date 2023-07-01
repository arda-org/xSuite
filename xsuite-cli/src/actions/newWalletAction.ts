import { KeystoreSigner } from "xsuite/world";

export const newWalletAction = async ({
  path: walletPath,
  password,
}: {
  path: string;
  password?: string;
}) => {
  if (password === undefined) {
    await KeystoreSigner.createFileInteractive(walletPath);
  } else {
    KeystoreSigner.createFile(walletPath, password);
  }
};
