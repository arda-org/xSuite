import { World, KeystoreSigner } from "xsuite/world";

const main = async () => {
  const signer = await KeystoreSigner.fromFile("wallet.json");
  const world = World.new({
    proxyUrl: "https://devnet-gateway.multiversx.com",
    chainId: "D",
    gasPrice: 1000000000,
  });
  const txResult = await world.deployContract(signer, {
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 20_000_000,
  });
  console.log(txResult);
};

main();
