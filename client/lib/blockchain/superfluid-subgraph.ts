/**
 * Superfluid Subgraph Configuration
 *
 * The Graph subgraph endpoints for Superfluid Protocol
 * https://docs.superfluid.finance/superfluid/developers/subgraph
 */

export const SUPERFLUID_SUBGRAPH_ENDPOINTS: Record<number, string> = {
  // Mainnets
  1: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-eth-mainnet',
  10: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-optimism-mainnet',
  137: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-matic',
  8453: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-base-mainnet',
  42161:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-arbitrum-one',
  43114:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-avalanche-c',
  100: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-xdai',
  56: 'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-bsc-mainnet',

  // Testnets
  11155111:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-eth-sepolia',
  80002:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-amoy',
  84532:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-base-sepolia',
  421614:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-arbitrum-sepolia',
  11155420:
    'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-optimism-sepolia',
};

/**
 * Get the Superfluid subgraph endpoint for a given chain ID
 */
export function getSuperfluidSubgraphUrl(chainId: number): string | undefined {
  return SUPERFLUID_SUBGRAPH_ENDPOINTS[chainId];
}

/**
 * Check if The Graph subgraph is available for this chain
 */
export function isSubgraphAvailable(chainId: number): boolean {
  return chainId in SUPERFLUID_SUBGRAPH_ENDPOINTS;
}
