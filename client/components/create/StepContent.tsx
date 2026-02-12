"use client";

import { Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { isAddress } from "viem";
import { useChainId } from "wagmi";
import { NFTSelector, type SelectedNFT } from "@/components/nft/NFTSelector";
import { ProtocolSelector } from "@/components/nft/ProtocolSelector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	AccessType,
	METHOD_TO_ACCESS_TYPE,
	NFTType,
	WithdrawalTypeOptions,
	type JarCreationFormData,
} from "@/hooks/jar/schemas/jarCreationSchema";
import type {
	AccessMethod,
	ProtocolConfig as SelectorProtocolConfig,
} from "@/components/nft/ProtocolSelector";
import { useToast } from "@/hooks/app/useToast";
import { ETH_ADDRESS } from "@/lib/blockchain/token-utils";
import { shortenAddress } from "@/lib/app/utils";
import { isPoapSupportedChain } from "@/config/supported-networks";

interface StepContentProps {
	step: number;
	isV2Contract: boolean;
}

const VISIBLE_METHODS_WITHOUT_POAP: AccessMethod[] = [
	"Allowlist",
	"NFT",
	"Hats",
	"Hypercert",
	"Unlock",
];

export const StepContent: React.FC<StepContentProps> = ({
	step,
	isV2Contract,
}) => {
	switch (step) {
		case 1:
			return <BasicConfigStep />;
		case 2:
			return <WithdrawalSettingsStep />;
		case 3:
			return isV2Contract ? <AccessControlStep /> : null;
		case 4:
			return <FinalSettingsStep isV2Contract={isV2Contract} />;
		default:
			return null;
	}
};

// ─────────────────────────────────────────────
// Step 1: Basic Configuration
// ─────────────────────────────────────────────

const BasicConfigStep: React.FC = () => {
	const { register, watch, setValue, formState: { errors } } =
		useFormContext<JarCreationFormData>();
	const { toast } = useToast();
	const chainId = useChainId();

	const showCustomCurrency = watch("showCustomCurrency");
	const supportedCurrency = watch("supportedCurrency");
	const customCurrencyAddress = watch("customCurrencyAddress");
	const jarOwnerAddress = watch("jarOwnerAddress");

	const currencyOptions = useMemo(() => {
		const options: Array<{
			value: string;
			label: string;
			description: string;
		}> = [
			{
				value: ETH_ADDRESS,
				label: "ETH (Native)",
				description: "Use native Ethereum",
			},
		];

		if (chainId === 31337) {
			options.push({
				value: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
				label: "DEMO Token",
				description: "Local development token",
			});
		} else if (chainId === 84532) {
			options.push({
				value: "0x4200000000000000000000000000000000000006",
				label: "WETH",
				description: "Wrapped ETH on Base Sepolia",
			});
		}

		options.push({
			value: "CUSTOM",
			label: "Custom ERC-20",
			description: "Enter your own ERC-20 token address",
		});

		return options;
	}, [chainId]);

	const handleCurrencyChange = useCallback(
		(value: string) => {
			if (value === "CUSTOM") {
				setValue("showCustomCurrency", true);
			} else {
				setValue("showCustomCurrency", false);
				setValue("supportedCurrency", value);
				setValue("customCurrencyAddress", "");
			}
		},
		[setValue],
	);

	const handleCustomCurrencySubmit = useCallback(async () => {
		if (customCurrencyAddress && isAddress(customCurrencyAddress)) {
			setValue("supportedCurrency", customCurrencyAddress);
			toast({
				title: "Custom currency set",
				description: "ERC-20 token address has been set successfully",
			});
		} else {
			toast({
				title: "Invalid address",
				description: "Please enter a valid Ethereum address",
				variant: "destructive",
			});
		}
	}, [customCurrencyAddress, setValue, toast]);

	const handlePrepopulate = useCallback(() => {
		if (process.env.NODE_ENV !== "development") return;

		const randomNames = [
			"Cookie Fund",
			"Dev Grants",
			"Community Pool",
			"Test Jar",
			"Demo Fund",
			"Alpha Pool",
		];
		const randomDescriptions = [
			"A fund for supporting cookie development",
			"Grants for innovative projects",
			"Community-driven funding pool",
			"Testing new jar functionality",
			"Demonstration of jar capabilities",
			"Early access funding",
		];
		const randomImages = [
			"https://picsum.photos/400/300?random=1",
			"https://picsum.photos/400/300?random=2",
			"https://picsum.photos/400/300?random=3",
		];
		const randomLinks = [
			"https://example.com/project1",
			"https://github.com/test/repo",
			"https://docs.example.com",
		];

		setValue(
			"jarName",
			randomNames[Math.floor(Math.random() * randomNames.length)],
		);
		setValue(
			"metadata",
			randomDescriptions[
				Math.floor(Math.random() * randomDescriptions.length)
			],
		);
		setValue(
			"imageUrl",
			randomImages[Math.floor(Math.random() * randomImages.length)],
		);
		setValue(
			"externalLink",
			randomLinks[Math.floor(Math.random() * randomLinks.length)],
		);

		if (Math.random() > 0.5) {
			setValue("enableCustomFee", true);
			setValue("customFee", (Math.random() * 1.9 + 0.1).toFixed(2));
		}

		if (Math.random() > 0.7) {
			setValue(
				"supportedCurrency",
				"0x036CbD53842c5426634e7929541eC2318f3dCF7e",
			);
		}

		setValue("fixedAmount", (Math.random() * 0.5).toFixed(3));
		setValue("maxWithdrawal", (Math.random() * 2).toFixed(3));
		setValue(
			"withdrawalInterval",
			String(Math.floor(Math.random() * 30 + 1)),
		);
	}, [setValue]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-end">
				{process.env.NODE_ENV === "development" && (
					<Button
						variant="outline"
						size="sm"
						onClick={handlePrepopulate}
						className="text-xs"
					>
						Fill with Random Data (Dev Only)
					</Button>
				)}
			</div>

			<div className="grid gap-4">
				<div>
					<Label htmlFor="jarName">Jar Name *</Label>
					<Input
						id="jarName"
						data-testid="jar-name-input"
						placeholder="e.g., Community Fund, Dev Grants"
						aria-label="Enter a name for your cookie jar"
						aria-invalid={!!errors.jarName}
						aria-describedby={errors.jarName ? "jarName-error" : undefined}
						{...register("jarName")}
					/>
					{errors.jarName && (
						<p id="jarName-error" className="text-sm text-red-600 mt-1">
							{errors.jarName.message}
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="jarOwner">Jar Owner Address *</Label>
					<div className="relative">
						<Input
							id="jarOwner"
							data-testid="jar-owner-input"
							placeholder="0x... (defaults to your connected wallet)"
							className="pr-12"
							aria-label="Enter the Ethereum address that will own this jar"
							aria-invalid={!!errors.jarOwnerAddress}
							{...register("jarOwnerAddress")}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1 h-8 w-8 text-gray-500 hover:text-[#ff5e14]"
							onClick={async () => {
								try {
									const text = await navigator.clipboard.readText();
									if (text && isAddress(text)) {
										setValue("jarOwnerAddress", text);
									}
								} catch (err) {
									console.error("Failed to read clipboard:", err);
								}
							}}
						>
							<svg
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</Button>
					</div>
					<p className="text-sm text-muted-foreground mt-1">
						{jarOwnerAddress &&
						jarOwnerAddress !==
							"0x0000000000000000000000000000000000000000"
							? `Currently set to: ${shortenAddress(jarOwnerAddress, 10)}`
							: "The address that will own and manage this jar"}
					</p>
				</div>

				<div>
					<Label htmlFor="currency">Currency *</Label>
					<Select
						value={showCustomCurrency ? "CUSTOM" : supportedCurrency}
						onValueChange={handleCurrencyChange}
					>
						<SelectTrigger
							data-testid="currency-selector"
							aria-label="Select currency type for your jar"
						>
							<SelectValue placeholder="Select currency" />
						</SelectTrigger>
						<SelectContent>
							{currencyOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div>
										<div className="font-medium">{option.label}</div>
										<div className="text-sm text-muted-foreground">
											{option.description}
										</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{showCustomCurrency && (
						<div className="mt-3 space-y-2">
							<Label htmlFor="customCurrency">ERC-20 Token Address</Label>
							<div className="flex gap-2">
								<Input
									id="customCurrency"
									placeholder="0x... (ERC-20 contract address)"
									className="flex-1"
									{...register("customCurrencyAddress")}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={handleCustomCurrencySubmit}
									disabled={
										!customCurrencyAddress ||
										!isAddress(customCurrencyAddress)
									}
									className="px-4"
								>
									Set
								</Button>
							</div>
							{customCurrencyAddress &&
								!isAddress(customCurrencyAddress) && (
									<p className="text-sm text-red-600">
										Please enter a valid Ethereum address
									</p>
								)}
							{supportedCurrency &&
								supportedCurrency !== ETH_ADDRESS &&
								isAddress(supportedCurrency) && (
									<p className="text-sm text-green-600">
										Custom ERC-20 set:{" "}
										{shortenAddress(supportedCurrency, 10)}
									</p>
								)}
						</div>
					)}
				</div>

				<div>
					<Label htmlFor="description">Description</Label>
					<Textarea
						id="description"
						placeholder="Describe what this jar is for..."
						rows={3}
						{...register("metadata")}
					/>
				</div>

				<div>
					<Label htmlFor="imageUrl">Image URL</Label>
					<Input
						id="imageUrl"
						placeholder="https://example.com/image.jpg"
						{...register("imageUrl")}
					/>
				</div>

				<div>
					<Label htmlFor="externalLink">External Link</Label>
					<Input
						id="externalLink"
						placeholder="https://example.com"
						{...register("externalLink")}
					/>
				</div>
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────
// Step 2: Withdrawal Settings
// ─────────────────────────────────────────────

const WithdrawalSettingsStep: React.FC = () => {
	const { register, watch, setValue } =
		useFormContext<JarCreationFormData>();

	const withdrawalOption = watch("withdrawalOption");
	const strictPurpose = watch("strictPurpose");
	const emergencyWithdrawalEnabled = watch("emergencyWithdrawalEnabled");
	const oneTimeWithdrawal = watch("oneTimeWithdrawal");

	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Withdrawal Settings</h3>

			<div className="grid gap-4">
				<div>
					<Label htmlFor="withdrawalType">Withdrawal Type *</Label>
					<Select
						value={withdrawalOption.toString()}
						onValueChange={(value) =>
							setValue(
								"withdrawalOption",
								parseInt(value, 10) as WithdrawalTypeOptions,
							)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select withdrawal type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="0">
								Fixed - Same amount each time
							</SelectItem>
							<SelectItem value="1">
								Variable - User chooses amount
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{withdrawalOption === WithdrawalTypeOptions.Fixed && (
					<div>
						<Label htmlFor="fixedAmount">
							Fixed Withdrawal Amount *
						</Label>
						<Input
							id="fixedAmount"
							type="number"
							placeholder="0.1"
							step="0.001"
							{...register("fixedAmount")}
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Amount users can withdraw each time
						</p>
					</div>
				)}

				{withdrawalOption === WithdrawalTypeOptions.Variable && (
					<div>
						<Label htmlFor="maxWithdrawal">
							Maximum Withdrawal Amount *
						</Label>
						<Input
							id="maxWithdrawal"
							type="number"
							placeholder="1.0"
							step="0.001"
							{...register("maxWithdrawal")}
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Maximum amount users can withdraw at once
						</p>
					</div>
				)}

				<div>
					<Label htmlFor="withdrawalInterval">
						Withdrawal Interval (days) *
					</Label>
					<Input
						id="withdrawalInterval"
						type="number"
						placeholder="7"
						min="1"
						{...register("withdrawalInterval")}
					/>
					<p className="text-sm text-muted-foreground mt-1">
						Time between allowed withdrawals (e.g., 7 = weekly, 30 =
						monthly)
					</p>
				</div>

				<div className="space-y-3">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="strictPurpose"
							checked={strictPurpose}
							onCheckedChange={(checked) =>
								setValue("strictPurpose", checked === true)
							}
						/>
						<Label htmlFor="strictPurpose" className="text-sm">
							Require purpose description (minimum 27 characters)
						</Label>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="emergencyWithdrawal"
							checked={emergencyWithdrawalEnabled}
							onCheckedChange={(checked) =>
								setValue(
									"emergencyWithdrawalEnabled",
									checked === true,
								)
							}
						/>
						<Label htmlFor="emergencyWithdrawal" className="text-sm">
							Enable emergency withdrawal
						</Label>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="oneTimeWithdrawal"
							checked={oneTimeWithdrawal}
							onCheckedChange={(checked) =>
								setValue("oneTimeWithdrawal", checked === true)
							}
						/>
						<Label htmlFor="oneTimeWithdrawal" className="text-sm">
							One-time withdrawal only (users can only claim once)
						</Label>
					</div>
				</div>
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────
// Step 3: Access Control
// ─────────────────────────────────────────────

const AccessControlStep: React.FC = () => {
	const chainId = useChainId();
	const { watch, setValue, getValues } =
		useFormContext<JarCreationFormData>();

	const accessType = watch("accessType");
	const nftAddresses = watch("nftAddresses");
	const nftTypes = watch("nftTypes");
	const protocolConfig = watch("protocolConfig");
	const poapSupported = isPoapSupportedChain(chainId);

	useEffect(() => {
		if (poapSupported || accessType !== AccessType.POAP) return;

		setValue("accessType", AccessType.Allowlist);
		setValue(
			"protocolConfig",
			{
				method: "Allowlist",
				accessType: "Allowlist",
			} as any,
		);
	}, [poapSupported, accessType, setValue]);

	const handleProtocolConfigChange = useCallback(
		(config: SelectorProtocolConfig) => {
			// Bridge ProtocolSelector's { method: "NFT" } to form's { accessType: AccessType.NFTGated }
			setValue("protocolConfig", {
				...config,
				accessType: config.method,
			} as any);

			const numericType = METHOD_TO_ACCESS_TYPE[config.method];
			if (numericType !== undefined) {
				setValue("accessType", numericType);
			}

			// Sync NFT-specific arrays when NFT method is selected
			if (config.method === "NFT") {
				if (config.nftAddresses) {
					setValue("nftAddresses", config.nftAddresses);
				}
				if (config.nftTypes) {
					setValue(
						"nftTypes",
						(config.nftTypes as number[]).map(
							(t: number) => t as NFTType,
						),
					);
				}
			}
		},
		[setValue],
	);

	const handleAddNFT = useCallback(
		(address: string, type: number) => {
			const normalizedAddress = address.trim().toLowerCase();
			if (!normalizedAddress) return;

			const currentAddresses = getValues("nftAddresses");
			const currentTypes = getValues("nftTypes");
			const normalizedCurrentAddresses = currentAddresses.map((item) =>
				item.trim().toLowerCase(),
			);
			const existingIndex = normalizedCurrentAddresses.indexOf(normalizedAddress);

			if (existingIndex !== -1) {
				const nextTypes = [...currentTypes];
				nextTypes[existingIndex] = type as NFTType;
				setValue("nftTypes", nextTypes);
				return;
			}

			setValue("nftAddresses", [...currentAddresses, normalizedAddress]);
			setValue("nftTypes", [...currentTypes, type as NFTType]);
		},
		[getValues, setValue],
	);

	const handleRemoveNFT = useCallback(
		(index: number) => {
			const currentAddresses = getValues("nftAddresses");
			const currentTypes = getValues("nftTypes");
			setValue(
				"nftAddresses",
				currentAddresses.filter((_, i) => i !== index),
			);
			setValue(
				"nftTypes",
				currentTypes.filter((_, i) => i !== index),
			);
		},
		[getValues, setValue],
	);

	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Access Control</h3>
			<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<p className="text-sm text-blue-800">
					<strong>v2 Contract Feature:</strong> Enhanced access control
					with support for NFT gates, POAP verification, and protocol
					integrations.
				</p>
			</div>
			{!poapSupported && (
				<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
					<p className="text-sm text-amber-800">
						POAP gating is only available on Gnosis Chain and is hidden on
						this network.
					</p>
				</div>
			)}

			<ProtocolSelector
				onConfigChange={handleProtocolConfigChange}
				initialConfig={protocolConfig}
				showViewToggle={false}
				visibleMethods={
					poapSupported ? undefined : VISIBLE_METHODS_WITHOUT_POAP
				}
			/>

			{accessType === AccessType.NFTGated && (
				<div className="mt-6 space-y-6">
					<div className="border rounded-lg p-4">
						<Label className="text-base font-medium mb-4 block">
							Select NFT for Access Control
						</Label>
						<p className="text-sm text-muted-foreground mb-4">
							Choose an NFT that users must own to access this jar.
							You can search public collections or select from your
							own NFTs.
						</p>

						<NFTSelector
							onSelect={(selectedNFT: SelectedNFT) => {
								const nftType =
									selectedNFT.tokenType === "ERC721"
										? NFTType.ERC721
										: NFTType.ERC1155;
								handleAddNFT(
									selectedNFT.contractAddress,
									nftType,
								);
							}}
							maxHeight="400px"
							className="mt-4"
						/>
					</div>

					{nftAddresses.length > 0 && (
						<div className="space-y-3">
							<Label className="text-base font-medium">
								Selected NFT Requirements:
							</Label>
							<div className="space-y-2">
								{nftAddresses.map(
									(address: string, index: number) => (
										<div
											key={`${address}-${index}`}
											className="flex items-center justify-between p-3 bg-muted rounded-lg border"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<span className="text-sm font-medium">
														NFT Contract
													</span>
													<span
														className={`text-xs px-2 py-0.5 rounded ${
															nftTypes[index] ===
															NFTType.ERC721
																? "bg-purple-100 text-purple-800"
																: "bg-blue-100 text-blue-800"
														}`}
													>
														{nftTypes[index] ===
														NFTType.ERC721
															? "ERC721"
															: "ERC1155"}
													</span>
												</div>
												<p className="text-sm text-muted-foreground font-mono truncate">
													{address}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													handleRemoveNFT(index)
												}
												className="text-red-500 hover:text-red-700 hover:bg-red-50"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									),
								)}
							</div>
							<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-800">
									Users must own NFTs from{" "}
									{nftAddresses.length} selected collection
									{nftAddresses.length !== 1 ? "s" : ""} to
									access this jar.
								</p>
							</div>
						</div>
					)}

					{nftAddresses.length === 0 && (
						<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
							<p className="text-sm text-amber-800">
								Please select at least one NFT collection to
								enable NFT-gated access.
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// ─────────────────────────────────────────────
// Step 4: Final Settings & Review
// ─────────────────────────────────────────────

const FinalSettingsStep: React.FC<{ isV2Contract: boolean }> = ({
	isV2Contract,
}) => {
	const { register, watch, setValue } =
		useFormContext<JarCreationFormData>();

	const enableCustomFee = watch("enableCustomFee");
	const streamingEnabled = watch("streamingEnabled");
	const requireStreamApproval = watch("requireStreamApproval");
	const autoSwapEnabled = watch("autoSwapEnabled");

	// Summary values
	const jarName = watch("jarName");
	const jarOwnerAddress = watch("jarOwnerAddress");
	const supportedCurrency = watch("supportedCurrency");
	const accessType = watch("accessType");
	const withdrawalOption = watch("withdrawalOption");
	const fixedAmount = watch("fixedAmount");
	const maxWithdrawal = watch("maxWithdrawal");
	const withdrawalInterval = watch("withdrawalInterval");
	const strictPurpose = watch("strictPurpose");
	const emergencyWithdrawalEnabled = watch("emergencyWithdrawalEnabled");
	const oneTimeWithdrawal = watch("oneTimeWithdrawal");
	const customFee = watch("customFee");
	const maxStreamRate = watch("maxStreamRate");
	const minStreamDuration = watch("minStreamDuration");

	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Final Settings & Review</h3>

			<div className="space-y-6">
				{/* Custom Fee Settings */}
				<div className="space-y-4">
					<h4 className="font-medium text-base">Fee Configuration</h4>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="enableCustomFee"
							checked={enableCustomFee}
							disabled={!isV2Contract}
							onCheckedChange={(checked) =>
								setValue("enableCustomFee", checked === true)
							}
						/>
						<Label
							htmlFor="enableCustomFee"
							className={`text-sm ${!isV2Contract ? "text-gray-400" : ""}`}
						>
							Set custom deposit fee percentage
							{!isV2Contract && (
								<span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
									v2 only
								</span>
							)}
						</Label>
					</div>

					{enableCustomFee && (
						<div>
							<Label htmlFor="customFee">
								Custom Fee Percentage
							</Label>
							<Input
								id="customFee"
								type="number"
								placeholder="2.5"
								step="0.1"
								min="0"
								max="100"
								{...register("customFee")}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Percentage fee charged on deposits (0-100%)
							</p>
						</div>
					)}
				</div>

				{/* Streaming & Multi-Token Settings */}
				{isV2Contract && (
					<div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
						<h4 className="font-medium text-base flex items-center gap-2">
							<span className="w-2 h-2 bg-blue-500 rounded-full" />
							Advanced Features
							<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
								v2 Enhanced
							</span>
						</h4>

						<div className="space-y-4">
							<div className="flex items-center space-x-2">
								<Checkbox
									id="enableStreaming"
									checked={streamingEnabled}
									onCheckedChange={(checked) =>
										setValue(
											"streamingEnabled",
											checked === true,
										)
									}
								/>
								<Label
									htmlFor="enableStreaming"
									className="text-sm"
								>
									Enable token streaming
								</Label>
							</div>

							{streamingEnabled && (
								<div className="ml-6 space-y-4 p-3 bg-white rounded border border-blue-200">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="requireStreamApproval"
											checked={requireStreamApproval}
											onCheckedChange={(checked) =>
												setValue(
													"requireStreamApproval",
													checked === true,
												)
											}
										/>
										<Label
											htmlFor="requireStreamApproval"
											className="text-sm"
										>
											Require manual approval for new
											streams
										</Label>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<Label htmlFor="maxStreamRate">
												Max Stream Rate (tokens/second)
											</Label>
											<Input
												id="maxStreamRate"
												type="number"
												placeholder="1.0"
												step="0.001"
												min="0"
												{...register("maxStreamRate")}
											/>
											<p className="text-xs text-muted-foreground mt-1">
												Maximum allowed streaming rate
											</p>
										</div>

										<div>
											<Label htmlFor="minStreamDuration">
												Min Stream Duration (hours)
											</Label>
											<Input
												id="minStreamDuration"
												type="number"
												placeholder="1"
												min="1"
												{...register(
													"minStreamDuration",
												)}
											/>
											<p className="text-xs text-muted-foreground mt-1">
												Minimum time for streams
											</p>
										</div>
									</div>
								</div>
							)}

							<div className="flex items-center space-x-2">
								<Checkbox
									id="enableAutoSwap"
									checked={autoSwapEnabled}
									onCheckedChange={(checked) =>
										setValue(
											"autoSwapEnabled",
											checked === true,
										)
									}
								/>
								<Label
									htmlFor="enableAutoSwap"
									className="text-sm"
								>
									Enable auto-swap for ETH deposits
								</Label>
							</div>

							<div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border">
								<strong>Advanced Features:</strong>
								<ul className="mt-1 ml-4 list-disc space-y-1">
									<li>
										Streaming allows continuous funding from
										external sources
									</li>
									<li>
										Auto-swap converts ETH deposits to your
										jar&apos;s token automatically
									</li>
									<li>
										Other ERC-20 tokens sent to the jar can
										be manually recovered and swapped
									</li>
								</ul>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Configuration Summary */}
			<div className="bg-muted/50 p-4 rounded-lg space-y-2">
				<h4 className="font-medium">Configuration Summary</h4>
				<div className="text-sm space-y-1">
					<div>
						<strong>Name:</strong> {jarName || "Not set"}
					</div>
					<div>
						<strong>Owner:</strong> {jarOwnerAddress}
					</div>
					<div>
						<strong>Currency:</strong>{" "}
						{supportedCurrency === ETH_ADDRESS
							? "ETH"
							: supportedCurrency}
					</div>
					<div>
						<strong>Access Type:</strong>{" "}
						{AccessType[accessType]}
					</div>
					<div>
						<strong>Withdrawal:</strong>{" "}
						{WithdrawalTypeOptions[withdrawalOption]}
						{withdrawalOption === WithdrawalTypeOptions.Fixed
							? ` (${fixedAmount} per withdrawal)`
							: ` (max ${maxWithdrawal} per withdrawal)`}
					</div>
					<div>
						<strong>Interval:</strong> {withdrawalInterval} day
						{parseInt(withdrawalInterval, 10) === 1 ? "" : "s"}
					</div>
					<div>
						<strong>Strict Purpose:</strong>{" "}
						{strictPurpose ? "Yes" : "No"}
					</div>
					<div>
						<strong>Emergency Withdrawal:</strong>{" "}
						{emergencyWithdrawalEnabled ? "Enabled" : "Disabled"}
					</div>
					<div>
						<strong>One-time Only:</strong>{" "}
						{oneTimeWithdrawal ? "Yes" : "No"}
					</div>
					{enableCustomFee && (
						<div>
							<strong>Custom Fee:</strong> {customFee}%
						</div>
					)}
					{isV2Contract && (
						<>
							<div>
								<strong>Streaming:</strong>{" "}
								{streamingEnabled ? "Enabled" : "Disabled"}
								{streamingEnabled &&
									requireStreamApproval &&
									" (Manual Approval)"}
							</div>
							{streamingEnabled && (
								<>
									<div>
										<strong>Max Stream Rate:</strong>{" "}
										{maxStreamRate} tokens/sec
									</div>
									<div>
										<strong>Min Stream Duration:</strong>{" "}
										{minStreamDuration} hours
									</div>
								</>
							)}
							<div>
								<strong>Auto-Swap ETH:</strong>{" "}
								{autoSwapEnabled ? "Enabled" : "Disabled"}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
