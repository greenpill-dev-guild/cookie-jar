'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useSuperfluidFramework } from '../blockchain/useSuperfluidFramework';

/**
 * Superfluid account flow information
 */
export interface SuperfluidAccountInfo {
  netFlowRate: bigint;
  totalDeposit: bigint;
  owedDeposit: bigint;
  lastUpdated: number;
  formattedNetFlowRate: string;
  formattedTotalDeposit: string;
}

/**
 * Hook for getting Superfluid account flow information for a jar
 */
export const useSuperfluidAccountInfo = (jarAddress: `0x${string}`) => {
  const { data: sf } = useSuperfluidFramework();

  return useQuery({
    queryKey: ['superfluidAccountInfo', jarAddress],
    queryFn: async (): Promise<SuperfluidAccountInfo | null> => {
      if (!sf) return null;

      try {
        // Superfluid SDK v0.9.0: Access via cfaV1 property
        const cfaV1 = sf.cfaV1;

        // Use a common super token address - ETHx on mainnet
        // In production, you'd want to query specific tokens the jar uses
        const superTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Placeholder

        // Get comprehensive account flow information
        // This gives us net flow rate, total deposit, owed deposit
        const accountFlowInfo = await cfaV1.getAccountFlowInfo({
          superToken: superTokenAddress,
          account: jarAddress,
          providerOrSigner: sf.settings.provider,
        });

        // Get net flow rate for the jar
        const netFlowRate = await cfaV1.getNetFlow({
          superToken: superTokenAddress,
          account: jarAddress,
          providerOrSigner: sf.settings.provider,
        });

        const info: SuperfluidAccountInfo = {
          netFlowRate: BigInt(netFlowRate),
          totalDeposit: BigInt(accountFlowInfo.deposit),
          owedDeposit: BigInt(accountFlowInfo.owedDeposit || 0),
          lastUpdated: Number(accountFlowInfo.timestamp) * 1000,
          formattedNetFlowRate: formatUnits(BigInt(netFlowRate), 18),
          formattedTotalDeposit: formatUnits(
            BigInt(accountFlowInfo.deposit),
            18
          ),
        };

        return info;
      } catch (error) {
        console.warn('Failed to fetch Superfluid account info:', error);
        return null;
      }
    },
    enabled: !!sf && !!jarAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry if it's a known issue
      if (error?.message?.includes('not supported')) return false;
      return failureCount < 3;
    },
  });
};
