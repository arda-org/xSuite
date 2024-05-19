import { LSWorld } from "../src";

const main = async () => {
  const world = await LSWorld.start();
  const sender = await world.createWallet({ balance: 100 });
  const receiver = await world.createWallet({ balance: 100 });
  await sender.transfer({
    receiver,
    value: 100,
    gasLimit: 100_000,
  });
  world.terminate();
};

main();
