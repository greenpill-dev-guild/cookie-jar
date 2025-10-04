'use client';

import { useChainId } from 'wagmi';
import { isV2Chain } from '@/config/supported-networks';
import { cookieJarAbi, cookieJarFactoryAbi } from '@/generated';
import {
  cookieJarFactoryV1Abi,
  cookieJarV1Abi,
} from '@/lib/blockchain/cookie-jar-v1-abi';

/**
 * Contract configuration adapter for handling v1/v2 differences
 */
export interface ContractAdapter {
  /** ABI to use for Cookie Jar contract */
  cookieJarAbi: typeof cookieJarAbi | typeof cookieJarV1Abi;
  /** ABI to use for Cookie Jar Factory contract */
  cookieJarFactoryAbi:
    | typeof cookieJarFactoryAbi
    | typeof cookieJarFactoryV1Abi;
  /** Function name mappings for v1/v2 differences */
  functionNames: {
    /** Allowlist/whitelist function names */
    getAllowlist: 'getAllowlist' | 'getWhitelist';
    grantAllowlist: 'grantJarAllowlistRole' | 'grantJarWhitelistRole';
    revokeAllowlist: 'revokeJarAllowlistRole' | 'revokeJarWhitelistRole';
    /** Withdrawal function names */
    withdrawAllowlistMode: 'withdrawAllowlistMode' | 'withdrawWhitelistMode';
    /** Role names */
    allowlistRole: 'JAR_ALLOWLISTED' | 'JAR_WHITELISTED';
    denylistRole: 'JAR_DENYLISTED' | 'JAR_BLACKLISTED';
    /** Last withdrawal tracking */
    lastWithdrawalAllowlist:
      | 'lastWithdrawalAllowlist'
      | 'lastWithdrawalWhitelist';
  };
  /** Whether this is a v2 contract (supports advanced features) */
  isV2: boolean;
  /** Chain ID for this contract */
  chainId: number;
}

/**
 * Custom hook to adapt contract interfaces based on v1/v2 differences
 *
 * Centralizes the logic for handling version differences between Cookie Jar
 * v1 and v2 contracts. Automatically detects the version and provides the
 * appropriate ABIs and function names.
 *
 * @param chainIdOverride - Optional chain ID override (uses current chain by default)
 * @returns Contract adapter with version-specific configuration
 *
 * @example
 * ```tsx
 * const adapter = useContractAdapter();
 *
 * // Use version-aware function names
 * const { data } = useReadContract({
 *   address: jarAddress,
 *   abi: adapter.cookieJarAbi,
 *   functionName: adapter.functionNames.getAllowlist,
 * });
 *
 * // Check if v2 features are supported
 * if (adapter.isV2) {
 *   // Use v2-specific features
 * }
 * ```
 */
export const useContractAdapter = (
  chainIdOverride?: number
): ContractAdapter => {
  const chainId = chainIdOverride ?? useChainId();
  const isV2 = isV2Chain(chainId);

  return {
    cookieJarAbi: isV2 ? cookieJarAbi : cookieJarV1Abi,
    cookieJarFactoryAbi: isV2 ? cookieJarFactoryAbi : cookieJarFactoryV1Abi,
    functionNames: {
      getAllowlist: isV2 ? 'getAllowlist' : 'getWhitelist',
      grantAllowlist: isV2 ? 'grantJarAllowlistRole' : 'grantJarWhitelistRole',
      revokeAllowlist: isV2
        ? 'revokeJarAllowlistRole'
        : 'revokeJarWhitelistRole',
      withdrawAllowlistMode: isV2
        ? 'withdrawAllowlistMode'
        : 'withdrawWhitelistMode',
      allowlistRole: isV2 ? 'JAR_ALLOWLISTED' : 'JAR_WHITELISTED',
      denylistRole: isV2 ? 'JAR_DENYLISTED' : 'JAR_BLACKLISTED',
      lastWithdrawalAllowlist: isV2
        ? 'lastWithdrawalAllowlist'
        : 'lastWithdrawalWhitelist',
    },
    isV2,
    chainId,
  };
};
