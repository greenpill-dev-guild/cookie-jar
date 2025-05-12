"use client";

import React, { useState, useCallback } from 'react';
import { isAddress } from 'viem';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface WhiteListAddressInputProps {
  mode: 'add' | 'remove';
  currentWhitelist: string[];
  onSubmit: (addresses: `0x${string}`[]) => Promise<void>;
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

   const validateAddresses = useCallback((input: string) => {
    const parts = input
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const valid: `0x${string}`[] = [];
    const invalid: string[] = [];

    // Check if each part is a valid address
    for (const p of parts) {
      if (isAddress(p)) {
        valid.push(p.toLowerCase() as `0x${string}`);
      } else {
        invalid.push(p);
      }
    }

    const uniqueValid = Array.from(new Set(valid));
    
    return { valid: uniqueValid, invalid };
  }, []);

  const filterByMode = useCallback((addrs: `0x${string}`[]) => {
    if (mode === 'add') {
      return addrs.filter(a => !currentWhitelist.includes(a));
    } else {
      return addrs.filter(a => currentWhitelist.includes(a));
    }
  }, [currentWhitelist, mode]);

  const handleSubmit = async () => {
    setError(null);
    if (!inputValue.trim()) return;

    try {
      const { valid, invalid } = validateAddresses(inputValue);

      if (invalid.length > 0) {
        setError(`Invalid addresses: ${invalid.join(', ')}`);
        return;
      }

      const toSubmit = filterByMode(valid);
      if (toSubmit.length === 0) {
        setError(
          mode === 'add'
            ? 'All addresses are already whitelisted'
            : 'None of the addresses are currently whitelisted'
        );
        return;
      }

      setIsSubmitting(true);
      await onSubmit(toSubmit);
      setInputValue('');
    } catch (err: any) {
      setError(`Transaction failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Textarea
        placeholder={placeholder}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        disabled={isSubmitting}
        className="min-h-[150px]"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !inputValue.trim()}
        className="w-full"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonLabel || (mode === 'add' ? 'Add Addresses' : 'Remove Addresses')}
      </Button>
    </div>
  );
};