"use client";

import type { CookieJarConfig } from "@jar-core/hooks/jar/useJar";
import type { JarPermissions } from "@jar-core/hooks/jar/useJarPermissions";
import { formatTokenAmount } from "@jar-core/lib/blockchain/token-utils";
import { formatJarBalance } from "@jar-core/lib/display/jar-display";
import { BadgeCheck, Clock, ShieldAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CountdownTimer } from "./CountdownTimer";

interface ClaimStatusCardProps {
	config: CookieJarConfig;
	permissions: JarPermissions;
	tokenSymbol?: string;
	tokenDecimals: number;
	chainId: number;
	onCooldownComplete?: () => void;
}

function eligibilityCopy(permissions: JarPermissions): {
	label: string;
	tone: "good" | "bad" | "neutral";
} {
	switch (permissions.eligibility) {
		case "disconnected":
			return {
				label: "Connect your wallet to check your status",
				tone: "neutral",
			};
		case "allowlisted":
			return { label: "You're on the allowlist", tone: "good" };
		case "wears-hat":
			return { label: "You wear the Team hat", tone: "good" };
		case "holds-nft":
			return { label: "You hold the gate token", tone: "good" };
		default:
			if (permissions.isHatGated) {
				return { label: "You don't wear the Team hat", tone: "bad" };
			}
			if (permissions.isNftGated) {
				return { label: "You don't hold the gate token", tone: "bad" };
			}
			return { label: "You're not on the allowlist", tone: "bad" };
	}
}

function formatInterval(seconds: bigint | undefined): string {
	if (!seconds || seconds === 0n) return "no waiting period";
	const days = Number(seconds) / 86_400;
	if (days >= 1)
		return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
	const hours = Number(seconds) / 3_600;
	return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
}

export function ClaimStatusCard({
	config,
	permissions,
	tokenSymbol,
	tokenDecimals,
	chainId,
	onCooldownComplete,
}: ClaimStatusCardProps) {
	const balance = formatJarBalance(
		config.balance,
		tokenDecimals,
		tokenSymbol,
		chainId
	);
	const cap =
		config.withdrawalOption === "Fixed"
			? config.fixedAmount
			: config.maxWithdrawal;
	const formattedCap =
		cap !== undefined
			? formatTokenAmount(cap, tokenDecimals, tokenSymbol || "")
			: undefined;
	const status = eligibilityCopy(permissions);
	const now = Math.floor(Date.now() / 1000);
	const last = Number(config.lastWithdrawalTime ?? 0n);
	const interval = Number(config.withdrawalInterval ?? 0n);
	const inCooldown = last > 0 && interval > 0 && last + interval > now;

	return (
		<Card className="border-none shadow-md bg-card">
			<CardContent className="p-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<p className="text-sm text-muted-foreground mb-1">In the jar</p>
						<p className="text-3xl font-semibold text-foreground">{balance}</p>
						{formattedCap && (
							<p className="text-sm text-muted-foreground mt-1">
								Up to {formattedCap} per claim,{" "}
								{formatInterval(config.withdrawalInterval)} between claims
							</p>
						)}
					</div>

					<div>
						<p className="text-sm text-muted-foreground mb-2">Your status</p>
						<div className="flex flex-wrap gap-2">
							<Badge
								variant="outline"
								className={
									status.tone === "good"
										? "bg-success/10 text-success border-success px-3 py-1"
										: status.tone === "bad"
											? "bg-destructive/10 text-destructive border-destructive px-3 py-1"
											: "bg-muted text-muted-foreground border-border px-3 py-1"
								}
							>
								{status.tone === "good" ? (
									<BadgeCheck className="h-3.5 w-3.5 mr-1" />
								) : status.tone === "bad" ? (
									<ShieldAlert className="h-3.5 w-3.5 mr-1" />
								) : (
									<Wallet className="h-3.5 w-3.5 mr-1" />
								)}
								{status.label}
							</Badge>
							{permissions.isAdmin && (
								<Badge
									variant="outline"
									className="bg-warning/10 text-warning border-warning px-3 py-1"
								>
									Jar admin
								</Badge>
							)}
						</div>
						{permissions.isHatGated && config.nftRequirement && (
							<p className="text-xs text-muted-foreground mt-2 break-all">
								Team hat #
								{config.nftRequirement.tokenId.toString(16).replace(/0+$/, "")}
							</p>
						)}
					</div>

					<div>
						<p className="text-sm text-muted-foreground mb-2">Next claim</p>
						{inCooldown ? (
							<CountdownTimer
								lastWithdrawalTimestamp={last}
								interval={interval}
								onComplete={onCooldownComplete}
								compact
							/>
						) : (
							<p className="flex items-center gap-2 text-foreground font-medium">
								<Clock className="h-4 w-4 text-primary" />
								{permissions.isEligible
									? "Available now"
									: "Available once you're eligible"}
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
