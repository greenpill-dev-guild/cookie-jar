"use client";

import { useAccount } from "wagmi";
import DefaultFeeCollector from "@/components/create/DefaultFeeCollector";
import { AdminFunctions } from "@/components/jar/AdminFunctions";
import { JarRulesEditor } from "@/components/jar/JarRulesEditor";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isV2Chain } from "@/config/supported-networks";
import type { CookieJarConfig } from "@jar-core/hooks/jar/useJar";
import type { JarPermissions } from "@jar-core/hooks/jar/useJarPermissions";
import type { useJarTransactions } from "@jar-core/hooks/jar/useJarTransactions";
import { JarDepositSection } from "./JarDepositSection";
import { JarWithdrawSection } from "./JarWithdrawSection";

export type JarTransactions = ReturnType<typeof useJarTransactions>;

interface JarActionsTabsProps {
	jarAddress: `0x${string}`;
	chainId: number;
	config: CookieJarConfig;
	permissions: JarPermissions;
	transactions: JarTransactions;
	refetch: () => void;
	onTabChange?: () => void;
	children?: React.ReactNode;
}

const TAB_TRIGGER =
	"data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm text-foreground flex-1";

function depositCopy(feeBps: bigint | undefined): string {
	if (feeBps === undefined)
		return "Funds only count when they enter through this form.";
	if (feeBps === 0n) {
		return "No deposit fee. Funds only count when they enter through this form, never by a plain transfer.";
	}
	const percent = Number(feeBps) / 100;
	return `Deposits carry a ${percent}% fee. Funds only count when they enter through this form.`;
}

export function JarActionsTabs({
	jarAddress,
	chainId,
	config,
	permissions,
	transactions,
	refetch,
	onTabChange,
	children,
}: JarActionsTabsProps) {
	const { isAdmin, isFeeCollector } = permissions;
	const account = useAccount();
	const wrongNetwork = account.isConnected && account.chainId !== chainId;

	return (
		<Tabs
			defaultValue={isAdmin && !permissions.isEligible ? "admin" : "withdraw"}
			className="w-full"
			onValueChange={onTabChange}
		>
			<TabsList className="mb-6 bg-muted p-1 w-full">
				<TabsTrigger value="withdraw" className={TAB_TRIGGER}>
					Claim
				</TabsTrigger>
				<TabsTrigger value="deposit" className={TAB_TRIGGER}>
					Deposit
				</TabsTrigger>
				{isAdmin && (
					<TabsTrigger value="admin" className={TAB_TRIGGER}>
						Admin
					</TabsTrigger>
				)}
				{isFeeCollector && (
					<TabsTrigger value="feeCollector" className={TAB_TRIGGER}>
						Fee collector
					</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="withdraw" className="mt-0">
				<fieldset disabled={wrongNetwork} className="min-w-0">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-muted rounded-t-lg">
							<CardTitle className="text-xl text-foreground">Claim</CardTitle>
							<CardDescription className="text-muted-foreground">
								Claim your share from this jar
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6 md:p-8 relative min-h-[360px]">
							<JarWithdrawSection
								config={config}
								permissions={permissions}
								transactions={transactions}
								refetch={refetch}
							/>
						</CardContent>
					</Card>
				</fieldset>
			</TabsContent>

			<TabsContent value="deposit" className="mt-0">
				<fieldset disabled={wrongNetwork} className="min-w-0">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-muted rounded-t-lg">
							<CardTitle className="text-xl text-foreground">Deposit</CardTitle>
							<CardDescription className="text-muted-foreground">
								{depositCopy(config.feePercentageOnDeposit)}
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<JarDepositSection
								config={config}
								transactions={transactions}
								chainId={chainId}
							/>
						</CardContent>
					</Card>
				</fieldset>
			</TabsContent>

			{isAdmin && (
				<TabsContent value="admin" className="mt-0">
					<fieldset disabled={wrongNetwork} className="min-w-0">
						<Card className="border-none shadow-md">
							<CardHeader className="bg-muted rounded-t-lg">
								<CardTitle className="text-xl text-foreground">Admin</CardTitle>
								<CardDescription className="text-muted-foreground">
									Jar owner controls
								</CardDescription>
							</CardHeader>
							<CardContent className="p-6">
								{isV2Chain(chainId) && (
									<JarRulesEditor
										address={jarAddress}
										chainId={chainId}
										decimals={transactions.verifiedDecimals}
										withdrawalOption={config.withdrawalOption}
										onChange={refetch}
									/>
								)}
								<AdminFunctions
									chainId={chainId}
									address={jarAddress}
									accessType={config.accessType}
									currency={config.currency}
								/>
							</CardContent>
						</Card>
					</fieldset>
				</TabsContent>
			)}

			{isFeeCollector && (
				<TabsContent value="feeCollector" className="mt-0">
					<fieldset disabled={wrongNetwork} className="min-w-0">
						<Card className="border-none shadow-md">
							<CardHeader className="bg-muted rounded-t-lg">
								<CardTitle className="text-xl text-foreground">
									Fee collector settings
								</CardTitle>
								<CardDescription className="text-muted-foreground">
									Manage fee collection settings
								</CardDescription>
							</CardHeader>
							<CardContent className="p-6">
								<DefaultFeeCollector
									chainId={chainId}
									contractAddress={jarAddress}
								/>
							</CardContent>
						</Card>
					</fieldset>
				</TabsContent>
			)}

			{transactions.transactionError && (
				<div
					role="alert"
					className="p-4 bg-card border border-border rounded-lg space-y-2"
				>
					<p className="text-sm break-words">{transactions.transactionError}</p>
					<Button variant="outline" onClick={transactions.retryConfirmation}>
						Retry confirmation check
					</Button>
				</div>
			)}
			{children}
		</Tabs>
	);
}
