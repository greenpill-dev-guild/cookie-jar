"use client";

import type { JarMetadata } from "@jar-core/hooks/jar/useJarMetadata";
import type { JarPermissions } from "@jar-core/hooks/jar/useJarPermissions";
import { formatAddress } from "@jar-core/lib/app/utils";
import {
	copyToClipboard,
	formatJarBalance,
} from "@jar-core/lib/display/jar-display";
import {
	Clock,
	Coins,
	Copy,
	ExternalLink,
	ShieldAlert,
	Users,
} from "lucide-react";
import Image from "@/components/app/AppImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface JarConfig {
	accessType?: string;
	withdrawalInterval?: bigint;
	withdrawalOption?: string;
	fixedAmount?: bigint;
	maxWithdrawal?: bigint;
	balance?: bigint;
	currency?: string;
	allowlist?: boolean;
	denylist?: boolean;
	strictPurpose?: boolean;
	emergencyWithdrawalEnabled?: boolean;
}

interface JarDetailsCardProps {
	addressString: string;
	chainId: number;
	metadata: JarMetadata;
	config: JarConfig;
	permissions: JarPermissions;
	tokenSymbol?: string;
	tokenDecimals: number;
	onEditClick: () => void;
	toast: any;
}

export function JarDetailsCard({
	addressString,
	chainId,
	metadata,
	config,
	permissions,
	tokenSymbol,
	tokenDecimals,
	onEditClick,
	toast,
}: JarDetailsCardProps) {
	const { isAdmin, isFeeCollector, isEligible, eligibility } = permissions;
	const showUserFunctions = isEligible;
	const statusLabel =
		eligibility === "disconnected"
			? "Connect to check"
			: eligibility === "wears-hat"
				? "Wears the Team hat"
				: eligibility === "holds-nft"
					? "Holds the gate token"
					: eligibility === "allowlisted"
						? "Allowlisted"
						: "Not eligible";

	// Format balance for display
	const formattedBalance = formatJarBalance(
		config.balance,
		tokenDecimals,
		tokenSymbol,
		chainId
	);

	return (
		<Card className="shadow-lg bg-card border-none overflow-hidden">
			<CardContent className="p-4">
				<div className="space-y-4">
					{/* Jar Title and Description */}
					<div>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								{metadata.image && (
									<div className="relative w-16 h-16 mb-3">
										<Image
											src={metadata.image}
											alt={metadata.name}
											fill
											sizes="64px"
											className="rounded-lg object-cover"
											onError={(e) => {
												(e.target as HTMLImageElement).style.display = "none";
											}}
										/>
									</div>
								)}
								<div className="flex items-center gap-2">
									<h1 className="text-3xl font-bold text-foreground">
										{metadata.name}
									</h1>
									{metadata.link && (
										<a
											href={metadata.link}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Open jar playbook"
											className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
										>
											<ExternalLink className="w-5 h-5" />
										</a>
									)}
								</div>
								{metadata.description && (
									<p className="text-foreground mt-1">{metadata.description}</p>
								)}
								{!metadata.description && (
									<p className="text-foreground mt-1">Shared token pool</p>
								)}
							</div>
							{isAdmin && (
								<Button
									variant="outline"
									size="sm"
									onClick={onEditClick}
									className="ml-4 border-primary text-primary hover:bg-accent/10"
								>
									Edit Info
								</Button>
							)}
						</div>
					</div>

					{/* SIMPLIFIED: Focus on 5 Essential Details Only */}
					<div className="bg-muted border border-border p-4 sm:p-6 rounded-lg mb-4">
						{/* 1. BALANCE - Most Prominent */}
						<div className="text-center mb-6">
							<p className="text-foreground text-sm mb-1">Available Balance</p>
							<p className="text-primary font-bold text-3xl">
								{formattedBalance}
							</p>
						</div>

						{/* 2-5. Key Details Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
							{/* 2. Access Type */}
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-primary" />
								<div>
									<p className="text-foreground font-medium">Access</p>
									<p className="text-foreground">{config.accessType}</p>
								</div>
							</div>

							{/* 3. Your Status */}
							<div className="flex items-center gap-2">
								<ShieldAlert className="h-4 w-4 text-primary" />
								<div>
									<p className="text-foreground font-medium">Status</p>
									<p
										className={`font-medium ${isEligible ? "text-success" : eligibility === "disconnected" ? "text-muted-foreground" : "text-destructive"}`}
									>
										{statusLabel}
									</p>
								</div>
							</div>

							{/* 4. Withdrawal Rules - Simplified */}
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-primary" />
								<div>
									<p className="text-foreground font-medium">Rules</p>
									<p className="text-foreground">
										{config.withdrawalOption === "Fixed"
											? "Fixed Amount"
											: "Variable Amount"}
									</p>
								</div>
							</div>

							{/* 5. Contract - Minimized */}
							<div className="flex items-center gap-2">
								<ExternalLink className="h-4 w-4 text-primary" />
								<div>
									<p className="text-foreground font-medium">Contract</p>
									<div className="flex items-center gap-1">
										<p className="text-foreground font-mono text-xs">
											{formatAddress(addressString)}
										</p>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Copy jar address"
											onClick={() => copyToClipboard(addressString, toast)}
											className="shrink-0 text-primary hover:bg-accent/10 p-0"
										>
											<Copy className="h-3 w-3" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* User Status */}
					{(showUserFunctions || isAdmin || isFeeCollector) && (
						<div className="mt-6">
							<h2 className="text-base font-semibold text-foreground mb-2">
								Your Status
							</h2>
							<div className="flex flex-wrap gap-2">
								{config.denylist ? (
									<Badge
										variant="outline"
										className="flex items-center gap-1 bg-destructive/10 text-destructive border-destructive px-3 py-1"
									>
										<ShieldAlert className="h-3 w-3 mr-1" />
										Denylisted
									</Badge>
								) : (
									showUserFunctions && (
										<Badge
											variant="outline"
											className="flex items-center gap-1 bg-success/10 text-success border-success px-3 py-1"
										>
											<Users className="h-3 w-3 mr-1" />
											{statusLabel}
										</Badge>
									)
								)}
								{isFeeCollector && (
									<Badge
										variant="outline"
										className="flex items-center gap-1 bg-info/10 text-info border-info px-3 py-1"
									>
										<Coins className="h-3 w-3 mr-1" />
										Fee Collector
									</Badge>
								)}
								{isAdmin && (
									<Badge
										variant="outline"
										className="flex items-center gap-1 bg-primary/10 text-primary border-primary px-3 py-1"
									>
										<ShieldAlert className="h-3 w-3 mr-1" />
										Admin
									</Badge>
								)}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default JarDetailsCard;
