"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useCookieJarConfig } from "@/hooks/jar/useJar";
import { useJarPermissions } from "@/hooks/jar/useJarPermissions";
import { useJarTransactions } from "@/hooks/jar/useJarTransactions";
import { AllowlistWithdrawalSection } from "@/components/jar/AllowlistWithdrawalSection";
import { NFTGatedWithdrawalSection } from "@/components/jar/NFTGatedWithdrawalSection";
import { CountdownTimer } from "@/components/jar/CountdownTimer";

export function JarWithdrawSection() {
  const params = useParams();
  const address = params.address as string;
  const addressString = address as `0x${string}`;

  const { config, refetch } = useCookieJarConfig(addressString);
  const permissions = useJarPermissions(addressString, config);
  const transactions = useJarTransactions(config, addressString);

  // Check if user is in cooldown period
  const isInCooldown = useMemo(() => {
    if (!config?.lastWithdrawalAllowlist || !config?.withdrawalInterval)
      return false;

    const now = Math.floor(Date.now() / 1000);
    const nextWithdrawalTime =
      Number(config.lastWithdrawalAllowlist) +
      Number(config.withdrawalInterval);
    return nextWithdrawalTime > now;
  }, [config?.lastWithdrawalAllowlist, config?.withdrawalInterval]);

  if (!config) return null;

  const { showUserFunctions, showNFTGatedFunctions } = permissions;
  const {
    withdrawPurpose,
    setWithdrawPurpose,
    withdrawAmount,
    setWithdrawAmount,
    gateAddress,
    setGateAddress,
    tokenId,
    setTokenId,
    handleWithdrawAllowlist,
    handleWithdrawAllowlistVariable,
    handleWithdrawNFT,
    handleWithdrawNFTVariable,
    isWithdrawAllowlistPending,
    isWithdrawNFTPending,
  } = transactions;

  return (
    <div className="relative">
      {/* Overlay for denylist */}
      {config.denylist ? (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-lg">
          <div className="bg-red-500 text-white font-medium px-6 py-2 rounded-full text-lg">
            You are Denylisted
          </div>
        </div>
      ) : isInCooldown ? (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-lg">
          <div className="w-full max-w-xl mx-auto bg-[#f8f5f0]/90 rounded-xl shadow-lg">
            <CountdownTimer
              lastWithdrawalTimestamp={Number(config.lastWithdrawalAllowlist)}
              interval={Number(config.withdrawalInterval)}
              onComplete={() => {
                // Refetch jar data when timer completes to update withdrawal availability
                refetch();
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Withdrawal content */}
      {showUserFunctions ? (
        <AllowlistWithdrawalSection
          config={{
            ...config,
            isWithdrawPending: isWithdrawAllowlistPending,
          }}
          withdrawPurpose={withdrawPurpose}
          setWithdrawPurpose={setWithdrawPurpose}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          handleWithdrawAllowlist={handleWithdrawAllowlist}
          handleWithdrawAllowlistVariable={handleWithdrawAllowlistVariable}
        />
      ) : showNFTGatedFunctions ? (
        <NFTGatedWithdrawalSection
          config={{
            ...config,
            isWithdrawPending: isWithdrawNFTPending,
          }}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          gateAddress={gateAddress}
          setGateAddress={setGateAddress}
          tokenId={tokenId}
          setTokenId={setTokenId}
          handleWithdrawNFT={handleWithdrawNFT}
          handleWithdrawNFTVariable={handleWithdrawNFTVariable}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-red-500 text-white font-medium px-6 py-2 rounded-full text-lg">
            Not Allowlisted
          </div>
        </div>
      )}
    </div>
  );
}
