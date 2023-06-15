import { World, readFileHex, UserSigner } from "xsuite/world";

const main = async () => {
  const signer = await UserSigner.fromKeystoreFile("../../wallet.json");
  const world = World.devnet("https://devnet-gateway.multiversx.com");
  const txResult = await world.deployContract(signer, {
    gasPrice: 1000000000,
    gasLimit: 20000000,
    code: readFileHex("output/contract.wasm"),
    codeMetadata: [],
  });
  console.log(txResult);
};

main();
