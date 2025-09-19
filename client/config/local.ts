import { defineChain } from "viem";

// Local Anvil chain configuration (Pure local development without fork)
export const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil Local",
  network: "anvil-local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Local", url: "http://127.0.0.1:8545" },
  },
  // No multicall3 contract in pure local mode - viem will fallback to individual calls
});

// Local contract addresses (updated by deployment script)
let localDeployment: { CookieJarFactory?: string } = {};

export const loadLocalDeployment = async () => {
  try {
    const response = await fetch("/contracts/local-deployment.json");
    if (response.ok) {
      localDeployment = await response.json();
    }
  } catch (error) {
    console.warn("Local deployment not found, using testnet contracts");
  }
};

export const getLocalContractAddress = (name: "CookieJarFactory"): `0x${string}` | undefined => {
  return localDeployment[name] as `0x${string}` | undefined;
};
