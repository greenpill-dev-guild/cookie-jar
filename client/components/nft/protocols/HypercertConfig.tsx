import { CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HypercertsProvider } from "@/lib/nft/protocols/HypercertsProvider";
import { ACCESS_CONTROL_DOC_LINKS } from "../doc-links";
import { ProtocolConfigBase } from "../ProtocolConfigBase";

interface HypercertDetails {
	id: string;
	name?: string;
	description?: string;
	image?: string;
	creator?: string;
	totalUnits?: string;
	transferRestriction?: string;
}

export interface HypercertConfigProps {
	onConfigChange: (config: { hypercertId: string }) => void;
	initialConfig?: { hypercertId: string };
	className?: string;
}

export const HypercertConfig: React.FC<HypercertConfigProps> = ({
	onConfigChange,
	initialConfig,
	className,
}) => {
	const [hypercertId, setHypercertId] = useState(
		initialConfig?.hypercertId || "",
	);
	const [selectedHypercert, setSelectedHypercert] =
		useState<HypercertDetails | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const validateHypercert = useCallback(
		async (hypercertIdToValidate: string) => {
			if (!hypercertIdToValidate) {
				setValidationError("Please enter a Hypercert ID.");
				return;
			}

			setIsValidating(true);
			setValidationError(null);

			try {
				const hypercertDetails = await HypercertsProvider.getHypercertById(
					hypercertIdToValidate,
				);

				if (hypercertDetails) {
					setSelectedHypercert(hypercertDetails);
					onConfigChange({ hypercertId: hypercertIdToValidate });
				} else {
					setValidationError(
						"Hypercert not found. Please check the Hypercert ID.",
					);
					setSelectedHypercert(null);
				}
			} catch (err) {
				console.error("Error validating Hypercert:", err);
				setValidationError("Error validating Hypercert. Please try again.");
				setSelectedHypercert(null);
			} finally {
				setIsValidating(false);
			}
		},
		[],
	);

	// Load initial hypercert if provided
	useEffect(() => {
		if (initialConfig?.hypercertId && !selectedHypercert) {
			validateHypercert(initialConfig.hypercertId);
		}
	}, [initialConfig, selectedHypercert, validateHypercert]);

	const handleHypercertIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newHypercertId = e.target.value;
		setHypercertId(newHypercertId);
		setSelectedHypercert(null);
		setValidationError(null);
	};

	const handleValidate = () => {
		validateHypercert(hypercertId);
	};

	return (
		<ProtocolConfigBase
			title="Hypercert Gate Configuration"
			description="Require users to hold a specific Hypercert to access this jar."
			icon="🏆"
			color="bg-green-500"
			validationError={validationError}
			isLoading={isValidating}
			className={className}
			learnMoreUrl={ACCESS_CONTROL_DOC_LINKS.hypercerts}
		>
			<div className="space-y-4">
				{/* Hypercert ID Input */}
				<div>
					<Label htmlFor="hypercert-id">Hypercert ID *</Label>
					<Input
						id="hypercert-id"
						placeholder="Enter Hypercert ID (e.g., 0x1234...)"
						value={hypercertId}
						onChange={handleHypercertIdChange}
						className="mt-1"
					/>
					<p className="text-xs text-gray-500 mt-1">
						The unique identifier for the Hypercert token
					</p>
				</div>

				{/* Validate Button */}
				<div>
					<Button
						onClick={handleValidate}
						disabled={isValidating || !hypercertId}
						className="w-full"
					>
						{isValidating ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Validating Hypercert...
							</>
						) : (
							"Validate Hypercert"
						)}
					</Button>
				</div>

				{/* Selected Hypercert Display */}
				{selectedHypercert && (
					<div className="mt-4 p-4 border rounded-md bg-green-50 border-green-200">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
							<div className="flex-1">
								<p className="font-medium text-green-800">
									Hypercert Validated Successfully
								</p>
								<div className="mt-2 space-y-1 text-sm">
									<p>
										<span className="font-medium">ID:</span>{" "}
										{selectedHypercert.id}
									</p>
									{selectedHypercert.name && (
										<p>
											<span className="font-medium">Name:</span>{" "}
											{selectedHypercert.name}
										</p>
									)}
									{selectedHypercert.description && (
										<p className="text-xs">
											<span className="font-medium">Description:</span>{" "}
											{selectedHypercert.description}
										</p>
									)}
									{selectedHypercert.creator && (
										<p>
											<span className="font-medium">Creator:</span>{" "}
											{selectedHypercert.creator}
										</p>
									)}
									{selectedHypercert.totalUnits && (
										<p>
											<span className="font-medium">Total Units:</span>{" "}
											{selectedHypercert.totalUnits}
										</p>
									)}
									{selectedHypercert.transferRestriction && (
										<p>
											<span className="font-medium">Transfer Restriction:</span>{" "}
											{selectedHypercert.transferRestriction}
										</p>
									)}
								</div>
							</div>
							{selectedHypercert.image && (
								<Image
									src={selectedHypercert.image}
									alt={selectedHypercert.name || "Hypercert"}
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
						Hypercerts represent positive impact work. Find Hypercerts at{" "}
						<a
							href="https://hypercerts.org/explorer"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Hypercerts Explorer
						</a>
					</p>
					<p>
						Learn more about Hypercerts at{" "}
						<a
							href="https://hypercerts.org/docs/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Documentation
						</a>
					</p>
				</div>
			</div>
		</ProtocolConfigBase>
	);
};

export default HypercertConfig;
