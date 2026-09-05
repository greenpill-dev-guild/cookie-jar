"use client";

import { useEffect, useRef, useState } from "react";
import { type Address, formatUnits } from "viem";
import { useReadContracts } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cookieJarAbi } from "@/generated";
import { useTransactionWithRetry } from "@/hooks/app/useTransactionWithRetry";
import { daysToSeconds, parseTokenAmount } from "@/lib/jar/creation-values";

export function JarRulesEditor({
	address,
	chainId,
	decimals,
	withdrawalOption,
	onChange,
}: {
	address: Address;
	chainId: number;
	decimals: number | undefined;
	withdrawalOption: string | undefined;
	onChange: () => void;
}) {
	const fixed = withdrawalOption === "Fixed";
	const { data, refetch } = useReadContracts({
		contracts: [
			{
				address,
				chainId,
				abi: cookieJarAbi,
				functionName: fixed ? "fixedAmount" : "maxWithdrawal",
			},
			{
				address,
				chainId,
				abi: cookieJarAbi,
				functionName: "withdrawalInterval",
			},
			{ address, chainId, abi: cookieJarAbi, functionName: "paused" },
		],
	});
	const [maximum, setMaximum] = useState("");
	const [interval, setInterval] = useState("");
	const [message, setMessage] = useState("");
	const transaction = useTransactionWithRetry({ maxRetries: 0 });
	const confirmedHash = useRef<string>();
	useEffect(() => {
		if (data?.[0]?.result !== undefined && decimals !== undefined)
			setMaximum(formatUnits(data[0].result, decimals));
		if (data?.[1]?.result !== undefined)
			setInterval(String(Number(data[1].result) / 86400));
	}, [data?.[0]?.result, data?.[1]?.result, decimals]);
	useEffect(() => {
		if (
			transaction.isSuccess &&
			transaction.hash &&
			confirmedHash.current !== transaction.hash
		) {
			confirmedHash.current = transaction.hash;
			refetch();
			onChange();
			setMessage("Jar settings updated.");
		}
	}, [transaction.isSuccess, transaction.hash, refetch, onChange]);
	async function update(kind: "maximum" | "interval" | "pause") {
		try {
			let call;
			if (kind === "maximum") {
				const amount = parseTokenAmount(maximum, decimals);
				if (amount === 0n)
					throw new Error("Enter a maximum greater than zero.");
				call = {
					functionName: fixed
						? "updateFixedWithdrawalAmount"
						: "updateMaxWithdrawalAmount",
					args: [amount],
				};
			} else if (kind === "interval")
				call = {
					functionName: "updateWithdrawalInterval",
					args: [daysToSeconds(interval)],
				};
			else call = { functionName: data?.[2]?.result ? "unpause" : "pause" };
			await transaction.writeContract({
				address,
				abi: cookieJarAbi,
				chainId,
				...call,
			});
		} catch (error) {
			setMessage((error as Error).message);
		}
	}
	return (
		<fieldset
			disabled={transaction.isPending || transaction.isLoading}
			className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4"
		>
			<legend className="px-2 font-semibold">Claim rules</legend>
			<div>
				<Label htmlFor="admin-maximum">
					{fixed ? "Amount per claim" : "Maximum per claim"}
				</Label>
				<Input
					id="admin-maximum"
					inputMode="decimal"
					value={maximum}
					onChange={(event) => setMaximum(event.target.value)}
				/>
				<Button
					className="mt-2"
					disabled={decimals === undefined || !withdrawalOption}
					onClick={() => update("maximum")}
				>
					{fixed ? "Update amount" : "Update maximum"}
				</Button>
			</div>
			<div>
				<Label htmlFor="admin-interval">Claim interval (days)</Label>
				<Input
					id="admin-interval"
					inputMode="numeric"
					value={interval}
					onChange={(event) => setInterval(event.target.value)}
				/>
				<Button className="mt-2" onClick={() => update("interval")}>
					Update interval
				</Button>
			</div>
			<Button
				variant="outline"
				disabled={data?.[2]?.result === undefined}
				onClick={() => update("pause")}
			>
				{data?.[2]?.result ? "Unpause jar" : "Pause jar"}
			</Button>
			{(transaction.isPending || transaction.isLoading) && (
				<p role="status">Waiting for transaction confirmation...</p>
			)}
			{(transaction.error || message) && (
				<p role="status" className="text-sm text-foreground">
					{transaction.error?.message || message}
				</p>
			)}
		</fieldset>
	);
}
