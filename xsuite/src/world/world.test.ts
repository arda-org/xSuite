import { expect, test } from "@jest/globals";
import { FProxy } from "../proxy";
import { startFProxyServer } from "./fproxyServer";
import { DummySigner } from "./signer";
import { World } from "./world";

test("World.new, World.newWallet, World.newContract", async () => {
  const proxyUrl = await startFProxyServer();
  const world = World.new({ proxyUrl, chainId: "F" });
  const wallet = world.newWallet(new DummySigner(new Uint8Array(32)));
  const contract = world.newContract(new Uint8Array(32));
  expect(wallet.toTopBytes()).toEqual(new Uint8Array(32));
  expect(contract.toTopBytes()).toEqual(new Uint8Array(32));
  await FProxy.terminate(proxyUrl);
});
