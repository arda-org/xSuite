import { SignableMessage } from "@multiversx/sdk-core";
import { NativeAuthClient } from "@multiversx/sdk-native-auth-client";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import { log } from "../context";
import { u8aToHex } from "../data/utils";
import { Proxy } from "../proxy";
import { KeystoreSigner } from "../world/signer";
import { logSuccess, pause } from "./helpers";

export const addRequestXegldCmd = (cmd: Command) => {
  cmd
    .command("request-xegld")
    .description("Request xEGLD (once per day).")
    .requiredOption("--wallet <WALLET_PATH>", "Wallet path")
    .option("--password <PASSWORD>", "Wallet password")
    .action(action);
};

const action = async ({
  wallet: walletPath,
  password,
}: {
  wallet: string;
  password?: string;
}) => {
  let signer: KeystoreSigner;
  if (password === undefined) {
    signer = await KeystoreSigner.fromFile(walletPath);
    log();
  } else {
    signer = KeystoreSigner.fromFile_unsafe(walletPath, password);
  }
  const address = signer.toString();
  log(`Claiming xEGLD for address "${address}"...`);

  const client = new NativeAuthClient({
    origin: "https://devnet-wallet.multiversx.com",
    apiUrl: "https://devnet-api.multiversx.com",
  });
  const initToken = await client.initialize();
  const dataToSign = new SignableMessage({
    message: Buffer.from(`${address}${initToken}`, "utf8"),
  }).serializeForSigning();
  const signature = await signer.sign(dataToSign).then(u8aToHex);
  const accessToken = client.getToken(address, initToken, signature);

  const faucetUrl = `https://devnet-wallet.multiversx.com/faucet?accessToken=${accessToken}`;
  log();
  log("Open the URL and request tokens:");
  log(chalk.bold(faucetUrl));
  if (!process.env.VITEST_WORKER_ID) {
    open(faucetUrl);
  }

  const initialBalance = await devnetProxy.getAccountBalance(address);
  let balance = initialBalance;
  while (balance <= initialBalance) {
    await pause(pollInterval);
    balance = await devnetProxy.getAccountBalance(address);
  }

  log();
  logSuccess(
    `Wallet well received ${(balance - initialBalance) / 10n ** 18n} xEGLD.`,
  );
};

const devnetProxy = new Proxy("https://devnet-gateway.multiversx.com");

const pollInterval = process.env.VITEST_WORKER_ID ? 1 : 1000;
