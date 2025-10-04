"use client";

import { useParams } from "next/navigation";
import { useRef } from "react";
import { useChainId } from "wagmi";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { JarActionsTabs } from "@/components/jar/JarActionsTabs";
// Components
import { JarDetailsCard } from "@/components/jar/JarDetailsCard";
import { JarMetadataEditor } from "@/components/jar/JarMetadataEditor";
import {
	type Withdrawal,
	WithdrawalHistorySection,
} from "@/components/jar/WithdrawlHistorySection";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useNavigateToTop } from "@/hooks/app/useNavigateToTop";
import { useToast } from "@/hooks/app/useToast";
// Hooks
import { useCookieJarConfig } from "@/hooks/jar/useJar";
import { useJarMetadata } from "@/hooks/jar/useJarMetadata";
import { useJarPermissions } from "@/hooks/jar/useJarPermissions";
import { useJarTransactions } from "@/hooks/jar/useJarTransactions";

// Utils
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";

export default function CookieJarPage() {
	const params = useParams();
	const { toast } = useToast();
	const { scrollToTop } = useNavigateToTop();
	const chainId = useChainId();
	const pageRef = useRef<HTMLDivElement>(null);

	const address = params.address as string;
	const addressString = address as `0x${string}`;

	const isValidAddress =
		typeof address === "string" && address.startsWith("0x");

	// Core jar configuration
	const { config, isLoading, hasError, errors, refetch } = useCookieJarConfig(
		isValidAddress
			? addressString
			: "0x0000000000000000000000000000000000000000",
	);

	// Extract hooks
	const permissions = useJarPermissions(
		isValidAddress ? addressString : undefined,
		config,
	);

	const metadata = useJarMetadata(config);

	const transactions = useJarTransactions(config, addressString);

	// Handle invalid address
	if (!isValidAddress) {
		return (
			<div className="container max-w-3xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
				<h2 className="text-xl font-bold text-red-700 mb-4">Invalid Address</h2>
				<p className="text-red-600">
					No valid address was provided. Please check the URL and try again.
				</p>
			</div>
		);
	}

	// Handle loading state
	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff5e14]"></div>
			</div>
		);
	}

	// Handle error state
	if (hasError || !config) {
		return (
			<div className="container max-w-3xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
				<h2 className="text-xl font-bold text-red-700 mb-4">
					Error Loading Configuration
				</h2>
				{errors && (
					<ul className="list-disc pl-5 text-red-600">
						{errors
							.filter((error): error is any => error !== null)
							.map((error: any, index) => (
								<li key={index}>{error.message || "Unknown error"}</li>
							))}
					</ul>
				)}
			</div>
		);
	}

	const isERC20 = config.currency && config.currency !== ETH_ADDRESS;

	return (
		<ProtocolErrorBoundary protocolName="Cookie Jar" maxRetries={2}>
			<div className="container max-w-full px-4 md:px-8 py-8" ref={pageRef}>
				<div className="grid grid-cols-1 lg:grid-cols-20 gap-6">
					{/* Left sidebar with jar details */}
					<div className="lg:col-span-11">
						<JarDetailsCard
							addressString={addressString}
							chainId={chainId}
							metadata={metadata.metadata}
							config={config}
							permissions={permissions}
							tokenSymbol={transactions.tokenSymbol}
							tokenDecimals={transactions.tokenDecimals}
							onEditClick={metadata.startEditing}
							toast={toast}
						/>
					</div>

					{/* Right side - Jar Actions */}
					<div className="lg:col-span-9">
						<JarActionsTabs
							jarAddress={addressString}
							permissions={permissions}
							onTabChange={scrollToTop}
						/>
					</div>
				</div>

				{/* Withdrawal History Section */}
				<div className="mt-8">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-[#fff8f0] rounded-t-lg">
							<CardTitle className="text-xl text-[#3c2a14]">
								Withdrawal History
							</CardTitle>
							<CardDescription className="text-[#8b7355]">
								Past withdrawals from this cookie jar
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<WithdrawalHistorySection
								pastWithdrawals={
									config.pastWithdrawals
										? ([...config.pastWithdrawals] as Withdrawal[])
										: undefined
								}
								tokenAddress={
									isERC20 && config.currency ? config.currency : ETH_ADDRESS
								}
							/>
						</CardContent>
					</Card>
				</div>

				{/* Metadata Editing Modal */}
				<JarMetadataEditor
					isEditingMetadata={metadata.isEditingMetadata}
					setIsEditingMetadata={metadata.setIsEditingMetadata}
					editName={metadata.editName}
					setEditName={metadata.setEditName}
					editImage={metadata.editImage}
					setEditImage={metadata.setEditImage}
					editLink={metadata.editLink}
					setEditLink={metadata.setEditLink}
					editDescription={metadata.editDescription}
					setEditDescription={metadata.setEditDescription}
					onSave={() => metadata.handleMetadataUpdate(addressString, refetch)}
					isUpdatingMetadata={metadata.isUpdatingMetadata}
				/>
			</div>
		</ProtocolErrorBoundary>
	);
}
