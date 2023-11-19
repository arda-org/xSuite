import { Command } from "commander";
import { envChain, World } from "xsuite";
import data from "./data.json";

const world = World.new({
  chainId: envChain.id(),
});

const loadWallet = () => world.newWalletFromFile("wallet.json");

const program = new Command();

program.command("deploy").action(async () => {
  const wallet = await loadWallet();
  const result = await wallet.deployContract({
    code: data.code,
    codeMetadata: ["upgradeable"],
    gasLimit: 20_000_000,
  });
  console.log("Transaction:", result.tx.explorerUrl);
  console.log("Contract:", result.contract.explorerUrl);
});

program.command("upgrade").action(async () => {
  const wallet = await loadWallet();
  const result = await wallet.upgradeContract({
    callee: envChain.select(data.address),
    code: data.code,
    codeMetadata: ["upgradeable"],
    gasLimit: 20_000_000,
  });
  console.log("Transaction:", result.tx.explorerUrl);
});

program.command("ClaimDeveloperRewards").action(async () => {
  const wallet = await loadWallet();
  const result = await wallet.callContract({
    callee: envChain.select(data.address),
    funcName: "ClaimDeveloperRewards",
    gasLimit: 10_000_000,
  });
  console.log("Transaction:", result.tx.explorerUrl);
});

program.parse(process.argv);
