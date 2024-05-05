import { afterAll, assert, beforeAll, test } from "vitest";
import { assertAccount, d, e, CSContract, CSWallet, CSWorld, Tx } from "xsuite";
import { DummySigner } from "xsuite/dist/world/signer";
import {
  ADMIN_ADDRESS,
  delegationContractDataDecoder,
  esdtTokenPaymentDecoder,
  extractContract,
  getHatomContractState,
  MAINNET_LIQUID_STAKING_CONTRACT_ADDRESS,
  SYSTEM_DELEGATION_MANAGER_ADDRESS,
} from "./helpers";

let world: CSWorld;
let deployer: CSWallet;
let address: CSWallet;
let alice: CSWallet;
let admin: CSWallet;

let systemDelegationContract: CSContract;
let liquidStakingContract: CSContract;

beforeAll(async () => {
  world = await CSWorld.start({
    // debug: true,
  });

  // Wallets always need EGLD balance to pay for fees
  deployer = await world.createWallet({
    balance: "1000000000000000000", // 1 EGLD
  });
  address = await world.createWallet({
    balance: "1255000000000000000000", // 1255 EGLD
  });
  await world.setAccount({
    address: "erd1lh08nq6j75s39vtgn2gtzed8p62nr77my8h3wyhdcv7xjql7gn9szasf5c",
    balance: "4001000000000000000000000", // 4,001,000 EGLD
  });
  alice = world.newWallet(
    "erd1lh08nq6j75s39vtgn2gtzed8p62nr77my8h3wyhdcv7xjql7gn9szasf5c",
  ); // shard 1, same as hatom contract
  admin = world.newWallet(ADMIN_ADDRESS);
  await admin.setAccount({
    balance: "10000000000000000000", // 10 EGLD
  });

  const hatomContractState = await getHatomContractState();
  await world.setAccount({
    ...hatomContractState,
    owner: deployer,
  });

  systemDelegationContract = world.newContract(
    SYSTEM_DELEGATION_MANAGER_ADDRESS,
  );
  liquidStakingContract = world.newContract(
    MAINNET_LIQUID_STAKING_CONTRACT_ADDRESS,
  );

  // generate 20 blocks to pass an epoch so system smart contracts are enabled
  await world.generateBlocks(20);
}, 30_000);

afterAll(async () => {
  // Having this here so we can access the chain simulator endpoints outside of tests
  // await new Promise((resolve, reject) => {
  //   setTimeout(() => resolve(), 60_000);
  // });

  world.terminate();
}, 60_000);

const deployDelegationProvider = async () => {
  const tx = await address.callContract({
    callee: systemDelegationContract,
    funcName: "createNewDelegationContract",
    gasLimit: 65_000_000,
    value: 1250000000000000000000n, // 1250 EGLD
    funcArgs: [
      e.U(0), // delegation cap
      e.U(3745), // service fee
    ],
  });
  const stakingProviderDelegationContract = extractContract(tx, world);
  console.log(
    "Deployed new delegation contract",
    stakingProviderDelegationContract.toString(),
  );

  const initialWallets = await world.getInitialWallets();
  const initialAddressWithStake = initialWallets.stakeWallets[0].address.bech32;
  const initialAddressWithStakeWallet = world.newWallet(
    new DummySigner(initialAddressWithStake),
  );
  console.log("Initial address with stake", initialAddressWithStake);

  await address.callContract({
    callee: stakingProviderDelegationContract,
    funcName: "whitelistForMerge",
    gasLimit: 65_000_000,
    funcArgs: [initialAddressWithStakeWallet],
  });
  console.log("Whitelisted initial address with stake for merge");

  await initialAddressWithStakeWallet.callContract({
    callee: systemDelegationContract,
    funcName: "mergeValidatorToDelegationWithWhitelist",
    gasLimit: 510_000_000,
    funcArgs: [stakingProviderDelegationContract],
  });
  console.log(
    "Merged validator with delegation contract. Moving forward 1 epoch...",
  );

  return { stakingProviderDelegationContract };
};

const setupLiquidStakingDelegateUndelegate = async (
  stakingProviderDelegationContract: CSContract,
) => {
  let result = await world.query({
    callee: stakingProviderDelegationContract,
    funcName: "getTotalActiveStake",
  });
  const stakingProviderStake = d.U().topDecode(result.returnData[0]);
  console.log("Staking provider stake: ", stakingProviderStake);
  assert(stakingProviderStake === 3750000000000000000000n);

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: "whitelistDelegationContract",
    gasLimit: 510_000_000,
    funcArgs: [
      stakingProviderDelegationContract,
      e.U(3750000000000000000000n), // total value locked (3750 EGLD = 2500 EGLD initial + 1250 EGLD from delegate creation)
      e.U64(1), // nb of nodes,
      e.U(1100), // high apr
      e.U(200), // low service fee so this delegation contract is selected instead of some other
    ],
  });
  console.log("Whitelisted delegation contract");

  let tx = await alice.callContract({
    callee: liquidStakingContract,
    funcName: "delegate",
    value: 4000000000000000000000000n, // 4,000,000 EGLD,
    gasLimit: 45_000_000,
  });
  const segldReceived = esdtTokenPaymentDecoder.topDecode(tx.returnData[0]);
  console.log("Delegate EGLD successfully. Received sEGLD: ", segldReceived);
  assertAccount(await alice.getAccountWithKvs(), {
    kvs: [
      e.kvs.Esdts([
        { id: segldReceived.token_identifier, amount: segldReceived.amount },
      ]),
    ],
  });

  result = await world.query({
    callee: liquidStakingContract,
    funcName: "getDelegationContractData",
    funcArgs: [stakingProviderDelegationContract],
  });
  let delegationContractData = delegationContractDataDecoder.topDecode(
    result.returnData[0],
  );
  console.log("Delegation contract data: ", delegationContractData);
  assert(
    delegationContractData.pending_to_delegate === 4000000000000000000000000n,
  );

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: "delegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [stakingProviderDelegationContract],
  });
  console.log(
    "Delegated pending amount: ",
    delegationContractData.pending_to_delegate,
  );

  result = await world.query({
    callee: stakingProviderDelegationContract,
    funcName: "getTotalActiveStake",
  });
  assert(d.U().topDecode(result.returnData[0]) === 4003750000000000000000000n); // staked increased by 4,000,000 EGLD

  tx = await alice.callContract({
    callee: liquidStakingContract,
    funcName: "unDelegate",
    gasLimit: 45_000_000,
    esdts: [
      {
        id: segldReceived.token_identifier,
        amount: segldReceived.amount / 10n,
      },
    ],
  });
  const undelegateNftReceived = esdtTokenPaymentDecoder.topDecode(
    tx.returnData[0],
  );
  console.log(
    "Undelegate sEGLD successfully. Received NFT: ",
    undelegateNftReceived,
  );
  assert(undelegateNftReceived.amount === 1n);

  result = await world.query({
    callee: liquidStakingContract,
    funcName: "getDelegationContractData",
    funcArgs: [stakingProviderDelegationContract],
  });
  delegationContractData = delegationContractDataDecoder.topDecode(
    result.returnData[0],
  );
  console.log("Delegation contract data: ", delegationContractData);

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: "unDelegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [stakingProviderDelegationContract],
  });
  console.log(
    "Undelegate pending amount successfully. Moving forward 10 epochs...",
  );

  // Move forward 10 epochs
  await world.generateBlocks(20 * 10);

  await world.sendTx(
    Tx.getParamsToCallContract({
      sender: alice,
      callee: liquidStakingContract,
      funcName: "withdrawFrom",
      gasLimit: 45_000_000,
      funcArgs: [stakingProviderDelegationContract],
    }),
  );

  await world.generateBlocks(1); // `withdrawFrom` transaction is pending

  const txHash = await world.sendTx(
    Tx.getParamsToCallContract({
      sender: alice,
      callee: liquidStakingContract,
      funcName: "withdraw",
      gasLimit: 45_000_000,
      esdts: [
        {
          id: undelegateNftReceived.token_identifier,
          amount: undelegateNftReceived.amount,
          nonce: Number(undelegateNftReceived.token_nonce),
        },
      ],
    }),
  );

  await world.generateBlocks(1); // Async call from `withdrawFrom` is still pending; `withdraw` transaction is pending
  await world.generateBlocks(1); // Async call from `withdrawFrom` is finished; `withdraw` failed

  // Assert that this transaction fails
  result = await world.proxy.getTx(txHash, { withResults: true });

  assert(result.status === "success");

  const signalErrorEvent = result?.logs?.events.find(
    (e: any) => e.identifier === "signalError",
  );

  assert(signalErrorEvent);

  // Withdrawing again passes since async call is finished
  tx = await alice.callContract({
    callee: liquidStakingContract,
    funcName: "withdraw",
    gasLimit: 45_000_000,
    esdts: [
      {
        id: undelegateNftReceived.token_identifier,
        amount: undelegateNftReceived.amount,
        nonce: Number(undelegateNftReceived.token_nonce),
      },
    ],
  });
  console.log("result", tx);
  const receivedEgldAmount = d.U().topDecode(tx.returnData[0]);
  console.log(
    "Withdraw EGLD successfully. Received EGLD amount: ",
    receivedEgldAmount,
  );

  const balance = await alice.getAccountBalance();
  assert(balance >= receivedEgldAmount);

  result = await world.query({
    callee: stakingProviderDelegationContract,
    funcName: "getTotalActiveStake",
  });
  console.log(
    "Remaining active stake for staking provider: ",
    d.U().topDecode(result.returnData[0]),
  );
  assert(d.U().topDecode(result.returnData[0]) === 3603750000000000000000001n);
};

test(
  "Test",
  async () => {
    const { stakingProviderDelegationContract } =
      await deployDelegationProvider();

    await setupLiquidStakingDelegateUndelegate(
      stakingProviderDelegationContract,
    );
  },
  { timeout: 60_000 },
);
