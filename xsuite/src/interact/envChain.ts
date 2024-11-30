import {
  devnetChainId,
  devnetMinGasPrice,
  devnetMvxExplorerUrl,
  devnetMvxProxyUrl,
  mainnetChainId,
  mainnetMinGasPrice,
  mainnetMvxExplorerUrl,
  mainnetMvxProxyUrl,
  testnetChainId,
  testnetMinGasPrice,
  testnetMvxExplorerUrl,
  testnetMvxProxyUrl,
} from "../data/constants";

export const envChain = {
  name: (): ChainName => {
    const chain = process.env.CHAIN;
    if (!chain) {
      throw new Error("CHAIN environment variable is not set.");
    }
    if (isChainName(chain)) {
      return chain;
    }
    throw new Error("CHAIN environment variable value is invalid.");
  },
  select: <T>(values: Partial<Record<ChainName, T>>): T => {
    const value = values[envChain.name()];
    if (value === undefined) {
      throw new Error("No value for CHAIN environment variable.");
    }
    return value;
  },
  id: () =>
    envChain.select({
      devnet: devnetChainId,
      testnet: testnetChainId,
      mainnet: mainnetChainId,
    } as const),
  mvxProxyUrl: () =>
    envChain.select({
      devnet: devnetMvxProxyUrl,
      testnet: testnetMvxProxyUrl,
      mainnet: mainnetMvxProxyUrl,
    } as const),
  minGasPrice: () =>
    envChain.select({
      devnet: devnetMinGasPrice,
      testnet: testnetMinGasPrice,
      mainnet: mainnetMinGasPrice,
    } as const),
  mvxExplorerUrl: () =>
    envChain.select({
      devnet: devnetMvxExplorerUrl,
      testnet: testnetMvxExplorerUrl,
      mainnet: mainnetMvxExplorerUrl,
    } as const),
  /**
   * @deprecated Use `.mvxProxyUrl` instead.
   */
  publicProxyUrl: () => envChain.mvxProxyUrl(),
  /**
   * @deprecated Use `.mvxExplorerUrl` instead.
   */
  explorerUrl: () => envChain.mvxExplorerUrl(),
};

const isChainName = (chain: any): chain is ChainName => {
  return chainNames.includes(chain);
};

const chainNames = ["devnet", "testnet", "mainnet"] as const;

type ChainName = (typeof chainNames)[number];
