import { CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HatsProvider } from "@/lib/nft/protocols/HatsProvider";
import { ProtocolConfigBase } from "../ProtocolConfigBase";

interface HatDetails {
	id: string;
	prettyId: string;
	status: boolean;
	createdAt: string;
	details: string;
	maxSupply?: string;
	eligibility?: string;
	toggle?: string;
	mutable?: boolean;
	imageUri?: string;
	levelAtLocalTree?: number;
	currentSupply?: string;
	tree?: {
		id: string;
		domain: string;
		requestType: string;
	};
	wearers?: any[];
	subHats?: any[];
}

export interface HatsConfigProps {
	onConfigChange: (config: { hatId: string; hatsContract?: string }) => void;
	initialConfig?: { hatId: string; hatsContract?: string };
	className?: string;
}

export const HatsConfig: React.FC<HatsConfigProps> = ({
	onConfigChange,
	initialConfig,
	className,
}) => {
	const [hatId, setHatId] = useState(initialConfig?.hatId || "");
	const [hatsContract, setHatsContract] = useState(
		initialConfig?.hatsContract || "",
	);
	const [selectedHat, setSelectedHat] = useState<HatDetails | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const validateHat = useCallback(
		async (hatIdToValidate: string, contractAddress?: string) => {
			if (!hatIdToValidate) {
				setValidationError("Please enter a Hat ID.");
				return;
			}

			setIsValidating(true);
			setValidationError(null);

			try {
				const hatDetails = await HatsProvider.getHatById(
					hatIdToValidate,
					contractAddress,
				);

				if (hatDetails) {
					setSelectedHat(hatDetails);
					onConfigChange({
						hatId: hatIdToValidate,
						hatsContract: contractAddress,
					});
				} else {
					setValidationError("Hat not found. Please check the Hat ID.");
					setSelectedHat(null);
				}
			} catch (err) {
				console.error("Error validating Hat:", err);
				setValidationError("Error validating Hat. Please try again.");
				setSelectedHat(null);
			} finally {
				setIsValidating(false);
			}
		},
		[onConfigChange],
	);

	// Load initial hat if provided
	useEffect(() => {
		if (initialConfig?.hatId && !selectedHat) {
			validateHat(initialConfig.hatId, initialConfig.hatsContract);
		}
	}, [initialConfig, selectedHat, validateHat]);

	const handleHatIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newHatId = e.target.value;
		setHatId(newHatId);
		setSelectedHat(null);
		setValidationError(null);
	};

	const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newContract = e.target.value;
		setHatsContract(newContract);
		setSelectedHat(null);
		setValidationError(null);
	};

	const handleValidate = () => {
		validateHat(hatId, hatsContract);
	};

	return (
		<ProtocolConfigBase
			title="Hats Protocol Gate Configuration"
			description="Require users to wear a specific Hat to access this jar."
			icon="🎩"
			color="bg-yellow-500"
			validationError={validationError}
			isLoading={isValidating}
			className={className}
			learnMoreUrl="https://www.hatsprotocol.xyz/"
		>
			<div className="space-y-4">
				{/* Hat ID Input */}
				<div>
					<Label htmlFor="hat-id">Hat ID *</Label>
					<Input
						id="hat-id"
						placeholder="Enter Hat ID (e.g., 0x00000001.0x00000002.0x00000003)"
						value={hatId}
						onChange={handleHatIdChange}
						className="mt-1"
					/>
					<p className="text-xs text-gray-500 mt-1">
						Hat IDs are hierarchical addresses in the Hats tree structure
					</p>
				</div>

				{/* Optional Hats Contract Address */}
				<div>
					<Label htmlFor="hats-contract">
						Hats Contract Address (Optional)
					</Label>
					<Input
						id="hats-contract"
						placeholder="0x... (leave empty for default contract)"
						value={hatsContract}
						onChange={handleContractChange}
						className="mt-1"
					/>
					<p className="text-xs text-gray-500 mt-1">
						Leave empty to use the default Hats Protocol contract
					</p>
				</div>

				{/* Validate Button */}
				<div>
					<Button
						onClick={handleValidate}
						disabled={isValidating || !hatId}
						className="w-full"
					>
						{isValidating ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Validating Hat...
							</>
						) : (
							"Validate Hat"
						)}
					</Button>
				</div>

				{/* Selected Hat Display */}
				{selectedHat && (
					<div className="mt-4 p-4 border rounded-md bg-green-50 border-green-200">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
							<div className="flex-1">
								<p className="font-medium text-green-800">
									Hat Validated Successfully
								</p>
								<div className="mt-2 space-y-1 text-sm">
									<p>
										<span className="font-medium">ID:</span>{" "}
										{selectedHat.prettyId}
									</p>
									{selectedHat.details && (
										<p>
											<span className="font-medium">Details:</span>{" "}
											{selectedHat.details}
										</p>
									)}
									<p>
										<span className="font-medium">Status:</span>{" "}
										{selectedHat.status ? "Active" : "Inactive"}
									</p>
									{selectedHat.currentSupply && (
										<p>
											<span className="font-medium">Current Supply:</span>{" "}
											{selectedHat.currentSupply}
										</p>
									)}
									{selectedHat.maxSupply && (
										<p>
											<span className="font-medium">Max Supply:</span>{" "}
											{selectedHat.maxSupply}
										</p>
									)}
									{selectedHat.wearers && (
										<p>
											<span className="font-medium">Current Wearers:</span>{" "}
											{selectedHat.wearers.length}
										</p>
									)}
								</div>
							</div>
							{selectedHat.imageUri && (
								<Image
									src={selectedHat.imageUri}
									alt="Hat"
									width={48}
									height={48}
									className="w-12 h-12 rounded object-cover"
								/>
							)}
						</div>
					</div>
				)}

				{/* Help Text */}
				<div className="text-xs text-gray-500 space-y-1">
					<p>
						Learn more about Hat IDs at{" "}
						<a
							href="https://docs.hatsprotocol.xyz/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Hats Protocol Documentation
						</a>
					</p>
				</div>
			</div>
		</ProtocolConfigBase>
	);
};

export default HatsConfig;
