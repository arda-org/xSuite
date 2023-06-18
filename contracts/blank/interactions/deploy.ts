import { World, readFileHex, KeystoreSigner } from "xsuite/world";

const main = async () => {
  const signer = await KeystoreSigner.fromFile("wallet.json");
  const world = World.new({
    proxyUrl: "https://devnet-gateway.multiversx.com",
    chainId: "D",
  });
  const txResult = await world.deployContract(signer, {
    gasPrice: 1000000000,
    gasLimit: 20000000,
    code: readFileHex("output/contract.wasm"),
    codeMetadata: [],
  });
  console.log(txResult);
};

main();
