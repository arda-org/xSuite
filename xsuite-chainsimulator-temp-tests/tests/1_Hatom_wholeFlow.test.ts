import { afterAll, beforeAll, expect, test } from "vitest";
import { d, e, CSWorld } from "xsuite";
import {
  ADMIN_ADDRESS,
  delegationContractDataDecoder,
  egldUnit,
  hslrId,
  loadHatomLSContractState,
  segldId,
  SYSTEM_DELEGATION_MANAGER_ADDRESS,
} from "./helpers";

let world: CSWorld;

beforeAll(async () => {
  world = await CSWorld.start();
});

afterAll(async () => {
  world.terminate();
});

const createDelegationContract = async () => {
  const delegationOwner = await world.createWallet({
    balance: egldUnit + 1250n * egldUnit,
  });

  await world.generateBlocksUntilEpochReached(1); // TODO: test should work without this
  // Seems like some things still don't work being enabled on epoch 0

  const res = await delegationOwner.callContract({
    callee: SYSTEM_DELEGATION_MANAGER_ADDRESS,
    funcName: "createNewDelegationContract",
    gasLimit: 65_000_000,
    value: 1250n * egldUnit,
    funcArgs: [
      e.U(0), // delegation cap
      e.U(0), // service fee
    ],
  });
  const delegationContract = world.newContract(res.returnData[0]);
  console.log("Deployed delegation contract");

  const initialWallets = await world.getInitialWallets();
  const initialStakeWallet = world.newWallet(
    initialWallets.stakeWallets[0].address.bech32,
  );

  await delegationOwner.callContract({
    callee: delegationContract,
    funcName: "whitelistForMerge",
    gasLimit: 65_000_000,
    funcArgs: [initialStakeWallet],
  });
  console.log("Whitelisted initial stake wallet for merge");

  await initialStakeWallet.callContract({
    callee: SYSTEM_DELEGATION_MANAGER_ADDRESS,
    funcName: "mergeValidatorToDelegationWithWhitelist",
    gasLimit: 510_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Merged validator with delegation contract");

  return delegationContract;
};

test("Test", async () => {
  const delegationContract = await createDelegationContract();
  const alice = await world.createWallet({
    address: "erd1lh08nq6j75s39vtgn2gtzed8p62nr77my8h3wyhdcv7xjql7gn9szasf5c", // TODO: should have option to generate automatically in shard 1
    balance: egldUnit + 4_000_000n * egldUnit, // TODO: why number this big?
  });
  const admin = await world.createWallet({
    address: ADMIN_ADDRESS,
    balance: egldUnit,
  });
  const contract = await world.createContract(loadHatomLSContractState());

  let result = await world.query({
    callee: delegationContract,
    funcName: "getTotalActiveStake",
  });
  const delegationStake = d.U().fromTop(result.returnData[0]);
  expect(delegationStake).toEqual(3750n * egldUnit);

  await admin.callContract({
    callee: contract,
    funcName: "whitelistDelegationContract",
    gasLimit: 510_000_000,
    funcArgs: [
      delegationContract,
      e.U(delegationStake), // total stake
      e.U64(1), // nb of nodes,
      e.U(1100), // high apr so this delegation contract is selected instead of some other
      e.U(0), // service fee
    ],
  });
  console.log("Whitelisted delegation contract");

  await alice.callContract({
    callee: contract,
    funcName: "delegate",
    value: 4_000_000n * egldUnit,
    gasLimit: 45_000_000,
  });
  console.log("Delegated EGLD");
  const segldAmount = 3817949520866688250869751n;
  expect(d.account().from(await alice.getAccountWithKvs())).toMatchObject({
    kvs: {
      esdts: [{ id: segldId, amount: segldAmount }],
    },
  });

  result = await world.query({
    callee: contract,
    funcName: "getDelegationContractData",
    funcArgs: [delegationContract],
  });
  let delegationContractData = delegationContractDataDecoder.fromTop(
    result.returnData[0],
  );
  expect(delegationContractData.pending_to_delegate).toEqual(
    4_000_000n * egldUnit,
  );

  await admin.callContract({
    callee: contract,
    funcName: "delegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Delegated pending amount");

  result = await world.query({
    callee: delegationContract,
    funcName: "getTotalActiveStake",
  });
  expect(d.U().fromTop(result.returnData[0])).toEqual(4_003_750n * egldUnit); // staked increased by 4,000,000 EGLD

  console.log("Moving forward 3 epochs...");
  // Move forward 3 epochs (to have enough rewards so they can be claimed & delegated)
  await world.generateBlocks(20 * 3); // TODO: move the epochs directly

  await admin.callContract({
    callee: contract,
    funcName: "claimRewardsFrom",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Claimed rewards from staking provider");

  result = await world.query({
    callee: contract,
    funcName: "getRewardsReserve",
  });
  const rewardsAmount = 9978146349127131213n;
  expect(d.U().fromTop(result.returnData[0])).toEqual(rewardsAmount);

  const tx2 = await admin.callContract({
    callee: contract,
    funcName: "delegateRewards",
    gasLimit: 45_000_000,
  });
  console.log("Delegated rewards", tx2);
  console.log(JSON.stringify(tx2));
  // TODO: If transaction has an error in an Async Call, the full logs will not appear immediately for some reason and
  // we need to wait extra blocks. However if the Async Call is successfully completed, then the full logs will appear
  // The transaction is not fully completed here, even though the gateway reports the status as `success`, not all
  // logs are yet available.
  // await world.generateBlocks(3);
  //
  // All logs are available here even in case of Async Call error
  // const txResult = await world.proxy.getTx(tx2.tx.hash, { withResults: true });
  //
  // console.log('Transaction result after waiting');
  // console.log(JSON.stringify(txResult));

  result = await world.query({
    callee: delegationContract,
    funcName: "getTotalActiveStake",
  });
  const totalActiveStake = d.U().fromTop(result.returnData[0]);
  console.log("New total active stake: ", totalActiveStake);
  expect(totalActiveStake).toEqual(4_003_750n * egldUnit + rewardsAmount); // staked increased by rewards reserve amount

  await alice.callContract({
    callee: contract,
    funcName: "unDelegate",
    gasLimit: 45_000_000,
    esdts: [{ id: segldId, amount: segldAmount / 10n }],
  });
  console.log("Undelegate sEGLD successfully");
  const hslrNonce = 5405;
  const hslrAmount = 1n;
  expect(d.account().from(await alice.getAccountWithKvs())).toMatchObject({
    kvs: {
      esdts: [
        { id: hslrId, variants: [{ nonce: hslrNonce, amount: hslrAmount }] },
        { id: segldId, amount: segldAmount - segldAmount / 10n },
      ],
    },
  });

  result = await world.query({
    callee: contract,
    funcName: "getDelegationContractData",
    funcArgs: [delegationContract],
  });
  delegationContractData = delegationContractDataDecoder.fromTop(
    result.returnData[0],
  );
  console.log("Delegation contract data: ", delegationContractData);

  await admin.callContract({
    callee: contract,
    funcName: "unDelegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log(
    "Undelegate pending amount successfully. Moving forward 10 epochs...",
  );

  // Move forward 10 epochs + 5 blocks so unbonding period passes
  // The extra 5 blocks are needed for the following `withdraw` to work correctly
  // and not fail with `The unbond period has not ended` error, not sure why exactly
  await world.generateBlocks(20 * 10 + 5); // TODO: move the epochs directly

  await alice
    .callContract({
      callee: contract,
      funcName: "withdraw",
      gasLimit: 45_000_000,
      esdts: [{ id: hslrId, nonce: hslrNonce, amount: hslrAmount }],
    })
    .assertFail({ code: "signalError", message: "Too much EGLD amount" });

  await alice.callContract({
    callee: contract,
    funcName: "withdrawFrom",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Withdraw from staking provider successfully");

  const tx = await alice.callContract({
    callee: contract,
    funcName: "withdraw",
    gasLimit: 45_000_000,
    esdts: [{ id: hslrId, nonce: hslrNonce, amount: hslrAmount }],
  });
  const receivedEgldAmount = d.U().fromTop(tx.returnData[0]);
  console.log(
    "Withdraw EGLD successfully. Received EGLD amount: ",
    receivedEgldAmount,
  );
  expect(receivedEgldAmount).toEqual(400000736213615074473001n); // ~400,000.73 EGLD received back, more than initially delegated

  const balance = await alice.getAccountBalance();
  expect(balance).toBeGreaterThan(receivedEgldAmount);

  result = await world.query({
    callee: delegationContract,
    funcName: "getTotalActiveStake",
  });
  console.log(
    "Remaining active stake for staking provider: ",
    d.U().fromTop(result.returnData[0]),
  );
  expect(d.U().fromTop(result.returnData[0])).toEqual(
    3603759241932734052658212n,
  );
}, 60_000); // Test takes 30-60 seconds to run
