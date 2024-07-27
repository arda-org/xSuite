import { FSWorld } from "../src";

const main = async () => {
  using world = await FSWorld.start();
  const sender = await world.createWallet({ balance: 10n ** 18n });
  const receiver = await world.createWallet({ balance: 1 });
  await sender.transfer({
    receiver,
    value: 1,
    gasLimit: 100_000,
  });
};

main();
