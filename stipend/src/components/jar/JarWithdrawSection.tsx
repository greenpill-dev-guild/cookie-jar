"use client";

import type { CookieJarConfig } from "@jar-core/hooks/jar/useJar";
import type { JarPermissions } from "@jar-core/hooks/jar/useJarPermissions";
import { useMemo } from "react";
import { AllowlistWithdrawalSection } from "@/components/jar/AllowlistWithdrawalSection";
import { CountdownTimer } from "@/components/jar/CountdownTimer";
import { NFTGatedWithdrawalSection } from "@/components/jar/NFTGatedWithdrawalSection";
import { isV2Chain } from "@/config/supported-networks";
import type { JarTransactions } from "./JarActionsTabs";

interface JarWithdrawSectionProps {
	config: CookieJarConfig;
	permissions: JarPermissions;
	transactions: JarTransactions;
	refetch: () => void;
}

function notEligibleCopy(permissions: JarPermissions): string {
	if (permissions.eligibility === "disconnected") {
		return "Connect your wallet to see whether you can claim.";
	}
	if (permissions.isHatGated) {
		return "You don't wear the Team hat. Membership is managed in Hats Protocol; ask the steward if you should be on the roster.";
	}
	if (permissions.isNftGated) {
		return "You don't hold the token this jar is gated on.";
	}
	return "You're not on this jar's allowlist.";
}

export function JarWithdrawSection({
	config,
	permissions,
	transactions,
	refetch,
}: JarWithdrawSectionProps) {
	const isInCooldown = useMemo(() => {
		if (!config.lastWithdrawalTime || !config.withdrawalInterval) return false;
		const now = Math.floor(Date.now() / 1000);
		return (
			Number(config.lastWithdrawalTime) + Number(config.withdrawalInterval) >
			now
		);
	}, [config.lastWithdrawalTime, config.withdrawalInterval]);

	const isV2 = isV2Chain(config.chainId);
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
		isWithdrawPending,
	} = transactions;

	const claimConfig = { ...config, isWithdrawPending };

	return (
		<div className="relative">
			{isInCooldown && (
				<div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-b-lg">
					<div className="w-full max-w-xl mx-auto bg-card/95 rounded-xl shadow-lg">
						<CountdownTimer
							lastWithdrawalTimestamp={Number(config.lastWithdrawalTime)}
							interval={Number(config.withdrawalInterval)}
							onComplete={refetch}
						/>
					</div>
				</div>
			)}

			<fieldset disabled={isInCooldown} className="min-w-0">
				{permissions.isEligible ? (
					<AllowlistWithdrawalSection
						config={claimConfig}
						withdrawPurpose={withdrawPurpose}
						setWithdrawPurpose={setWithdrawPurpose}
						withdrawAmount={withdrawAmount}
						setWithdrawAmount={setWithdrawAmount}
						handleWithdrawAllowlist={handleWithdrawAllowlist}
						handleWithdrawAllowlistVariable={handleWithdrawAllowlistVariable}
					/>
				) : !isV2 && permissions.isNftGated ? (
					<NFTGatedWithdrawalSection
						config={claimConfig}
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
					<div className="flex flex-col items-center justify-center py-16 text-center gap-3">
						<div className="bg-muted text-foreground border border-border font-medium px-5 py-2 rounded-full">
							{permissions.eligibility === "disconnected"
								? "Wallet not connected"
								: "Not eligible to claim"}
						</div>
						<p className="text-sm text-muted-foreground max-w-md">
							{notEligibleCopy(permissions)}
						</p>
					</div>
				)}
			</fieldset>
		</div>
	);
}
