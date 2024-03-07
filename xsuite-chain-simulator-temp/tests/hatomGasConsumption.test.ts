import { afterAll, assert, beforeAll, test } from 'vitest';
import { assertAccount, d, e, Proxy, CSContract, CSWallet, CSWorld, Tx } from 'xsuite';
import { mainnetPublicProxyUrl } from 'xsuite/dist/interact/envChain';
import { DummySigner } from 'xsuite/dist/world/signer';

const SYSTEM_DELEGATION_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq6y6';

const LIQUID_STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq4gzfcw7kmkjy8zsf04ce6dl0auhtzjx078sslvrf4e';
const ADMIN_ADDRESS = 'erd1cc2yw3reulhshp3x73q2wye0pq8f4a3xz3pt7xj79phv9wm978ssu99pvt';

let world: CSWorld;
let deployer: CSWallet;
let admin: CSWallet;
let alice: CSWallet;

let systemDelegationContract: CSContract;
let liquidStakingContract: CSContract;

beforeAll(async () => {
  const realContract = await Proxy.getSerializableAccountWithKvs(
    mainnetPublicProxyUrl,
    LIQUID_STAKING_CONTRACT_ADDRESS,
  );
  world = await CSWorld.start({
    // verbose: true,
    // debug: true,
  });

  // Wallets always need EGLD balance to pay for fees
  deployer = await world.createWallet({
    balance: '1000000000000000000', // 1 EGLD
  });
  alice = await world.createWallet({
    balance: '4001000000000000000000000', // 4,001,000 EGLD
  });
  admin = await world.newWallet(new DummySigner(ADMIN_ADDRESS));
  await admin.setAccount({
    balance: '10000000000000000000', // 10 EGLD
  });

  await world.setAccount({
    ...realContract,
    owner: deployer,
  });

  systemDelegationContract = world.newContract(SYSTEM_DELEGATION_MANAGER_ADDRESS);
  liquidStakingContract = world.newContract(LIQUID_STAKING_CONTRACT_ADDRESS);

  // generate 20 blocks to pass an epoch so system smart contracts are enabled
  await world.generateBlocks(20);
}, 30_000);

afterAll(async () => {
  await world.terminate();
}, 60_000);

const esdtTokenPaymentDecoder = d.Tuple({
  token_identifier: d.Str(),
  token_nonce: d.U64(),
  amount: d.U(),
});

const extractContract = (tx): CSContract => {
  const events = tx.tx.logs.events;

  for (const event: any of events) {
    if (event.identifier !== 'SCDeploy') {
      continue;
    }

    const address = Buffer.from(event.topics[0], 'base64');

    return world.newContract(address);
  }
};

const deployAndWhitelistDelegationProvider = async (serviceFee: bigint, tvl: bigint, apr: bigint) => {
  const address = await world.createWallet({
    balance: '1255000000000000000000', // 1255 EGLD
  });
  console.log('Address', address.toString());

  const tx = await address.callContract({
    callee: systemDelegationContract,
    funcName: 'createNewDelegationContract',
    gasLimit: 65_000_000,
    value: '1250000000000000000000', // 1250 EGLD
    funcArgs: [
      e.U(0), // delegation cap
      e.U(serviceFee), // service fee
    ],
  });
  const stakingProviderDelegationContract = extractContract(tx);
  console.log('Deployed new delegation contract', stakingProviderDelegationContract.toString());

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: 'whitelistDelegationContract',
    gasLimit: 510_000_000,
    funcArgs: [
      stakingProviderDelegationContract,
      e.U(tvl),
      e.U64(1), // nb of nodes,
      e.U(apr),
      e.U(serviceFee),
    ],
  });
  console.log('Whitelisted delegation contract');

  return { stakingProviderDelegationContract };
};

const liquidStakingDelegateUndelegate = async () => {
  let tx = await alice.callContract({
    callee: liquidStakingContract,
    funcName: 'delegate',
    value: 4000000000000000000000000n, // 4,000,000 EGLD,
    gasLimit: 45_000_000,
  });
  const segldReceived = esdtTokenPaymentDecoder.topDecode(tx.returnData[0]);
  console.log('Delegate EGLD successfully. Received sEGLD: ', segldReceived);
  assertAccount(await alice.getAccountWithKvs(), {
    kvs: [
      e.kvs.Esdts([
        { id: segldReceived.token_identifier, amount: segldReceived.amount },
      ]),
    ],
  });

  // tx = await alice.callContract({
  //   callee: liquidStakingContract,
  //   funcName: 'unDelegate',
  //   gasLimit: 45_000_000,
  //   esdts: [
  //     { id: segldReceived.token_identifier, amount: segldReceived.amount / 10n },
  //   ],
  // });
  // const undelegateNftReceived = esdtTokenPaymentDecoder.topDecode(tx.returnData[0]);
  // console.log('Undelegate sEGLD successfully. Received NFT: ', undelegateNftReceived);
  // assert(undelegateNftReceived.amount === 1n);
};

test('Test', async () => {
  await admin.callContract({
    callee: liquidStakingContract,
    funcName: 'setDelegationScoreModelParams',
    gasLimit: 600_000_000,
    funcArgs: [
      e.U32(0), // weighting providers by TVL
      e.U(1), // min TVL,
      e.U(1_000_000_000_000_000_000_000), // max TVL (1000 EGLD),
      e.U(1), // min APR
      e.U(100_000_000), // max APR
      e.Bool(true), // sort
    ],
  });
  console.log('setDelegationScoreModelParams successfully');

  // TODO: Test with more contracts
  for (let i = 1n; i <= 2n;i++) {
    await deployAndWhitelistDelegationProvider(1000n - i, 100n - i, 1100n + i);
  }

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: 'setDelegationSamplingModelParams',
    gasLimit: 600_000_000,
    funcArgs: [
      e.U64(10_000), // maximum tolerance
      e.U64(5_000), // max service fee
      e.U64(1_000), // premium
    ],
  });
  console.log('setDelegationSamplingModelParams successfully');

  await liquidStakingDelegateUndelegate();

  await admin.callContract({
    callee: liquidStakingContract,
    funcName: 'setDelegationScoreModelParams',
    gasLimit: 600_000_000,
    funcArgs: [
      e.U32(1), // weighting providers by APR
      e.U(1), // min TVL,
      e.U(1_000_000_000_000_000_000_000), // max TVL (1000 EGLD),
      e.U(1), // min APR
      e.U(100_000_000), // max APR
      e.Bool(true), // sort
    ],
  });
  console.log('setDelegationScoreModelParams successfully');
}, { timeout: 120_000 }); // Test takes 30-60 seconds to run
