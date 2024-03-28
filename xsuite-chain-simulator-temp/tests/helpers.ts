import { CSContract, d, Proxy } from 'xsuite';
import { mainnetPublicProxyUrl } from 'xsuite/dist/interact/envChain';
const fs = require('fs');

export const SYSTEM_DELEGATION_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq6y6';

export const MAINNET_LIQUID_STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq4gzfcw7kmkjy8zsf04ce6dl0auhtzjx078sslvrf4e';
export const ADMIN_ADDRESS = 'erd1cc2yw3reulhshp3x73q2wye0pq8f4a3xz3pt7xj79phv9wm978ssu99pvt';

const hatomStateFile = "./tests/hatomState.json";

export const getHatomContractState = async () => {
  if (!fs.existsSync(hatomStateFile)) {
    console.log('file does not exist');
    const realContract = await Proxy.getSerializableAccountWithKvs(
      mainnetPublicProxyUrl,
      MAINNET_LIQUID_STAKING_CONTRACT_ADDRESS,
    );

    fs.writeFileSync(hatomStateFile, JSON.stringify(realContract));
  }

  return JSON.parse(fs.readFileSync(hatomStateFile));
}

export const extractContract = (tx, world): CSContract => {
  const events = tx.tx.logs.events;

  for (const event: any of events) {
    if (event.identifier !== 'SCDeploy') {
      continue;
    }

    const address = Buffer.from(event.topics[0], 'base64');

    return world.newContract(address);
  }
};

export const esdtTokenPaymentDecoder = d.Tuple({
  token_identifier: d.Str(),
  token_nonce: d.U64(),
  amount: d.U(),
});

export const delegationContractDataDecoder = d.Tuple({
  contract: d.Addr(),
  total_value_locked: d.U(),
  cap: d.Option(d.U()),
  nr_nodes: d.U64(),
  apr: d.U(),
  service_fee: d.U(),
  delegation_score: d.U(),
  pending_to_delegate: d.U(),
  total_delegated: d.U(),
  pending_to_undelegate: d.U(),
  total_undelegated: d.U(),
  total_withdrawable: d.U(),
  outdated: d.Bool(),
  blacklisted: d.Bool(),
});
