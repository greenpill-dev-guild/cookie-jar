"use client";

import { useCallback, useEffect, useState } from "react";
import {
	useChainId,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { contractAddresses } from "@/config/supported-networks";
import { cookieJarFactoryAbi } from "@/generated";
import {
	createMetadataJson,
	isValidUrl,
	parseJarMetadata as parseMetadataUtil,
	validateMetadataSize,
} from "@/lib/jar/metadata-utils";
import { useToast } from "../app/useToast";

/**
 * Parsed jar metadata structure
 */
export interface JarMetadata {
	/** Display name of the jar */
	name: string;
	/** Description of the jar's purpose */
	description: string;
	/** URL to jar image/logo */
	image: string;
	/** External link for more information */
	link: string;
}

/**
 * Configuration containing raw metadata
 */
export interface JarConfig {
	/** Raw metadata string (JSON or legacy text) */
	metadata?: string;
}

/**
 * Custom hook to handle Cookie Jar metadata parsing, editing, and updates
 *
 * Provides comprehensive metadata management including parsing legacy and v2
 * metadata formats, form state management for editing, validation, and
 * on-chain updates through the factory contract.
 *
 * @param config - Jar configuration containing raw metadata string
 * @returns Object with parsed metadata, editing state, and update functions
 *
 * @example
 * ```tsx
 * const {
 *   metadata,
 *   isEditingMetadata,
 *   startEditing,
 *   handleMetadataUpdate,
 *   editName,
 *   setEditName
 * } = useJarMetadata(jarConfig);
 *
 * // Display current metadata
 * console.log(metadata.name, metadata.description);
 *
 * // Start editing
 * startEditing();
 *
 * // Update metadata on-chain
 * handleMetadataUpdate(jarAddress, refetchJarData);
 * ```
 */
export const useJarMetadata = (config: JarConfig | undefined) => {
	const { toast } = useToast();
	const chainId = useChainId();

	// Metadata editing state
	const [isEditingMetadata, setIsEditingMetadata] = useState(false);
	const [editName, setEditName] = useState("");
	const [editImage, setEditImage] = useState("");
	const [editLink, setEditLink] = useState("");
	const [editDescription, setEditDescription] = useState("");

	// Parse metadata from config using consolidated utility
	const parseMetadata = useCallback(
		(metadataString: string | undefined): JarMetadata => {
			const parsed = parseMetadataUtil(metadataString);
			return {
				name: parsed.name,
				description: parsed.description,
				image: parsed.image,
				link: parsed.link,
			};
		},
		[],
	);

	const metadata = parseMetadata(config?.metadata);

	// Initialize edit fields when entering edit mode
	const startEditing = useCallback(() => {
		setEditName(metadata.name);
		setEditImage(metadata.image);
		setEditLink(metadata.link);
		setEditDescription(metadata.description);
		setIsEditingMetadata(true);
	}, [metadata]);

	// URL validation now imported from metadata-utils

	// Validate metadata edit form
	const validateMetadataEdit = useCallback(() => {
		if (!editName || editName.length < 3) {
			toast({
				title: "Validation Error",
				description: "Jar name must be at least 3 characters long.",
				variant: "destructive",
			});
			return false;
		}

		if (editImage && !isValidUrl(editImage)) {
			toast({
				title: "Validation Error",
				description: "Please enter a valid URL for the image.",
				variant: "destructive",
			});
			return false;
		}

		if (editLink && !isValidUrl(editLink)) {
			toast({
				title: "Validation Error",
				description: "Please enter a valid URL for the external link.",
				variant: "destructive",
			});
			return false;
		}

		return true;
	}, [editName, editImage, editLink, toast]);

	// Get the factory address for the current chain
	const factoryAddress = chainId
		? contractAddresses.cookieJarFactory[chainId]
		: undefined;

	// Metadata update contract write
	const {
		writeContract: updateMetadata,
		data: updateTxHash,
		isPending: isUpdatingMetadata,
		error: metadataUpdateError,
	} = useWriteContract();

	// Wait for metadata update transaction
	const { isLoading: isWaitingForUpdate, isSuccess: isMetadataUpdateSuccess } =
		useWaitForTransactionReceipt({
			hash: updateTxHash,
			query: { enabled: !!updateTxHash },
		});

	// Handle metadata update
	const handleMetadataUpdate = useCallback(
		(addressString: `0x${string}`, _refetch: () => void) => {
			if (!validateMetadataEdit()) return;

			if (!factoryAddress) {
				toast({
					title: "Error",
					description: "Factory address not found for this network.",
					variant: "destructive",
				});
				return;
			}

			const updatedMetadata = {
				name: editName,
				description: editDescription,
				image: editImage,
				link: editLink,
			};
			const metadataJson = createMetadataJson(updatedMetadata);

			// Validate metadata size using consolidated utility
			const sizeValidation = validateMetadataSize(metadataJson);
			if (!sizeValidation.valid) {
				toast({
					title: "Metadata Too Large",
					description: sizeValidation.error || "Metadata exceeds size limit.",
					variant: "destructive",
				});
				return;
			}

			updateMetadata({
				address: factoryAddress,
				abi: cookieJarFactoryAbi,
				functionName: "updateMetadata",
				args: [addressString, metadataJson],
			});
		},
		[
			validateMetadataEdit,
			factoryAddress,
			editName,
			editDescription,
			editImage,
			editLink,
			updateMetadata,
			toast,
		],
	);

	// Handle metadata update success/error
	useEffect(() => {
		if (isMetadataUpdateSuccess) {
			toast({
				title: "Jar Info Updated",
				description: "Your cookie jar details have been saved.",
			});
			setIsEditingMetadata(false);
		}
	}, [isMetadataUpdateSuccess, toast]);

	useEffect(() => {
		if (metadataUpdateError) {
			toast({
				title: "Update Failed",
				description:
					metadataUpdateError.message || "Failed to update jar information.",
				variant: "destructive",
			});
		}
	}, [metadataUpdateError, toast]);

	return {
		metadata,
		isEditingMetadata,
		setIsEditingMetadata,
		editName,
		setEditName,
		editImage,
		setEditImage,
		editLink,
		setEditLink,
		editDescription,
		setEditDescription,
		startEditing,
		handleMetadataUpdate,
		isUpdatingMetadata,
		isWaitingForUpdate,
		parseMetadata,
	};
};
