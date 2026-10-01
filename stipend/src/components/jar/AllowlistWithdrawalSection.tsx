"use client";

import {
	checkDecimals,
	ETH_ADDRESS,
	formatTokenAmount,
	useTokenInfo,
} from "@jar-core/lib/blockchain/token-utils";
import { ArrowUpToLine } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PURPOSE_MIN_LENGTH = 27;
const PURPOSE_HINT =
	"At least 27 characters. Paste the Linear ledger or issue link plus a short note.";
const PURPOSE_PLACEHOLDER =
	"July 2026 stipend: https://linear.app/greenpill-dev-guild/... plus a short note";

/** Count Unicode code points to match Solidity's countUnicodeCodePoints().
 *  Uses the string iterator which yields one value per code point (handles surrogate pairs). */
export function unicodeCodePointLength(str: string): number {
	return [...str].length;
}

function PurposeHelp({ purpose }: { purpose: string }) {
	const length = unicodeCodePointLength(purpose);
	const missingLink = purpose.length > 0 && !/linear\.app/i.test(purpose);
	return (
		<div className="flex flex-col gap-1 text-sm">
			<p className="text-muted-foreground">{PURPOSE_HINT}</p>
			<p
				className={
					length < PURPOSE_MIN_LENGTH ? "text-muted-foreground" : "text-success"
				}
				aria-live="polite"
			>
				{length}/{PURPOSE_MIN_LENGTH} characters
			</p>
			{missingLink && (
				<p className="text-warning">
					No Linear link yet. Claims without one are flagged in the steward
					review.
				</p>
			)}
		</div>
	);
}

interface AllowlistWithdrawalSectionProps {
	config: any; // jar config plus isWithdrawPending
	withdrawPurpose: string;
	setWithdrawPurpose: (value: string) => void;
	withdrawAmount: string;
	setWithdrawAmount: (value: string) => void;
	handleWithdrawAllowlist: () => void;
	handleWithdrawAllowlistVariable: () => void;
}

/**
 * Claim form for eligible members (allowlist or token gate). The transaction hook picks
 * the right jar function; this component only collects amount and note.
 */
export const AllowlistWithdrawalSection: React.FC<
	AllowlistWithdrawalSectionProps
> = ({
	config,
	withdrawPurpose,
	setWithdrawPurpose,
	withdrawAmount,
	setWithdrawAmount,
	handleWithdrawAllowlist,
	handleWithdrawAllowlistVariable,
}) => {
	const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenInfo(
		config?.currency || ETH_ADDRESS,
		config.chainId
	);
	const [amountError, setAmountError] = React.useState<string | null>(null);

	const purposeOk =
		!config.strictPurpose ||
		(!!withdrawPurpose &&
			unicodeCodePointLength(withdrawPurpose) >= PURPOSE_MIN_LENGTH);
	const fixedLabel = config.fixedAmount
		? formatTokenAmount(BigInt(config.fixedAmount), tokenDecimals, tokenSymbol)
		: `0 ${tokenSymbol}`;
	const maxLabel = config.maxWithdrawal
		? formatTokenAmount(
				BigInt(config.maxWithdrawal),
				tokenDecimals,
				tokenSymbol
			)
		: `0 ${tokenSymbol}`;
	const pendingButton = (
		<>
			<span className="animate-spin mr-2">⟳</span>
			Sending...
		</>
	);

	if (config.withdrawalOption === "Fixed") {
		return (
			<div className="space-y-6 py-4">
				<p className="text-foreground font-medium text-lg text-center">
					You can claim a fixed amount of {fixedLabel} from this jar.
				</p>
				{Number(config.lastWithdrawalTime ?? 0) > 0 && (
					<p className="text-sm text-muted-foreground text-center">
						After a claim, a waiting period applies before you can claim again.
					</p>
				)}

				{config.strictPurpose && (
					<div className="space-y-3">
						<label
							htmlFor="withdrawPurpose"
							className="block text-foreground font-medium"
						>
							Claim note
						</label>
						<Textarea
							id="withdrawPurpose"
							placeholder={PURPOSE_PLACEHOLDER}
							value={withdrawPurpose}
							onChange={(e) => setWithdrawPurpose(e.target.value)}
							className="min-h-28 border-border bg-card text-foreground"
						/>
						<PurposeHelp purpose={withdrawPurpose} />
					</div>
				)}

				<div className="pt-2 flex justify-center">
					<Button
						onClick={() => handleWithdrawAllowlist()}
						className="px-8 py-6 text-lg"
						disabled={!purposeOk || config.isWithdrawPending}
					>
						{config.isWithdrawPending ? (
							pendingButton
						) : (
							<>
								<ArrowUpToLine className="h-5 w-5 mr-2" />
								Claim {fixedLabel}
							</>
						)}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label
					htmlFor="withdrawAmount"
					className="block text-foreground font-medium"
				>
					Claim amount
				</label>
				<Input
					id="withdrawAmount"
					type="text"
					inputMode="decimal"
					placeholder={`Up to ${maxLabel}`}
					value={withdrawAmount}
					onChange={(e) => {
						const result = checkDecimals(e.target.value, tokenDecimals);
						setAmountError(result.error);
						if (result.value !== null) {
							setWithdrawAmount(result.value);
						}
					}}
					className={`border-border bg-card text-foreground ${amountError ? "border-destructive" : ""}`}
				/>
				{amountError ? (
					<p className="text-sm text-destructive">{amountError}</p>
				) : (
					<p className="text-sm text-muted-foreground">
						Up to {maxLabel} per claim
					</p>
				)}
			</div>

			{config.strictPurpose && (
				<div className="space-y-2">
					<label
						htmlFor="withdrawPurpose"
						className="block text-foreground font-medium"
					>
						Claim note
					</label>
					<Textarea
						id="withdrawPurpose"
						placeholder={PURPOSE_PLACEHOLDER}
						value={withdrawPurpose}
						onChange={(e) => setWithdrawPurpose(e.target.value)}
						className="min-h-28 border-border bg-card text-foreground"
					/>
					<PurposeHelp purpose={withdrawPurpose} />
				</div>
			)}

			<div className="pt-2">
				<Button
					onClick={() => handleWithdrawAllowlistVariable()}
					className="w-full"
					disabled={
						!withdrawAmount ||
						Number(withdrawAmount) <= 0 ||
						!!amountError ||
						!purposeOk ||
						config.isWithdrawPending
					}
				>
					{config.isWithdrawPending ? (
						pendingButton
					) : (
						<>
							<ArrowUpToLine className="h-4 w-4 mr-2" />
							Claim {withdrawAmount || "0"} {tokenSymbol}
						</>
					)}
				</Button>
			</div>
		</div>
	);
};
