"use client";

import { AlertCircle, AlertTriangle, UserPlus } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { keccak256, toHex } from "viem";
import { useAccount, useChainId } from "wagmi";
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
import { useNavigateToTop } from "@/hooks/app/useNavigateToTop";
import { useToast } from "@/hooks/app/useToast";
import { log } from "@/lib/app/logger";
import {
	ETH_ADDRESS,
	parseTokenAmount,
	useTokenInfo,
} from "@/lib/blockchain/token-utils";
import {
	useReadCookieJarHasRole,
	useWriteCookieJarEmergencyWithdraw,
} from "../../generated";
import { AllowlistManagement } from "./AllowListManagement";

interface AdminFunctionsProps {
	address: `0x${string}`;
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
}) => {
	const chainId = useChainId();
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
	const { symbol, decimals } = useTokenInfo(tokenToWithdraw);
	const { toast } = useToast();
	const { address: currentUserAddress } = useAccount();

	// Check if current user has the JAR_OWNER role
	const { data: _hasJarOwnerRole } = useReadCookieJarHasRole({
		address,
		args: [
			JAR_OWNER_ROLE,
			currentUserAddress ||
				("0x0000000000000000000000000000000000000000" as `0x${string}`),
		],
	});

	// Emergency withdraw hook
	const {
		writeContract: emergencyWithdraw,
		isSuccess: isEmergencyWithdrawSuccess,
	} = useWriteCookieJarEmergencyWithdraw();

	// Show success toasts
	useEffect(() => {
		if (isEmergencyWithdrawSuccess) {
			toast({
				title: "Emergency Withdrawal Complete",
				description: "Funds have been successfully withdrawn.",
			});
		}
	}, [isEmergencyWithdrawSuccess, toast]);

	// Emergency withdraw function
	const handleEmergencyWithdraw = () => {
		if (!withdrawalAmount) return;
		log.info("Emergency withdrawal amount", { withdrawalAmount });

		try {
			const parsedAmount = parseTokenAmount(withdrawalAmount, decimals);

			emergencyWithdraw({
				address: address,
				args: [tokenToWithdraw, parsedAmount],
			});

			toast({
				title: "Emergency Withdraw Initiated",
				description: `Attempting to withdraw ${withdrawalAmount} ${symbol || (tokenToWithdraw === ETH_ADDRESS ? "ETH" : "tokens")}.`,
			});
		} catch (error) {
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
						<CardFooter className="bg-muted p-4 rounded-b-lg flex justify-end">
							<Button
								onClick={handleEmergencyWithdraw}
								variant="destructive"
								className="bg-destructive hover:bg-destructive/90"
								disabled={!withdrawalAmount}
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
