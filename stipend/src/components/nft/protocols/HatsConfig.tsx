import { log } from "@jar-core/lib/app/logger";
import { CheckCircle2, Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import Image from "@/components/app/AppImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HatsProvider } from "@/lib/nft/protocols/HatsProvider";
import { ACCESS_CONTROL_DOC_LINKS } from "../doc-links";
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
	chainId?: number;
	onConfigChange: (config: {
		hatId: string;
		hatsContract?: string;
		hatsId?: string;
		hatsAddress?: string;
	}) => void;
	initialConfig?: { hatId: string; hatsContract?: string };
	className?: string;
}

export const HatsConfig: React.FC<HatsConfigProps> = ({
	onConfigChange,
	chainId,
	initialConfig,
	className,
}) => {
	const publicClient = usePublicClient({ chainId });
	const [hatId, setHatId] = useState(initialConfig?.hatId || "");
	const [hatsContract, setHatsContract] = useState(
		initialConfig?.hatsContract || ""
	);
	const [selectedHat, setSelectedHat] = useState<HatDetails | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const validationRequest = useRef(0);

	const validateHat = useCallback(
		async (hatIdToValidate: string, contractAddress?: string) => {
			if (!hatIdToValidate) {
				setValidationError("Please enter a Hat ID.");
				return;
			}

			const request = ++validationRequest.current;
			setIsValidating(true);
			setValidationError(null);

			try {
				const hatDetails = await HatsProvider.getHatById(
					hatIdToValidate,
					contractAddress,
					publicClient
				);

				if (request !== validationRequest.current) return;
				if (hatDetails) {
					setSelectedHat(hatDetails);
				} else {
					setValidationError("Hat not found. Please check the Hat ID.");
					setSelectedHat(null);
				}
			} catch (err) {
				if (request !== validationRequest.current) return;
				log.error("Error validating Hat:", err);
				setValidationError(
					"Could not validate the Hat on this network. Check the ID, contract and connection, then try again."
				);
				setSelectedHat(null);
			} finally {
				if (request === validationRequest.current) setIsValidating(false);
			}
		},
		[publicClient]
	);

	// Display the stored gate without requiring optional subgraph metadata.
	useEffect(() => {
		++validationRequest.current;
		setHatId(initialConfig?.hatId || "");
		setHatsContract(initialConfig?.hatsContract || "");
		setSelectedHat(null);
		setValidationError(null);
		setIsValidating(false);
	}, [initialConfig?.hatId, initialConfig?.hatsContract, chainId]);

	const publishGate = (id: string, contract: string) => {
		++validationRequest.current;
		setIsValidating(false);
		onConfigChange({
			hatId: id,
			hatsId: id,
			hatsContract: contract,
			hatsAddress: contract,
		});
	};

	const handleHatIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newHatId = e.target.value;
		setHatId(newHatId);
		publishGate(newHatId, hatsContract);
		setSelectedHat(null);
		setValidationError(null);
	};

	const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newContract = e.target.value;
		setHatsContract(newContract);
		publishGate(hatId, newContract);
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
			errorId="hats-error"
			isLoading={isValidating}
			className={className}
			learnMoreUrl={ACCESS_CONTROL_DOC_LINKS.hats}
		>
			<div className="space-y-4">
				{/* Hat ID Input */}
				<div>
					<Label htmlFor="hat-id">Hat ID *</Label>
					<Input
						id="hat-id"
						placeholder="Enter a decimal or full hexadecimal Hat ID"
						value={hatId}
						onChange={handleHatIdChange}
						className="mt-1"
						aria-invalid={!!validationError}
						aria-describedby={validationError ? "hats-error" : undefined}
					/>
					<p className="text-xs text-muted-foreground mt-1">
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
					<p className="text-xs text-muted-foreground mt-1">
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
					<div
						role="status"
						className="mt-4 p-4 border rounded-md bg-success/10 border-success/30 text-foreground"
					>
						<div className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-success mt-1 shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="font-medium text-success">
									Hat Validated Successfully
								</p>
								<div className="mt-2 space-y-1 text-sm break-all">
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
									{selectedHat.wearers && selectedHat.wearers.length > 0 && (
										<p>
											<span className="font-medium">Current Wearers:</span>{" "}
											{selectedHat.wearers.length}
										</p>
									)}
								</div>
							</div>
							{selectedHat.imageUri && (
								<Image
									src={
										selectedHat.imageUri.startsWith("ipfs://")
											? `https://ipfs.io/ipfs/${selectedHat.imageUri.slice(7)}`
											: selectedHat.imageUri
									}
									alt="Hat"
									width={48}
									height={48}
									className="w-12 h-12 rounded object-cover shrink-0"
									onError={(event) => {
										event.currentTarget.hidden = true;
									}}
								/>
							)}
						</div>
					</div>
				)}

				{/* Help Text */}
				<div className="text-xs text-muted-foreground space-y-1">
					<p>
						Learn more about Hat IDs at{" "}
						<a
							href="https://docs.hatsprotocol.xyz/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline inline-flex min-h-11 items-center"
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
