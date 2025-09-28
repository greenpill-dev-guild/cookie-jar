"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { keccak256, toHex } from "viem";

import { useReadCookieJarHasRole } from "@/generated";
import { isV2Chain } from "@/config/supported-networks";

/**
 * Custom hook to check user's allowlist status for a Cookie Jar
 * 
 * Determines if the current user is allowlisted for a specific jar by
 * checking the appropriate role (JAR_ALLOWLISTED for v2, JAR_WHITELISTED for v1).
 * Automatically handles contract version differences.
 * 
 * @param jarAddress - Cookie Jar contract address to check
 * @returns Object with allowlist status and loading state
 * 
 * @example
 * ```tsx
 * const { isAllowlisted, isLoading } = useAllowlistStatus(jarAddress);
 * 
 * if (isLoading) return <div>Checking status...</div>;
 * 
 * return (
 *   <div>
 *     Status: {isAllowlisted ? 'Allowlisted' : 'Not Allowlisted'}
 *   </div>
 * );
 * ```
 */
export function useAllowlistStatus(jarAddress: string) {
  const [isAllowlisted, setIsAllowlisted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const { address: userAddress } = useAccount();

  const chainId = useChainId();

  // Use correct role name based on contract version
  const roleName = isV2Chain(chainId) ? "JAR_ALLOWLISTED" : "JAR_WHITELISTED";
  const JAR_ROLE = keccak256(toHex(roleName)) as `0x${string}`;

  // Use the contract hook to check allowlist status
  const { data, isLoading: isLoadingRole } = useReadCookieJarHasRole({
    address: jarAddress as `0x${string}`,
    args: userAddress ? [JAR_ROLE, userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress && !!jarAddress,
    },
  });

  useEffect(() => {
    if (!isLoadingRole) {
      setIsAllowlisted(!!data);
      setIsLoading(false);
    }
  }, [data, isLoadingRole]);

  return { isAllowlisted, isLoading };
}
