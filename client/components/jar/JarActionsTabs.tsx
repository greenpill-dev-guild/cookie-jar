"use client";

import DefaultFeeCollector from "@/components/create/DefaultFeeCollector";
import { AdminFunctions } from "@/components/jar/AdminFunctions";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JarPermissions } from "@/hooks/jar/useJarPermissions";
import { JarDepositSection } from "./JarDepositSection";
import { JarWithdrawSection } from "./JarWithdrawSection";

interface JarActionsTabsProps {
	jarAddress: `0x${string}`;
	permissions: JarPermissions;
	onTabChange?: () => void;
	children?: React.ReactNode;
}

export function JarActionsTabs({
	jarAddress,
	permissions,
	onTabChange,
	children,
}: JarActionsTabsProps) {
	const { isAdmin, isFeeCollector } = permissions;

	return (
		<Tabs
			defaultValue={isAdmin ? "admin" : "withdraw"}
			className="w-full"
			onValueChange={onTabChange}
		>
			<TabsList className="mb-6 bg-[#fff8f0] p-1 w-full">
				{isAdmin && (
					<TabsTrigger
						value="admin"
						className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520] flex-1"
					>
						Admin Controls
					</TabsTrigger>
				)}
				<TabsTrigger
					value="withdraw"
					className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520] flex-1"
				>
					Get Cookie
				</TabsTrigger>
				<TabsTrigger
					value="deposit"
					className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520] flex-1"
				>
					Jar Deposit
				</TabsTrigger>

				{isFeeCollector && (
					<TabsTrigger
						value="feeCollector"
						className="data-[state=active]:bg-white data-[state=active]:text-[#ff5e14] data-[state=active]:shadow-sm text-[#4a3520] flex-1"
					>
						Fee Collector
					</TabsTrigger>
				)}
			</TabsList>

			{/* Deposit Tab */}
			<TabsContent value="deposit" className="mt-0">
				<Card className="border-none shadow-md">
					<CardHeader className="bg-[#fff8f0] rounded-t-lg">
						<CardTitle className="text-xl text-[#3c2a14]">
							Jar Deposit
						</CardTitle>
						<CardDescription className="text-[#8b7355]">
							All jar deposits are subject to a 1% fee
						</CardDescription>
					</CardHeader>
					<CardContent className="p-6">
						<JarDepositSection />
					</CardContent>
				</Card>
			</TabsContent>

			{/* Withdraw Tab */}
			<TabsContent value="withdraw" className="mt-0">
				<Card className="border-none shadow-md">
					<CardHeader className="bg-[#fff8f0] rounded-t-lg">
						<CardTitle className="text-xl text-[#3c2a14]">Get Cookie</CardTitle>
						<CardDescription className="text-[#8b7355]">
							Receive cookies from this jar
						</CardDescription>
					</CardHeader>
					<CardContent className="p-8 relative min-h-[400px]">
						<JarWithdrawSection />
					</CardContent>
				</Card>
			</TabsContent>

			{/* Admin Tab */}
			{isAdmin && (
				<TabsContent value="admin" className="mt-0">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-[#fff8f0] rounded-t-lg">
							<CardTitle className="text-xl text-[#3c2a14]">
								Admin Controls
							</CardTitle>
							<CardDescription className="text-[#8b7355]">
								Manage jar settings and access controls
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<AdminFunctions address={jarAddress} />
						</CardContent>
					</Card>
				</TabsContent>
			)}

			{/* Fee Collector Tab */}
			{isFeeCollector && (
				<TabsContent value="feeCollector" className="mt-0">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-[#fff8f0] rounded-t-lg">
							<CardTitle className="text-xl text-[#3c2a14]">
								Fee Collector Settings
							</CardTitle>
							<CardDescription className="text-[#8b7355]">
								Manage fee collection settings
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<DefaultFeeCollector contractAddress={jarAddress} />
						</CardContent>
					</Card>
				</TabsContent>
			)}

			{children}
		</Tabs>
	);
}
