"use client";

import React, { useState, useCallback } from 'react';
import {useEnsAddress } from 'wagmi';
import {isAddress } from 'viem';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface WhiteListAddressInputProps {
  mode: 'add' | 'remove';
  currentWhitelist: string[];
  onSubmit: (addresses: string[]) => Promise<void>;
  buttonLabel?: string;
  placeholder?: string;
}

export const WhiteListAddressInput: React.FC<WhiteListAddressInputProps> = ({
  mode,
  currentWhitelist,
  onSubmit,
  buttonLabel,
  placeholder = 'Enter addresses, one per line, space, or comma'
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingValidation, setPendingValidation] = useState<string[]>([]);
  
  // Parse input into array of potential addresses
  const parseInputToAddressCandidates = useCallback((input: string): string[] => {
    // Split by newline, comma, or space
    return input
      .split(/[\n,\s]+/)
      .map(addr => addr.trim())
      .filter(addr => addr !== '');
  }, []);

  // Wagmi hook to resolve ENS names
  const { data: ensAddress, isLoading: isResolvingEns } = useEnsAddress({
    name: pendingValidation.length > 0 ? pendingValidation[0] : undefined,
    enabled: pendingValidation.length > 0,
    onSuccess: (address) => {
      if (address) {
        // Found valid ENS resolution
        handleValidAddress(address);
      } else {
        // ENS lookup failed
        handleInvalidAddress(pendingValidation[0]);
      }
      // Continue with next address
      setPendingValidation(prev => prev.slice(1));
    },
    onError: () => {
      // ENS lookup error
      handleInvalidAddress(pendingValidation[0]);
      setPendingValidation(prev => prev.slice(1));
    }
  });

  // Storage for processed addresses
  const [validAddresses, setValidAddresses] = useState<string[]>([]);
  const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);

  // Handle a valid address (either direct or via ENS)
  const handleValidAddress = useCallback((address: string) => {
    setValidAddresses(prev => [...prev, address.toLowerCase()]);
  }, []);

  // Handle an invalid address
  const handleInvalidAddress = useCallback((input: string) => {
    setInvalidAddresses(prev => [...prev, input]);
  }, []);

  const validateAddresses = useCallback(async () => {
    setValidAddresses([]);
    setInvalidAddresses([]);
    setError(null);
    
    const candidates = parseInputToAddressCandidates(inputValue);
    if (candidates.length === 0) return [];

    // Process each candidate
    const directlyValid: string[] = [];
    const needEnsResolution: string[] = [];

    candidates.forEach(candidate => {
      if (isAddress(candidate)) {
        directlyValid.push(candidate.toLowerCase());
      } else if (candidate.includes('.eth') || candidate.includes('.')) {
        // Potential ENS name - queue for resolution
        needEnsResolution.push(candidate);
      } else {
        // Not a valid address or ENS format
        handleInvalidAddress(candidate);
      }
    });

    // Add all directly valid addresses
    directlyValid.forEach(handleValidAddress);
    
    // Queue ENS names for resolution
    if (needEnsResolution.length > 0) {
      setPendingValidation(needEnsResolution);
      return []; // Will continue processing via the useEnsAddress hook
    }
    
    return directlyValid;
  }, [inputValue, parseInputToAddressCandidates, handleValidAddress, handleInvalidAddress]);

  // Filter addresses based on the mode (add or remove)
  const filterAddressesByMode = useCallback((addresses: string[]): string[] => {
    if (mode === 'add') {
      // Only return addresses not in the current whitelist
      return addresses.filter(addr => !currentWhitelist.includes(addr.toLowerCase()));
    } else {
      // Only return addresses that are in the current whitelist
      return addresses.filter(addr => currentWhitelist.includes(addr.toLowerCase()));
    }
  }, [currentWhitelist, mode]);

  const handleSubmit = async () => {
    if (pendingValidation.length > 0) {
      setError("Still resolving ENS names, please wait");
      return;
    }

    if (invalidAddresses.length > 0) {
      setError(`Invalid addresses: ${invalidAddresses.join(', ')}`);
      return;
    }

    if (validAddresses.length === 0) {
      await validateAddresses();
      return; // This will trigger useEnsAddress and eventually recall handleSubmit
    }

    const filteredAddresses = filterAddressesByMode(validAddresses);
    
    if (filteredAddresses.length === 0) {
      setError(
        mode === 'add' 
          ? 'All addresses are already whitelisted' 
          : 'None of the addresses are currently whitelisted'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(filteredAddresses);
      setInputValue(''); // Clear input on success
      setValidAddresses([]);
      setInvalidAddresses([]);
    } catch (err) {
      setError(`Transaction failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isSubmitting || isResolvingEns || pendingValidation.length > 0;

  return (
    <div className="w-full space-y-4">
      <Textarea
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isProcessing}
        className="min-h-[150px]"
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invalidAddresses.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Invalid addresses: {invalidAddresses.join(', ')}
          </AlertDescription>
        </Alert>
      )}
      
      {pendingValidation.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Resolving ENS names ({pendingValidation.length} remaining)
        </div>
      )}
      
      <Button 
        onClick={handleSubmit}
        disabled={isProcessing || !inputValue.trim()}
        className="w-full"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonLabel || (mode === 'add' ? 'Add Addresses' : 'Remove Addresses')}
      </Button>
    </div>
  );
};