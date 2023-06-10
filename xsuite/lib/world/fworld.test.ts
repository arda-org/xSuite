import { expect, test } from "@jest/globals";
import { FWorld } from "./fworld";

test("Sanity check", async () => {
  const targetBalance = 10_000_000_000n;
  const fworld = await FWorld.start();
  const wallet = await fworld.newWallet({ balance: targetBalance });
  const { balance } = await wallet.getAccountWithPairs();
  expect(balance).toEqual(targetBalance);
  fworld.terminate();
});
