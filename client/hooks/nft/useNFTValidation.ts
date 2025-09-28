"use client";

import { useEnhancedNFTValidation } from "./useEnhancedNFTValidation";

/**
 * Basic NFT validation hook for backward compatibility
 */
export const useNFTValidation = (address: string) => {
  const enhanced = useEnhancedNFTValidation(address);

  return {
    isValid: enhanced.isValid,
    detectedType: enhanced.detectedType,
    isLoading: enhanced.isLoading,
    error: enhanced.error,
  };
};
