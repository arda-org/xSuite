import fs from "node:fs";
import path from "node:path";
import { SignableMessage } from "@multiversx/sdk-core";
import { NativeAuthClient } from "@multiversx/sdk-native-auth-client";
import { UserSigner } from "@multiversx/sdk-wallet";
import chalk from "chalk";
import { cwd, inputHidden } from "./helpers";

export const walletRequestXegldAction = async ({
  path: walletPath,
}: {
  path: string;
}) => {
  const filePath = path.resolve(cwd, walletPath);
  const keystore = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const password = await inputHidden("Enter password: ");
  const signer = UserSigner.fromWallet(keystore, password);
  console.log(`Claiming 30 xEGLD for address ${signer.getAddress()} ...`);
  const address = signer.getAddress().bech32();
  const balance = await getDevnetBalance(address);

  const client = new NativeAuthClient({
    origin: "https://devnet-wallet.multiversx.com",
    apiUrl: "https://devnet-api.multiversx.com",
  });
  const initToken = await client.initialize();
  const dataToSign = new SignableMessage({
    message: Buffer.from(`${address}${initToken}`, "utf8"),
  }).serializeForSigning();
  const signature = await signer
    .sign(dataToSign)
    .then((b) => b.toString("hex"));
  const accessToken = client.getToken(address, initToken, signature);

  const errorMessage = await fetch(
    "https://devnet-extras-api.multiversx.com/faucet",
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    }
  )
    .then((r) => r.json())
    .then((d) => {
      if (d["status"] !== "success") {
        return d["message"] as string;
      }
    });

  if (errorMessage) {
    console.log(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }

  let newBalance = balance;
  while (newBalance - balance < 30n * 10n ** 18n) {
    newBalance = await getDevnetBalance(address);
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(chalk.green("Wallet well received 30 xEGLD."));
};

const getDevnetBalance = (address: string) =>
  fetch(`https://devnet-gateway.multiversx.com/address/${address}/balance`)
    .then((r) => r.json())
    .then((d) => BigInt(d["data"]["balance"]));
