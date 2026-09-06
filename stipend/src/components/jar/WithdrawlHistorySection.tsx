"use client";

import { ExternalLink } from "lucide-react";
import type React from "react";
import type { Address } from "viem";
import type { JarWithdrawalRecord } from "@jar-core/hooks/jar/useJarWithdrawalHistory";
import { formatAddress } from "@jar-core/lib/app/utils";
import {
	getExplorerAddressUrl,
	getExplorerTxUrl,
	hasExplorer,
} from "@jar-core/lib/blockchain/networks";
import {
	ETH_ADDRESS,
	formatTokenAmount,
	useTokenInfo,
} from "@jar-core/lib/blockchain/token-utils";

/** Kept for callers that still pass simple records */
export interface Withdrawal {
	amount: bigint;
	purpose: string;
	recipient: string;
}

interface WithdrawalHistorySectionProps {
	records: JarWithdrawalRecord[];
	isSupported: boolean;
	isLoading?: boolean;
	error?: Error | null;
	jarAddress: `0x${string}`;
	chainId: number;
	tokenAddress?: Address;
}

export const WithdrawalHistorySection: React.FC<
	WithdrawalHistorySectionProps
> = ({
	records,
	isSupported,
	isLoading = false,
	error = null,
	jarAddress,
	chainId,
	tokenAddress = ETH_ADDRESS,
}) => {
	const { symbol: tokenSymbol, decimals: tokenDecimals } =
		useTokenInfo(tokenAddress);
	const explorer = hasExplorer(chainId);

	if (!isSupported) {
		return (
			<div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border text-sm">
				Claim history is only reconstructed for token jars.{" "}
				{explorer ? (
					<a
						href={getExplorerAddressUrl(jarAddress, chainId)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline underline-offset-2"
					>
						Open the jar on the explorer
					</a>
				) : (
					"Check the local chain logs instead."
				)}
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border text-sm">
				Reading claims from the chain...
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8 text-destructive bg-destructive/10 rounded-lg border border-destructive/40 text-sm">
				Could not load the claim history: {error.message}
			</div>
		);
	}

	if (records.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border">
				No claims yet
			</div>
		);
	}

	return (
		<ul className="space-y-3">
			{records.map((record) => (
				<li
					key={`${record.txHash}-${record.recipient}-${record.amount.toString()}`}
					className="border border-border p-4 rounded-lg bg-muted"
				>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
						<div>
							<p className="text-muted-foreground">Amount</p>
							<p className="font-medium text-foreground">
								{formatTokenAmount(
									record.amount,
									tokenDecimals,
									tokenSymbol,
									6
								)}
							</p>
						</div>
						<div className="md:col-span-2">
							<p className="text-muted-foreground">
								{record.kind === "emergency" ? "Emergency withdrawal" : "Note"}
							</p>
							<p className="text-foreground break-words">
								{record.kind === "emergency"
									? "Withdrawn by the jar owner"
									: record.purpose || "No note recorded"}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">Recipient</p>
							<p className="text-foreground font-mono text-xs">
								{formatAddress(record.recipient)}
							</p>
							{explorer && (
								<a
									href={getExplorerTxUrl(record.txHash, chainId)}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-primary mt-1"
								>
									Transaction <ExternalLink className="h-3 w-3" />
								</a>
							)}
						</div>
					</div>
				</li>
			))}
		</ul>
	);
};
