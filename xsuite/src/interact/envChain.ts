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
  id: () => envChain.select({ devnet: "D", testnet: "T", mainnet: "1" }),
  publicProxyUrl: () =>
    envChain.select({
      devnet: "https://devnet-gateway.multiversx.com",
      testnet: "https://testnet-gateway.multiversx.com",
      mainnet: "https://gateway.multiversx.com",
    }),
};

const isChainName = (chain: any): chain is ChainName => {
  return chainNames.includes(chain);
};

const chainNames = ["devnet", "testnet", "mainnet"] as const;

type ChainName = (typeof chainNames)[number];
