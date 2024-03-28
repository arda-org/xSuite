import { Proxy } from 'xsuite';
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