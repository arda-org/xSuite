import { afterEach, beforeEach, expect, test } from "vitest";
import { d, e, CSWorld, CSContract } from "xsuite";
import {
  ADMIN_ADDRESS,
  delegationContractDataDecoder,
  egldUnit,
  hslrId,
  loadHatomLSContractState,
  segldId,
  SYSTEM_DELEGATION_MANAGER_ADDRESS,
} from "./helpers";

// TODO: simplifier un max le fichier

let world: CSWorld;
let delegationContract: CSContract;
let contract: CSContract;

beforeEach(async () => {
  world = await CSWorld.start();
});

afterEach(async () => {
  world.terminate();
});

test("Test 1 - Whole flow", async () => {
  delegationContract = await createDelegationContract();
  const delegationStake1 = await getTotalActiveStake();
  expect(delegationStake1).toEqual(3750n * egldUnit);

  contract = await world.createContract(loadHatomLSContractState());

  const adminStake = egldUnit;
  const admin = await world.createWallet({
    address: ADMIN_ADDRESS,
    balance: egldUnit + adminStake,
  });

  await admin.callContract({
    callee: contract,
    funcName: "whitelistDelegationContract",
    gasLimit: 510_000_000,
    funcArgs: [
      delegationContract,
      e.U(delegationStake1), // total stake
      e.U64(1), // nb of nodes,
      e.U(1100), // high apr so this delegation contract is selected instead of some other
      e.U(0), // service fee
    ],
  });
  console.log("Whitelisted delegation contract");

  await admin.callContract({
    callee: contract,
    funcName: "delegate", // TODO: to be replaced by another endpoint
    value: egldUnit,
    gasLimit: 45_000_000,
  });

  const aliceStake = 1_000_000n * egldUnit; // TODO: change test such that no need big number anymore
  const alice = await world.createWallet({
    address: { shard: 1 },
    balance: egldUnit + aliceStake,
  });

  await alice.callContract({
    callee: contract,
    funcName: "delegate",
    value: aliceStake,
    gasLimit: 45_000_000,
  });
  const segldAmount = 954487380216672062717437n;
  expect(d.account().from(await alice.getAccount())).toMatchObject({
    kvs: {
      esdts: [{ id: segldId, amount: segldAmount }],
    },
  });
  const stakeToDelegate = adminStake + aliceStake;
  expect(await getDelegationContractData()).toMatchObject({
    pending_to_delegate: stakeToDelegate,
  });
  console.log("Delegated to liquid staking contract");

  await admin.callContract({
    callee: contract,
    funcName: "delegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  const delegationStake2 = await getTotalActiveStake();
  expect(delegationStake2).toEqual(delegationStake1 + stakeToDelegate);
  console.log("Delegated pending amount");

  console.log("Advancing by 1 epoch...");
  await world.generateBlocksUntilEpochReached(2); // TODO-MvX: should advance only to epoch 1

  await admin.callContract({
    callee: contract,
    funcName: "claimRewardsFrom",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  const rewardsReserve = await getRewardsReserve();
  expect(rewardsReserve).toEqual(2326977120091482386n);
  console.log("Claimed rewards from delegation contract");

  await admin.callContract({
    callee: contract,
    funcName: "delegateRewards",
    gasLimit: 45_000_000,
  });
  const delegationStake3 = await getTotalActiveStake();
  expect(delegationStake3).toEqual(delegationStake2 + rewardsReserve);
  console.log("Delegated rewards");

  await alice.callContract({
    callee: contract,
    funcName: "unDelegate",
    gasLimit: 45_000_000,
    esdts: [{ id: segldId, amount: segldAmount }],
  });
  const hslrNonce = 5405;
  const hslrAmount = 1n;
  expect(d.account().from(await alice.getAccount())).toMatchObject({
    kvs: {
      esdts: [
        { id: hslrId, variants: [{ nonce: hslrNonce, amount: hslrAmount }] },
      ],
    },
  });
  expect(await getDelegationContractData()).toMatchObject({
    pending_to_undelegate: 1000000961031372912645212n, // TODO: compute this amount
  });
  console.log("Undelegated from liquid staking contract");

  await admin.callContract({
    callee: contract,
    funcName: "unDelegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  const delegationStake4 = await getTotalActiveStake();
  expect(delegationStake4).toEqual(3752365945747178837174n); // TODO: compute this amount
  console.log("Undelegated pending amount");

  console.log("Advancing by 10 epochs...");
  await world.generateBlocksUntilEpochReached(12); // TODO-MvX: should advance only to epoch 11

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
  console.log("Withdrawn from delegation contract");

  await alice.callContract({
    callee: contract,
    funcName: "withdraw",
    gasLimit: 45_000_000,
    esdts: [{ id: hslrId, nonce: hslrNonce, amount: hslrAmount }],
  });
  expect(await alice.getAccountBalance()).toEqual(
    aliceStake + 1958706638782645212n,
  );
  console.log("Withdrawn from liquid staking contract");
}, 60_000);

test("Test 2 - withdrawFrom & withdraw concurrency", async () => {
  delegationContract = await createDelegationContract();
  const delegationStake1 = await getTotalActiveStake();

  contract = await world.createContract(loadHatomLSContractState());

  const adminStake = egldUnit;
  const admin = await world.createWallet({
    address: ADMIN_ADDRESS,
    balance: egldUnit + adminStake,
  });

  await admin.callContract({
    callee: contract,
    funcName: "whitelistDelegationContract",
    gasLimit: 510_000_000,
    funcArgs: [
      delegationContract,
      e.U(delegationStake1), // total stake
      e.U64(1), // nb of nodes,
      e.U(1100), // high apr so this delegation contract is selected instead of some other
      e.U(0), // service fee
    ],
  });
  console.log("Whitelisted delegation contract");

  await admin.callContract({
    callee: contract,
    funcName: "delegate", // TODO: to be replaced by another endpoint
    value: egldUnit,
    gasLimit: 45_000_000,
  });

  const aliceStake = 1_000_000n * egldUnit; // TODO: change test such that no need big number anymore
  const alice = await world.createWallet({
    address: { shard: 1 },
    balance: egldUnit + aliceStake,
  });

  await alice.callContract({
    callee: contract,
    funcName: "delegate",
    value: aliceStake,
    gasLimit: 45_000_000,
  });
  const segldAmount = 954487380216672062717437n; // TODO: d'où sort le nombre
  console.log("Delegated to liquid staking contract");

  await admin.callContract({
    callee: contract,
    funcName: "delegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Delegated pending amount");

  await alice.callContract({
    callee: contract,
    funcName: "unDelegate",
    gasLimit: 45_000_000,
    esdts: [{ id: segldId, amount: segldAmount }],
  });
  const hslrNonce = 5405;
  const hslrAmount = 1n;
  expect(d.account().from(await alice.getAccount())).toMatchObject({
    balance: 999318014120000000n,
    kvs: {
      esdts: [
        { id: hslrId, variants: [{ nonce: hslrNonce, amount: hslrAmount }] },
      ],
    },
  });
  console.log("Undelegated from liquid staking contract");

  await admin.callContract({
    callee: contract,
    funcName: "unDelegatePendingAmount",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Undelegated pending amount");

  console.log("Advancing by 10 epochs...");
  await world.generateBlocksUntilEpochReached(12); // TODO-MvX: should advance only to epoch 10

  const withdrawFromTxHash = await alice.sendCallContract({
    callee: contract,
    funcName: "withdrawFrom",
    gasLimit: 45_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Initiated to withdraw from delegation contract");

  console.log("Advancing by 1 block...");
  await world.generateBlocks(1);

  await world.resolveTx(withdrawFromTxHash).assertPending();

  let withdrawTxHash = await alice.sendCallContract({
    callee: contract,
    funcName: "withdraw",
    gasLimit: 45_000_000,
    esdts: [{ id: hslrId, nonce: hslrNonce, amount: hslrAmount }],
  });
  console.log("Initiated to withdraw");

  console.log("Advancing by 1 block...");
  await world.generateBlocks(1);

  await world.resolveTx(withdrawFromTxHash).assertPending();
  await world
    .resolveTx(withdrawTxHash)
    .assertFail({ code: "signalError", message: "Too much EGLD amount" });
  console.log("Failed to withdraw");

  console.log("Advancing by 1 block...");
  await world.generateBlocks(1);

  await world.resolveTx(withdrawFromTxHash).assertPending();

  withdrawTxHash = await alice.sendCallContract({
    callee: contract,
    funcName: "withdraw",
    gasLimit: 45_000_000,
    esdts: [{ id: hslrId, nonce: hslrNonce, amount: hslrAmount }],
  });
  console.log("Initiated to withdraw again");

  console.log("Advancing by 1 block...");
  await world.generateBlocks(1);

  await world.resolveTx(withdrawFromTxHash).assertSucceed();
  await world.resolveTx(withdrawTxHash).assertSucceed();

  expect(d.account().from(await alice.getAccount())).toMatchObject({
    balance: aliceStake + 997675618849999998n,
    kvs: {},
  });
  console.log("Succeeded to withdraw");
}, 60_000);

const createDelegationContract = async () => {
  const delegationOwner = await world.createWallet({
    balance: egldUnit + 1250n * egldUnit,
  });

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

  const wallets = await world.getInitialWallets();
  const stakeWallet = world.newWallet(wallets.stakeWallets[0].address);
  await stakeWallet.setAccount({
    ...(await stakeWallet.getAccount()),
    balance: egldUnit,
  });

  await delegationOwner.callContract({
    callee: delegationContract,
    funcName: "whitelistForMerge",
    gasLimit: 65_000_000,
    funcArgs: [stakeWallet],
  });
  console.log("Whitelisted initial stake wallet for merge");

  await stakeWallet.callContract({
    callee: SYSTEM_DELEGATION_MANAGER_ADDRESS,
    funcName: "mergeValidatorToDelegationWithWhitelist",
    gasLimit: 510_000_000,
    funcArgs: [delegationContract],
  });
  console.log("Merged validator with delegation contract");

  return delegationContract;
};

const getTotalActiveStake = async () => {
  const result = await world.query({
    callee: delegationContract,
    funcName: "getTotalActiveStake",
  });
  return d.U().fromTop(result.returnData[0]);
};

const getDelegationContractData = async () => {
  const result = await world.query({
    callee: contract,
    funcName: "getDelegationContractData",
    funcArgs: [delegationContract],
  });
  return delegationContractDataDecoder.fromTop(result.returnData[0]);
};

const getRewardsReserve = async () => {
  const result = await world.query({
    callee: contract,
    funcName: "getRewardsReserve",
  });
  return d.U().fromTop(result.returnData[0]);
};
