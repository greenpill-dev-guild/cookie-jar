"use client";

import { AlertCircle, AlertTriangle, UserPlus } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { isAddress, keccak256, toHex } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNativeCurrency } from "@/config/supported-networks";
import { cookieJarAbi } from "@jar-core/generated";
import { useNavigateToTop } from "@/hooks/app/useNavigateToTop";
import { useToast } from "@jar-core/hooks/app/useToast";
import { useTransactionWithRetry } from "@jar-core/hooks/app/useTransactionWithRetry";
import { log } from "@jar-core/lib/app/logger";
import {
	ETH_ADDRESS,
	useTokenInfo,
} from "@jar-core/lib/blockchain/token-utils";
import { parseTokenAmount } from "@jar-core/lib/jar/creation-values";
import { useReadCookieJarHasRole } from "@jar-core/generated";
import { AllowlistManagement } from "./AllowListManagement";

interface AdminFunctionsProps {
	address: `0x${string}`;
	chainId: number;
	/** Access type label; allowlist management only applies to Allowlist jars */
	accessType?: string;
	/** Jar currency, pre-filled for emergency withdrawals */
	currency?: `0x${string}`;
}

// Hash the JAR_OWNER role
const JAR_OWNER_ROLE = keccak256(toHex("JAR_OWNER")) as `0x${string}`;

export const AdminFunctions: React.FC<AdminFunctionsProps> = ({
	address,
	accessType,
	currency,
	chainId,
}) => {
	const nativeCurrency = getNativeCurrency(chainId);
	const { scrollToTop } = useNavigateToTop();
	const isAllowlistJar = !accessType || accessType === "Allowlist";
	const [withdrawalAmount, setWithdrawalAmount] = useState("");
	const [tokenAddress, setTokenAddress] = useState(
		currency && currency.toLowerCase() !== ETH_ADDRESS.toLowerCase()
			? currency
			: ""
	);
	const [tokenToWithdraw, setTokenToWithdraw] = useState<`0x${string}`>(
		(currency ?? ETH_ADDRESS) as `0x${string}`
	);

	// Update emergency tokenToWithdraw when tokenAddress changes
	useEffect(() => {
		if (tokenAddress.length > 3) {
			setTokenToWithdraw(tokenAddress as `0x${string}`);
		} else {
			setTokenToWithdraw(ETH_ADDRESS as `0x${string}`);
		}
	}, [tokenAddress]);

	// Get token info including decimals and symbol
	const {
		symbol,
		decimals,
		error: tokenError,
	} = useTokenInfo(tokenToWithdraw, chainId);
	const { toast } = useToast();
	const account = useAccount();
	const currentUserAddress = account.address;
	const [withdrawalError, setWithdrawalError] = useState("");
	const confirmedHash = useRef<string>();

	// Check if current user has the JAR_OWNER role
	const { data: _hasJarOwnerRole } = useReadCookieJarHasRole({
		address,
		chainId,
		args: [
			JAR_OWNER_ROLE,
			currentUserAddress ||
				("0x0000000000000000000000000000000000000000" as `0x${string}`),
		],
	});

	// Emergency withdraw hook
	const emergency = useTransactionWithRetry({ maxRetries: 0 });
	const isEmergencyWithdrawSuccess = emergency.isSuccess;

	// Show success toasts
	useEffect(() => {
		if (
			isEmergencyWithdrawSuccess &&
			emergency.hash &&
			confirmedHash.current !== emergency.hash
		) {
			confirmedHash.current = emergency.hash;
			setWithdrawalAmount("");
			toast({
				title: "Emergency Withdrawal Complete",
				description: "Funds have been successfully withdrawn.",
			});
		}
	}, [isEmergencyWithdrawSuccess, emergency.hash, toast]);

	// Emergency withdraw function
	const handleEmergencyWithdraw = async () => {
		if (!withdrawalAmount) return;
		log.info("Emergency withdrawal amount", { withdrawalAmount });

		try {
			setWithdrawalError("");
			if (!isAddress(tokenToWithdraw))
				throw new Error("Enter a valid token address.");
			if (!account.isConnected || account.chainId !== chainId)
				throw new Error("Connect on the jar network.");
			const parsedAmount = parseTokenAmount(
				withdrawalAmount,
				tokenError ? undefined : decimals
			);
			if (parsedAmount === 0n)
				throw new Error("Enter an amount greater than zero.");

			await emergency.writeContract({
				abi: cookieJarAbi,
				functionName: "emergencyWithdraw",
				chainId,
				address: address,
				args: [tokenToWithdraw, parsedAmount],
			});

			toast({
				title: "Emergency Withdraw Initiated",
				description: `Attempting to withdraw ${withdrawalAmount} ${symbol || (tokenToWithdraw === ETH_ADDRESS ? "ETH" : "tokens")}.`,
			});
		} catch (error) {
			setWithdrawalError((error as Error).message);
			log.error("Emergency withdrawal error", { error });
			toast({
				title: "Emergency Withdraw Failed",
				description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				variant: "destructive",
			});
		}
	};

	return (
		<div className="space-y-6 bg-muted p-4 rounded-lg">
			<Tabs
				defaultValue="access"
				className="w-full"
				onValueChange={() => {
					// Scroll to top on tab change
					scrollToTop();
				}}
			>
				<TabsList className="mb-6 bg-muted p-1">
					<TabsTrigger
						value="access"
						className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm text-foreground"
					>
						<UserPlus className="h-4 w-4 mr-2" />
						Access Control
					</TabsTrigger>
					<TabsTrigger
						value="emergency"
						className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm text-foreground"
					>
						<AlertTriangle className="h-4 w-4 mr-2" />
						Emergency
					</TabsTrigger>
				</TabsList>

				<TabsContent value="access" className="mt-0">
					<Card className="border-none shadow-sm">
						<CardHeader className="bg-muted rounded-t-lg">
							<CardTitle className="text-xl text-foreground flex items-center">
								<UserPlus className="h-5 w-5 mr-2 text-primary" />
								Allowlist Management
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Control who can access and withdraw from this jar
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							{isAllowlistJar ? (
								<AllowlistManagement
									chainId={chainId}
									cookieJarAddress={address as `0x${string}`}
								/>
							) : (
								<p className="text-sm text-muted-foreground">
									This jar is gated by{" "}
									{accessType === "Hats" ? "a Hats Protocol hat" : "a token"}.
									Membership is managed on the gate contract, not on the jar:
									mint or revoke the {accessType === "Hats" ? "hat" : "token"}{" "}
									to change who can claim.
								</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="emergency" className="mt-0">
					<Card className="border-none shadow-sm">
						<CardHeader className="bg-muted rounded-t-lg">
							<CardTitle className="text-xl text-foreground flex items-center">
								<AlertTriangle className="h-5 w-5 mr-2 text-primary" />
								Emergency Withdrawal
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Withdraw funds in case of emergency
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="bg-warning/10 border border-warning/40 rounded-lg p-4 text-warning flex items-start">
									<AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
									<div>
										<p className="font-medium">Warning: Emergency Use Only</p>
										<p className="text-sm mt-1">
											Sends the entered amount of the chosen token from the jar
											to the caller (normally the jar's multi-sig). Use it to
											recover funds, not for regular claims.
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
									<div className="space-y-2">
										<label
											htmlFor="withdrawalAmount"
											className="text-primary font-medium"
										>
											Amount to Withdraw
										</label>
										<Input
											id="withdrawalAmount"
											placeholder="Amount"
											value={withdrawalAmount}
											onChange={(e) => setWithdrawalAmount(e.target.value)}
											className="border-border bg-card text-foreground"
										/>
									</div>

									<div className="space-y-2">
										<label
											htmlFor="tokenAddress"
											className="text-primary font-medium"
										>
											Token Address
										</label>
										<Input
											id="tokenAddress"
											placeholder="0x... (leave empty for ETH)"
											value={tokenAddress}
											onChange={(e) => setTokenAddress(e.target.value)}
											className="border-border bg-card text-foreground"
										/>
										<p className="text-sm text-muted-foreground">
											Leave blank if withdrawing {nativeCurrency.symbol}/native
											currency.
										</p>
									</div>
								</div>
							</div>
						</CardContent>
						<CardFooter className="bg-muted p-4 rounded-b-lg flex flex-col items-end gap-2">
							{emergency.error && (
								<Button variant="outline" onClick={emergency.retryConfirmation}>
									Retry confirmation check
								</Button>
							)}
							{(withdrawalError || emergency.error) && (
								<p role="alert" className="text-sm">
									{withdrawalError || emergency.error?.message}
								</p>
							)}
							{(emergency.isPending || emergency.isLoading) && (
								<p role="status">Waiting for transaction confirmation...</p>
							)}
							<Button
								onClick={handleEmergencyWithdraw}
								variant="destructive"
								className="bg-destructive hover:bg-destructive/90"
								disabled={
									!withdrawalAmount ||
									tokenError ||
									emergency.isPending ||
									emergency.isLoading
								}
							>
								<AlertTriangle className="h-4 w-4 mr-2" />
								Emergency Withdraw
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
