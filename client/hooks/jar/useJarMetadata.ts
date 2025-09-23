"use client";

import { useState, useEffect, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";

import { cookieJarFactoryAbi } from "@/generated";
import { contractAddresses } from "@/config/supported-networks";

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

  // Parse metadata from config
  const parseMetadata = useCallback((metadataString: string | undefined): JarMetadata => {
    if (!metadataString)
      return { name: "Cookie Jar", description: "", image: "", link: "" };

    try {
      const parsed = JSON.parse(metadataString);
      return {
        name: parsed.name || "Cookie Jar",
        description: parsed.description || metadataString, // fallback to raw string
        image: parsed.image || "",
        link: parsed.link || "",
      };
    } catch {
      // If not JSON, treat as legacy description-only metadata
      return {
        name: metadataString || "Cookie Jar",
        description: "",
        image: "",
        link: "",
      };
    }
  }, []);

  const metadata = parseMetadata(config?.metadata);

  // Initialize edit fields when entering edit mode
  const startEditing = useCallback(() => {
    setEditName(metadata.name);
    setEditImage(metadata.image);
    setEditLink(metadata.link);
    setEditDescription(metadata.description);
    setIsEditingMetadata(true);
  }, [metadata]);

  // URL validation helper
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

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
  const handleMetadataUpdate = useCallback((addressString: `0x${string}`, refetch: () => void) => {
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
    const metadataJson = JSON.stringify(updatedMetadata);

    // Validate metadata size (8KB limit)
    const metadataSize = new TextEncoder().encode(metadataJson).length;
    if (metadataSize > 8192) {
      toast({
        title: "Metadata Too Large",
        description: `Metadata is too large (${metadataSize} bytes). Maximum allowed size is 8KB (8,192 bytes). Please reduce the length of your jar name, description, or URLs.`,
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
  }, [validateMetadataEdit, factoryAddress, editName, editDescription, editImage, editLink, updateMetadata, toast]);

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
