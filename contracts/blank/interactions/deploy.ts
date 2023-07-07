import { World } from "xsuite/world";

const main = async () => {
  const world = World.new({
    proxyUrl: "https://devnet-gateway.multiversx.com",
    chainId: "D",
    gasPrice: 1000000000,
  });
  const wallet = await world.newWalletFromFile("wallet.json");
  const txResult = await wallet.deployContract({
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 20_000_000,
  });
  console.log(txResult);
};

main();
