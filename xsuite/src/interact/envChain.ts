export const devnetChainId = "D";
export const testnetChainId = "T";
export const mainnetChainId = "1";

export const devnetPublicProxyUrl = "https://devnet-gateway.multiversx.com";
export const testnetPublicProxyUrl = "https://testnet-gateway.multiversx.com";
export const mainnetPublicProxyUrl = "https://gateway.multiversx.com";

export const devnetMinGasPrice = 1_000_000_000;
export const testnetMinGasPrice = 1_000_000_000;
export const mainnetMinGasPrice = 1_000_000_000;

export const devnetExplorerUrl = "https://devnet-explorer.multiversx.com";
export const testnetExplorerUrl = "https://testnet-explorer.multiversx.com";
export const mainnetExplorerUrl = "https://explorer.multiversx.com";

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
  publicProxyUrl: () =>
    envChain.select({
      devnet: devnetPublicProxyUrl,
      testnet: testnetPublicProxyUrl,
      mainnet: mainnetPublicProxyUrl,
    } as const),
  minGasPrice: () =>
    envChain.select({
      devnet: devnetMinGasPrice,
      testnet: testnetMinGasPrice,
      mainnet: mainnetMinGasPrice,
    } as const),
  explorerUrl: () =>
    envChain.select({
      devnet: devnetExplorerUrl,
      testnet: testnetExplorerUrl,
      mainnet: mainnetExplorerUrl,
    } as const),
};

const isChainName = (chain: any): chain is ChainName => {
  return chainNames.includes(chain);
};

const chainNames = ["devnet", "testnet", "mainnet"] as const;

type ChainName = (typeof chainNames)[number];
