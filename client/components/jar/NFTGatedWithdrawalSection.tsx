"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
// NFTGatedWithdrawalSection.tsx
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useBlockNumber, useReadContract } from "wagmi";
import type { SelectedNFT } from "@/components/nft/NFTSelector";
import { NFTSelector } from "@/components/nft/NFTSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useNFTBalanceProof,
	validateBalanceProof,
} from "@/hooks/nft/useNFTBalanceProof";
import {
	ETH_ADDRESS,
	formatTokenAmount,
	useTokenInfo,
} from "@/lib/blockchain/token-utils";

/** Safely convert a string to BigInt, returning undefined for invalid values */
function safeBigInt(value: string): bigint | undefined {
	try {
		return BigInt(value);
	} catch {
		return undefined;
	}
}

interface NFTGatedWithdrawalSectionProps {
	config: any; // Ideally this would be more specifically typed
	withdrawAmount: string;
	setWithdrawAmount: (value: string) => void;
	gateAddress: string;
	setGateAddress: (value: string) => void;
	tokenId: string;
	setTokenId: (value: string) => void;
	handleWithdrawNFT: () => void;
	handleWithdrawNFTVariable: () => void;
	// Enhanced withdrawal handlers with balance proof
	handleWithdrawNFTWithProof?: (balanceProof: {
		expectedMinBalance: bigint;
		blockNumberSnapshot: number;
	}) => void;
	handleWithdrawNFTVariableWithProof?: (balanceProof: {
		expectedMinBalance: bigint;
		blockNumberSnapshot: number;
	}) => void;
}

// ERC721/ERC1155 ABI for balance checking
const ERC721_ABI = [
	{
		inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
		name: "ownerOf",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

const ERC1155_ABI = [
	{
		inputs: [
			{ internalType: "address", name: "account", type: "address" },
			{ internalType: "uint256", name: "id", type: "uint256" },
		],
		name: "balanceOf",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export const NFTGatedWithdrawalSection: React.FC<
	NFTGatedWithdrawalSectionProps
> = ({
	config,
	withdrawAmount,
	setWithdrawAmount,
	gateAddress,
	setGateAddress,
	tokenId,
	setTokenId,
	handleWithdrawNFT,
	handleWithdrawNFTVariable,
	handleWithdrawNFTWithProof,
	handleWithdrawNFTVariableWithProof,
}) => {
	const { address: userAddress } = useAccount();
	const { data: currentBlock } = useBlockNumber({ watch: true });
	const [selectedNFT, setSelectedNFT] = useState<SelectedNFT | null>(null);
	const [showManualInput, setShowManualInput] = useState(false);
	const [manualTokenType, setManualTokenType] =
		useState<SelectedNFT["tokenType"]>("ERC721");
	const [balanceCheckLoading, setBalanceCheckLoading] = useState(false);
	const [balanceError, setBalanceError] = useState<string | null>(null);
	const [ownershipVerified, setOwnershipVerified] = useState(false);

	// Manual entry becomes a first-class NFT target so both flows share logic
	const manualNFT = useMemo<SelectedNFT | null>(() => {
		if (!showManualInput || !gateAddress || !tokenId) {
			return null;
		}

		return {
			contractAddress: gateAddress,
			tokenId,
			tokenType: manualTokenType,
			name: `Token #${tokenId}`,
			collection: "Manual entry",
		};
	}, [showManualInput, gateAddress, tokenId, manualTokenType]);

	const activeNFT = showManualInput ? manualNFT : selectedNFT;
	const isManualMode = showManualInput;

	// Enhanced balance proof for race condition protection
	const {
		proof: balanceProof,
		isStale: isProofStale,
		refreshProof,
		isLoading: proofLoading,
		error: proofError,
	} = useNFTBalanceProof({
		contractAddress: activeNFT?.contractAddress || "",
		tokenId: activeNFT?.tokenId || "",
		tokenType: activeNFT?.tokenType || "ERC721",
		userAddress,
		enabled: !!activeNFT && !!userAddress,
	});

	// Get token information using the token utils
	const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenInfo(
		config?.currency !== ETH_ADDRESS ? config?.currency : undefined,
	);

	// Extract NFT gate addresses from config for filtering
	const nftGateAddresses =
		config?.nftGates?.map((gate: any) => gate.address) || [];

	// Real-time balance verification for ERC721
	const {
		data: erc721Owner,
		isLoading: erc721Loading,
		error: erc721Error,
	} = useReadContract({
		address: (activeNFT?.contractAddress as `0x${string}`) || undefined,
		abi: ERC721_ABI,
		functionName: "ownerOf",
		args: activeNFT?.tokenId ? (() => { const id = safeBigInt(activeNFT.tokenId); return id !== undefined ? [id] as const : undefined; })() : undefined,
		query: {
			enabled: !!(
				activeNFT?.contractAddress &&
				activeNFT?.tokenId &&
				safeBigInt(activeNFT.tokenId) !== undefined &&
				activeNFT?.tokenType === "ERC721"
			),
		},
	});

	// Real-time balance verification for ERC1155
	const {
		data: erc1155Balance,
		isLoading: erc1155Loading,
		error: erc1155Error,
	} = useReadContract({
		address: (activeNFT?.contractAddress as `0x${string}`) || undefined,
		abi: ERC1155_ABI,
		functionName: "balanceOf",
		args:
			userAddress && activeNFT?.tokenId
				? (() => { const id = safeBigInt(activeNFT.tokenId); return id !== undefined ? [userAddress, id] as const : undefined; })()
				: undefined,
		query: {
			enabled: !!(
				activeNFT?.contractAddress &&
				activeNFT?.tokenId &&
				safeBigInt(activeNFT.tokenId) !== undefined &&
				activeNFT?.tokenType === "ERC1155" &&
				userAddress
			),
		},
	});

	// Update gateAddress and tokenId when NFT is selected
	useEffect(() => {
		if (showManualInput || !selectedNFT) {
			return;
		}

		setGateAddress(selectedNFT.contractAddress);
		setTokenId(selectedNFT.tokenId);
	}, [selectedNFT, setGateAddress, setTokenId, showManualInput]);

	// Enhanced ownership verification using balance proof
	useEffect(() => {
		if (!activeNFT || !userAddress) {
			setOwnershipVerified(false);
			setBalanceError(null);
			return;
		}

		const isLoading = erc721Loading || erc1155Loading || proofLoading;
		const error = erc721Error || erc1155Error || proofError;

		if (error) {
			setBalanceError(proofError || "Failed to verify NFT ownership");
			setOwnershipVerified(false);
			return;
		}

		if (isLoading) {
			setBalanceCheckLoading(true);
			return;
		}

		setBalanceCheckLoading(false);

		// Use balance proof for enhanced validation
		if (balanceProof) {
			const validation = validateBalanceProof(
				balanceProof,
				Number(currentBlock || 0),
				1n,
			);
			setOwnershipVerified(validation.isValid);

			if (!validation.isValid) {
				setBalanceError(validation.reason || "NFT ownership validation failed");
			} else if (isProofStale) {
				setBalanceError("Balance proof is stale - please refresh");
				setOwnershipVerified(false);
			} else {
				setBalanceError(null);
			}
		} else {
			// Fallback to legacy verification while proof is loading
			if (activeNFT.tokenType === "ERC721") {
				const isOwner =
					erc721Owner?.toLowerCase() === userAddress.toLowerCase();
				setOwnershipVerified(isOwner);
				setBalanceError(isOwner ? null : "You no longer own this NFT");
			} else if (activeNFT.tokenType === "ERC1155") {
				const hasBalance = erc1155Balance && erc1155Balance > BigInt(0);
				setOwnershipVerified(!!hasBalance);
				setBalanceError(
					hasBalance ? null : "You no longer have balance of this NFT",
				);
			}
		}
	}, [
		activeNFT,
		userAddress,
		balanceProof,
		isProofStale,
		currentBlock,
		proofLoading,
		proofError,
		erc721Owner,
		erc1155Balance,
		erc721Loading,
		erc1155Loading,
		erc721Error,
		erc1155Error,
	]);

	const handleNFTSelect = (nft: SelectedNFT) => {
		setSelectedNFT(nft);
		setShowManualInput(false);
	};

	// Enhanced withdrawal handlers that use balance proof for ERC1155
	const handleEnhancedWithdraw = () => {
		if (
			activeNFT?.tokenType === "ERC1155" &&
			balanceProof &&
			handleWithdrawNFTWithProof
		) {
			// Use balance proof for ERC1155 to prevent race conditions
			handleWithdrawNFTWithProof({
				expectedMinBalance: balanceProof.balance,
				blockNumberSnapshot: balanceProof.blockNumber,
			});
		} else {
			// Fallback to standard withdrawal for ERC721 or when no proof available
			handleWithdrawNFT();
		}
	};

	const handleEnhancedWithdrawVariable = () => {
		if (
			activeNFT?.tokenType === "ERC1155" &&
			balanceProof &&
			handleWithdrawNFTVariableWithProof
		) {
			// Use balance proof for ERC1155 to prevent race conditions
			handleWithdrawNFTVariableWithProof({
				expectedMinBalance: balanceProof.balance,
				blockNumberSnapshot: balanceProof.blockNumber,
			});
		} else {
			// Fallback to standard withdrawal for ERC721 or when no proof available
			handleWithdrawNFTVariable();
		}
	};

	const isWithdrawalReady =
		!!activeNFT &&
		ownershipVerified &&
		!balanceCheckLoading &&
		!balanceError &&
		!isProofStale;

	return (
		<div className="space-y-6">
			{/* NFT Selection Method Toggle */}
			<Tabs
				value={showManualInput ? "manual" : "selector"}
				onValueChange={(value) => setShowManualInput(value === "manual")}
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="selector" className="flex items-center gap-2">
						<Eye className="h-4 w-4" />
						Visual Selector
					</TabsTrigger>
					<TabsTrigger value="manual" className="flex items-center gap-2">
						<EyeOff className="h-4 w-4" />
						Manual Entry
					</TabsTrigger>
				</TabsList>

				<TabsContent value="selector" className="space-y-4">
					<NFTSelector
						contractAddresses={
							nftGateAddresses.length > 0 ? nftGateAddresses : undefined
						}
						onSelect={handleNFTSelect}
						selectedNFT={selectedNFT || undefined}
					/>
				</TabsContent>

				<TabsContent value="manual" className="space-y-4">
					<div className="space-y-3 rounded-lg border border-dashed border-[#f0e6d8] bg-white/60 p-4">
						<p className="text-sm text-[#8b7355]">
							Use manual entry if your NFT does not appear in the visual picker.
							Provide the collection address, the exact token ID, and its token
							standard so we can verify ownership before withdrawing.
						</p>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="md:col-span-2">
								<label htmlFor="gateAddressInput" className="text-sm font-medium text-[#3c2a14]">
									NFT Contract Address
								</label>
								<Input
									id="gateAddressInput"
									type="text"
									placeholder="0x..."
									value={gateAddress}
									onChange={(e) => setGateAddress(e.target.value)}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="tokenIdInput" className="text-sm font-medium text-[#3c2a14]">
									Token ID
								</label>
								<Input
									id="tokenIdInput"
									type="text"
									placeholder="Token ID"
									value={tokenId}
									onChange={(e) => setTokenId(e.target.value)}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor="tokenTypeSelect" className="text-sm font-medium text-[#3c2a14]">
									Token Standard
								</label>
								<Select
									value={manualTokenType}
									onValueChange={(value) =>
										setManualTokenType(value as SelectedNFT["tokenType"])
									}
								>
									<SelectTrigger id="tokenTypeSelect" className="w-full">
										<SelectValue placeholder="Select token type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ERC721">ERC-721 (NFT)</SelectItem>
										<SelectItem value="ERC1155">
											ERC-1155 (Semi-fungible)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</TabsContent>
			</Tabs>

			{/* Selected NFT Status */}
			{activeNFT && (
				<Card className="border-l-4 border-l-[#ff5e14]">
					<CardContent className="pt-4">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium text-[#3c2a14]">Selected NFT</h4>
								<p className="text-sm text-[#8b7355]">
									{activeNFT.name || "Manual entry"}
								</p>
								<p className="text-xs text-[#8b7355] font-mono">
									{activeNFT.contractAddress}#{activeNFT.tokenId}
								</p>
							</div>
							<div className="text-right">
								<Badge
									variant={
										activeNFT.tokenType === "ERC721" ? "default" : "secondary"
									}
								>
									{activeNFT.tokenType}
								</Badge>
								{isManualMode && (
									<p className="text-xs text-[#8b7355]">Manual entry</p>
								)}
								<div className="mt-2">
									{balanceCheckLoading ? (
										<div className="flex items-center gap-2 text-[#8b7355]">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-xs">Verifying...</span>
										</div>
									) : ownershipVerified && !isProofStale ? (
										<div className="flex items-center gap-2 text-green-600">
											<CheckCircle2 className="h-4 w-4" />
											<span className="text-xs">
												Verified
												{balanceProof &&
													activeNFT?.tokenType === "ERC1155" && (
														<span className="ml-1">
															({balanceProof.balance.toString()})
														</span>
													)}
											</span>
										</div>
									) : isProofStale ? (
										<div className="flex items-center gap-2 text-yellow-600">
											<AlertCircle className="h-4 w-4" />
											<span className="text-xs">Proof stale</span>
											<Button
												variant="ghost"
												size="sm"
												onClick={refreshProof}
												className="h-4 px-1 text-xs"
											>
												Refresh
											</Button>
										</div>
									) : (
										<div className="flex items-center gap-2 text-red-600">
											<AlertCircle className="h-4 w-4" />
											<span className="text-xs">Not owned</span>
										</div>
									)}
								</div>
							</div>
						</div>
						{balanceError && (
							<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
								{balanceError}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Variable Amount Input (if variable withdrawal) */}
			{config.withdrawalOption === "VARIABLE" && (
				<div>
					<label className="text-sm font-medium text-[#3c2a14]">
						Withdrawal Amount
					</label>
					<Input
						type="number"
						placeholder={`Enter amount (${tokenSymbol})`}
						value={withdrawAmount}
						onChange={(e) => setWithdrawAmount(e.target.value)}
						className="w-full"
						min="0"
						step="any"
						max={
							config.maxWithdrawal
								? formatTokenAmount(
										BigInt(config.maxWithdrawal),
										tokenDecimals,
										"",
									)
								: undefined
						}
					/>
					{config.maxWithdrawal && (
						<p className="text-xs text-[#8b7355] mt-1">
							Maximum:{" "}
							{formatTokenAmount(
								BigInt(config.maxWithdrawal),
								tokenDecimals,
								tokenSymbol,
							)}
						</p>
					)}
				</div>
			)}

			{/* Withdrawal Button */}
			<Button
				onClick={
					config.withdrawalOption === "VARIABLE"
						? handleEnhancedWithdrawVariable
						: handleEnhancedWithdraw
				}
				className="w-full bg-[#ff5e14] hover:bg-[#e54d00] text-white"
				disabled={
					!isWithdrawalReady ||
					config.isWithdrawPending ||
					(config.withdrawalOption === "VARIABLE" &&
						(!withdrawAmount || Number(withdrawAmount) <= 0))
				}
			>
				{config.isWithdrawPending ? (
					<>
						<Loader2 className="animate-spin mr-2 h-4 w-4" />
						Processing...
					</>
				) : balanceCheckLoading ? (
					<>
						<Loader2 className="animate-spin mr-2 h-4 w-4" />
						Verifying NFT...
					</>
				) : (
					<>
						Get Cookie with NFT (
						{config.withdrawalOption === "VARIABLE"
							? `${withdrawAmount || "0"} ${tokenSymbol}`
							: config.fixedAmount
								? formatTokenAmount(
										BigInt(config.fixedAmount),
										tokenDecimals,
										tokenSymbol,
									)
								: `0 ${tokenSymbol}`}
						)
					</>
				)}
			</Button>

			{/* Help Text */}
			<div className="text-xs text-[#8b7355] bg-gray-50 p-3 rounded">
				<p className="font-medium mb-1">How it works:</p>
				<ul className="space-y-1 list-disc list-inside">
					<li>
						Select an NFT from your collection that&apos;s approved for this jar
					</li>
					<li>
						We&apos;ll verify you still own the NFT in real-time with balance
						proof protection
					</li>
					<li>
						For ERC1155 tokens, we prevent race conditions by validating balance
						at transaction time
					</li>
					<li>Click withdraw to claim your cookie using the selected NFT</li>
					<li>
						If the proof becomes stale ({">"}5 blocks old), use the refresh
						button to update it
					</li>
				</ul>
			</div>
		</div>
	);
};
