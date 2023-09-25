import { SignableMessage } from "@multiversx/sdk-core";
import { NativeAuthClient } from "@multiversx/sdk-native-auth-client";
import { Command } from "commander";
import open from "open";
import { log } from "../_stdio";
import { Proxy } from "../proxy";
import { KeystoreSigner } from "../world/signer";
import { logSuccess } from "./helpers";

export const registerRequestXegldCmd = (cmd: Command) => {
  cmd
    .command("request-xegld")
    .description("Request 30 xEGLD (once per day).")
    .requiredOption("--wallet <WALLET>", "Wallet path")
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
  log(`Claiming 30 xEGLD for address "${address}"...`);

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

  const faucetUrl = `https://devnet-wallet.multiversx.com/faucet?accessToken=${accessToken}`;
  log();
  log("Open this URL:");
  log(faucetUrl);
  if (!process.env.JEST_WORKER_ID) {
    open(faucetUrl);
  }

  const initialBalance = await devnetProxy.getAccountBalance(address);
  let balance = initialBalance;
  while (balance - initialBalance < 30n * 10n ** 18n) {
    balance = await devnetProxy.getAccountBalance(address);
    await new Promise((r) => setTimeout(r, 1000));
  }

  log();
  logSuccess("Wallet well received 30 xEGLD.");
};

const devnetProxy = new Proxy("https://devnet-gateway.multiversx.com");
