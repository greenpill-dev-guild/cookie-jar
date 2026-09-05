"use client";

import { useEffect, useRef } from "react";
import { ProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { WrongNetworkBanner } from "@/components/app/WrongNetworkBanner";
import { ClaimStatusCard } from "@/components/jar/ClaimStatusCard";
import { JarActionsTabs } from "@/components/jar/JarActionsTabs";
import { JarDetailsCard } from "@/components/jar/JarDetailsCard";
import { JarMetadataEditor } from "@/components/jar/JarMetadataEditor";
import { WithdrawalHistorySection } from "@/components/jar/WithdrawlHistorySection";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useNavigateToTop } from "@/hooks/app/useNavigateToTop";
import { useToast } from "@/hooks/app/useToast";
import { useCookieJarConfig } from "@/hooks/jar/useJar";
import { useJarMetadata } from "@/hooks/jar/useJarMetadata";
import { useJarPermissions } from "@/hooks/jar/useJarPermissions";
import { useJarTransactions } from "@/hooks/jar/useJarTransactions";
import { useJarWithdrawalHistory } from "@/hooks/jar/useJarWithdrawalHistory";
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";

interface JarPageContentProps {
	address: `0x${string}`;
	chainId: number;
	/** First block to scan for history; defaults to the factory deployment block */
	fromBlock?: bigint;
	/** Home-page mode: status card first, jar-centric copy */
	featured?: boolean;
}

/**
 * The full single-jar experience, shared by the home page (featured jar) and /jar/[address].
 */
export function JarPageContent({
	address,
	chainId,
	fromBlock,
	featured = false,
}: JarPageContentProps) {
	const { toast } = useToast();
	const { scrollToTop } = useNavigateToTop();
	const pageRef = useRef<HTMLDivElement>(null);

	const { config, isLoading, hasError, errors, refetch } = useCookieJarConfig(
		address,
		chainId
	);
	const permissions = useJarPermissions(address, config, chainId);
	const metadata = useJarMetadata(config);
	const transactions = useJarTransactions(config, address, { chainId });
	const history = useJarWithdrawalHistory({
		jarAddress: address,
		currency: config.currency,
		chainId,
		fromBlock,
	});

	// A successful claim or deposit changes the balance and the history
	const claimSuccess = transactions.withdrawAllowlist.isSuccess;
	const depositSuccess =
		transactions.depositETH.isSuccess || transactions.depositCurrency.isSuccess;
	useEffect(() => {
		if (claimSuccess || depositSuccess) {
			refetch();
			history.refetch();
		}
		// history.refetch is stable enough for this purpose
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [claimSuccess, depositSuccess, refetch]);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-[50vh]">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
			</div>
		);
	}

	if (hasError || config.accessType === undefined) {
		return (
			<div className="container max-w-3xl mx-auto mt-8 p-6 bg-destructive/10 border border-destructive/40 rounded-lg">
				<h1 className="text-xl font-bold text-destructive mb-4">
					Could not load this jar
				</h1>
				<p className="text-foreground text-sm">
					The jar at {address} did not answer on this network. Check the address
					and the network, then try again.
				</p>
				{errors.length > 0 && (
					<ul className="list-disc pl-5 text-destructive text-sm mt-3">
						{errors.map((error, index) => (
							<li key={index}>
								{error instanceof Error ? error.message : "Unknown error"}
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}

	const isERC20 = !!config.currency && config.currency !== ETH_ADDRESS;

	return (
		<ProtocolErrorBoundary protocolName="Cookie Jar" maxRetries={2}>
			<div className="container max-w-full px-0 md:px-4 py-4" ref={pageRef}>
				<WrongNetworkBanner chainId={chainId} />

				{featured && (
					<div className="mb-6">
						<ClaimStatusCard
							config={config}
							permissions={permissions}
							tokenSymbol={transactions.tokenSymbol}
							tokenDecimals={transactions.tokenDecimals}
							chainId={chainId}
							onCooldownComplete={refetch}
						/>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-20 gap-6">
					<div className="lg:col-span-11">
						<JarDetailsCard
							addressString={address}
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

					<div className="lg:col-span-9">
						<JarActionsTabs
							jarAddress={address}
							chainId={chainId}
							config={config}
							permissions={permissions}
							transactions={transactions}
							refetch={refetch}
							onTabChange={scrollToTop}
						/>
					</div>
				</div>

				<div className="mt-8">
					<Card className="border-none shadow-md">
						<CardHeader className="bg-muted rounded-t-lg">
							<CardTitle className="text-xl text-foreground">
								Claim history
							</CardTitle>
							<CardDescription className="text-muted-foreground">
								Every claim from this jar, with the note that backed it
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6">
							<WithdrawalHistorySection
								records={history.records}
								isSupported={history.isSupported}
								isLoading={history.isLoading}
								error={history.error}
								jarAddress={address}
								chainId={chainId}
								tokenAddress={
									isERC20 && config.currency ? config.currency : ETH_ADDRESS
								}
							/>
						</CardContent>
					</Card>
				</div>

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
					onSave={() => metadata.handleMetadataUpdate(address, refetch)}
					isUpdatingMetadata={metadata.isUpdatingMetadata}
				/>
			</div>
		</ProtocolErrorBoundary>
	);
}
