/**
 * Network Display Utilities
 *
 * Simple utility functions for network-specific display and configuration.
 */

/**
 * Get network name for display
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum';
    case 8453:
      return 'Base';
    case 84532:
      return 'Base Sepolia';
    case 10:
      return 'Optimism';
    case 11155420:
      return 'Optimism Sepolia';
    case 42161:
      return 'Arbitrum';
    case 421614:
      return 'Arbitrum Sepolia';
    case 100:
      return 'Gnosis';
    case 137:
      return 'Polygon';
    case 11155111:
      return 'Sepolia';
    case 31337:
      return 'Local';
    case 1337:
      return 'Localhost';
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Get network information for display with color coding
 */
export const getNetworkInfo = (chainId?: number) => {
  if (!chainId) return { name: 'Disconnected', color: 'bg-gray-500' };

  switch (chainId) {
    case 84532: // Base Sepolia
      return { name: 'Base Sepolia', color: 'bg-[#ff5e14]' };
    case 8453: // Base Mainnet
      return { name: 'Base', color: 'bg-blue-500' };
    case 10: // Optimism
      return { name: 'Optimism', color: 'bg-red-500' };
    case 100: // Gnosis
      return { name: 'Gnosis', color: 'bg-green-500' };
    case 42161: // Arbitrum
      return { name: 'Arbitrum', color: 'bg-blue-700' };
    default:
      return { name: 'Unknown', color: 'bg-gray-500' };
  }
};

/**
 * Get block explorer URL for an address
 */
export function getExplorerAddressUrl(
  address: string,
  chainId: number
): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    10: 'https://optimistic.etherscan.io',
    11155420: 'https://sepolia-optimism.etherscan.io',
    42161: 'https://arbiscan.io',
    421614: 'https://sepolia.arbiscan.io',
    100: 'https://gnosisscan.io',
    137: 'https://polygonscan.com',
    11155111: 'https://sepolia.etherscan.io',
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/address/${address}`;
}
