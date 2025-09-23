"use client";

import { keccak256, toHex } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";

import { cookieJarAbi } from "@/generated";
import { isV2Chain } from "@/config/supported-networks";

/**
 * Return type for useCookieJarConfig hook
 */
interface CookieJarConfigReturn {
  /** Parsed jar configuration data */
  config: any;
  /** Whether the configuration is loading */
  isLoading: boolean;
  /** Whether an error occurred */
  hasError: boolean;
  /** Array of any errors that occurred */
  errors: any[];
  /** Function to refetch the configuration */
  refetch: () => void;
}

/**
 * Custom hook to read all Cookie Jar configuration from the smart contract
 * 
 * Fetches comprehensive jar configuration including access control settings,
 * withdrawal parameters, balances, and user-specific data. Uses optimized
 * batch contract reads for better performance and automatically handles
 * v1/v2 contract differences.
 * 
 * @param address - Cookie Jar contract address to fetch configuration for
 * @returns Object with configuration data, loading state, and refetch function
 * 
 * @example
 * ```tsx
 * const { config, isLoading, hasError, refetch } = useCookieJarConfig(jarAddress);
 * 
 * if (isLoading) return <div>Loading...</div>;
 * if (hasError) return <div>Error loading jar</div>;
 * 
 * return (
 *   <div>
 *     <h1>{config.metadata}</h1>
 *     <p>Balance: {config.balance}</p>
 *     <p>Access: {config.accessType}</p>
 *   </div>
 * );
 * ```
 */
export const useCookieJarConfig = (address: `0x${string}`): CookieJarConfigReturn => {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const JAR_OWNER = keccak256(toHex("JAR_OWNER")) as `0x${string}`;

  // Use correct role names based on contract version
  const allowlistRoleName = isV2Chain(chainId)
    ? "JAR_ALLOWLISTED"
    : "JAR_WHITELISTED";
  const JAR_ALLOWLISTED = keccak256(toHex(allowlistRoleName)) as `0x${string}`;

  const denylistRoleName = isV2Chain(chainId)
    ? "JAR_DENYLISTED"
    : "JAR_BLACKLISTED";
  const JAR_DENYLISTED = keccak256(toHex(denylistRoleName)) as `0x${string}`;

  // Use correct function name based on contract version
  const lastWithdrawalFunctionName = isV2Chain(chainId)
    ? "lastWithdrawalAllowlist"
    : "lastWithdrawalWhitelist";

  // Contract calls with version-aware function names
  const contracts = [
    { address, abi: cookieJarAbi, functionName: "accessType" },
    {
      address,
      abi: cookieJarAbi,
      functionName: "hasRole",
      args: [
        JAR_OWNER,
        userAddress ||
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      ],
    },
    { address, abi: cookieJarAbi, functionName: "withdrawalOption" },
    { address, abi: cookieJarAbi, functionName: "fixedAmount" },
    { address, abi: cookieJarAbi, functionName: "maxWithdrawal" },
    { address, abi: cookieJarAbi, functionName: "withdrawalInterval" },
    { address, abi: cookieJarAbi, functionName: "strictPurpose" },
    { address, abi: cookieJarAbi, functionName: "emergencyWithdrawalEnabled" },
    { address, abi: cookieJarAbi, functionName: "oneTimeWithdrawal" },
    { address, abi: cookieJarAbi, functionName: "getWithdrawalDataArray" },
    { address, abi: cookieJarAbi, functionName: "feeCollector" },
    {
      address,
      abi: cookieJarAbi,
      functionName: "hasRole",
      args: [
        JAR_ALLOWLISTED,
        userAddress ||
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      ],
    },
    {
      address,
      abi: cookieJarAbi,
      functionName: "hasRole",
      args: [
        JAR_DENYLISTED,
        userAddress ||
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      ],
    },
    {
      address,
      abi: cookieJarAbi,
      functionName: lastWithdrawalFunctionName,
      args: [
        userAddress ||
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      ],
    },
    {
      address,
      abi: cookieJarAbi,
      functionName: "lastWithdrawalNFT",
      args: [
        userAddress ||
          ("0x0000000000000000000000000000000000000000" as `0x${string}`),
        BigInt(0),
      ],
    },
    { address, abi: cookieJarAbi, functionName: "currencyHeldByJar" },
    { address, abi: cookieJarAbi, functionName: "currency" },
  ];

  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts,
    allowFailure: true,
  });

  const WithdrawalTypeOptions = ["Fixed", "Variable"];

  // Simple access type mapping to avoid TypeScript issues
  const getAccessTypeName = (typeIndex: unknown): string => {
    switch (typeIndex) {
      case 0:
        return "Allowlist";
      case 1:
        return "NFT-Gated";
      case 2:
        return "POAP";
      case 3:
        return "Unlock";
      case 4:
        return "Hypercert";
      case 5:
        return "Hats";
      default:
        return "Unknown";
    }
  };

  // Extract results to variables to break complex type inference
  const results: any[] = (data as any) || [];
  const r0 = results[0]?.result;
  const r1 = results[1]?.result;
  const r2 = results[2]?.result;
  const r3 = results[3]?.result;
  const r4 = results[4]?.result;
  const r5 = results[5]?.result;
  const r6 = results[6]?.result;
  const r7 = results[7]?.result;
  const r8 = results[8]?.result;
  const r9 = results[9]?.result;
  const r10 = results[10]?.result;
  const r11 = results[11]?.result;
  const r12 = results[12]?.result;
  const r13 = results[13]?.result;
  const r14 = results[14]?.result;
  const r15 = results[15]?.result;
  const r16 = results[16]?.result;

  const accessTypeString = r0 !== undefined ? getAccessTypeName(r0) : undefined;

  // Create config object with pre-extracted values
  const config = {
    JAR_OWNER,
    contractAddress: address,
    accessType: accessTypeString,
    admin: r1 as boolean | undefined,
    withdrawalOption:
      r2 !== undefined ? WithdrawalTypeOptions[r2 as number] : undefined,
    fixedAmount: r3 as bigint | undefined,
    maxWithdrawal: r4 as bigint | undefined,
    withdrawalInterval: r5 as bigint | undefined,
    strictPurpose: r6 as boolean | undefined,
    emergencyWithdrawalEnabled: r7 as boolean | undefined,
    oneTimeWithdrawal: r8 as boolean | undefined,
    pastWithdrawals: r9 as
      | readonly { amount: bigint; purpose: string; recipient: `0x${string}` }[]
      | undefined,
    feeCollector: r10 as `0x${string}` | undefined,
    allowlist: r11 as boolean | undefined,
    denylist: r12 as boolean | undefined,
    lastWithdrawalAllowlist: r13 as bigint | undefined, // Works for both v1 (whitelist) and v2 (allowlist) data
    lastWithdrawalNft: r14 as bigint | undefined,
    balance: r15 as bigint | undefined,
    currency: r16 as `0x${string}` | undefined,
    metadata: undefined as string | undefined,
    supportsProtocols: r0 !== undefined && (r0 as number) >= 2,
  };

  return {
    config,
    isLoading,
    hasError: isError,
    errors: error ? [error] : [],
    refetch,
  };
};
