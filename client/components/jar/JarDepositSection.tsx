"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNativeCurrency } from "@/config/supported-networks";
import type { CookieJarConfig } from "@/hooks/jar/useJar";
import { ETH_ADDRESS, formatTokenAmount } from "@/lib/blockchain/token-utils";
import type { JarTransactions } from "./JarActionsTabs";

interface JarDepositSectionProps {
	config: CookieJarConfig;
	transactions: JarTransactions;
	chainId: number;
}

export function JarDepositSection({
	config,
	transactions,
	chainId,
}: JarDepositSectionProps) {
	const nativeCurrency = getNativeCurrency(chainId);
	const {
		amount,
		setAmount,
		onSubmit,
		isApprovalPending,
		isDepositPending,
		tokenSymbol,
		tokenDecimals,
	} = transactions;

	const isNativeCurrency =
		config.currency?.toLowerCase() === ETH_ADDRESS.toLowerCase();
	const minimum =
		config.minDeposit !== undefined && config.minDeposit > 0n
			? formatTokenAmount(config.minDeposit, tokenDecimals, tokenSymbol || "")
			: undefined;

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="md:col-span-2">
					<label
						htmlFor="fundAmount"
						className="block text-foreground font-medium mb-2"
					>
						Amount to deposit
					</label>
					<div className="bg-warning/10 border-l-4 border-warning p-3 mb-3 rounded flex items-start gap-2">
						<AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
						<p className="text-sm text-foreground">
							Only deposits made through this form count towards the jar
							balance. Never send tokens straight to the contract address.
						</p>
					</div>
					<Input
						id="fundAmount"
						type="text"
						inputMode="decimal"
						placeholder={
							isNativeCurrency
								? `0.1 ${nativeCurrency.symbol}`
								: `100 ${tokenSymbol || "tokens"}`
						}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className="border-border bg-card text-foreground"
					/>
					{minimum && (
						<p className="text-xs text-muted-foreground mt-2">
							Minimum deposit: {minimum}
						</p>
					)}
				</div>
				<div className="flex items-end">
					<Button
						onClick={() => onSubmit(amount)}
						className="w-full h-10"
						disabled={!amount || Number(amount) <= 0 || isDepositPending}
					>
						{isDepositPending ? "Depositing..." : "Deposit"}
					</Button>
				</div>
			</div>

			{!isNativeCurrency && (
				<p className="text-sm text-muted-foreground">
					Token deposits take two signatures: an approval, then the deposit. A
					multi-sig can batch both calls (approve, then deposit) in one
					transaction.
				</p>
			)}

			{isApprovalPending && (
				<div className="p-3 bg-muted rounded-lg text-foreground text-sm">
					Waiting for the token approval. Confirm it in your wallet.
				</div>
			)}
		</div>
	);
}
