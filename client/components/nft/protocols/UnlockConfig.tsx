import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ProtocolConfigBase } from "../base/ProtocolConfigBase";
import { UnlockProvider } from "@/lib/nft/protocols/UnlockProvider";

interface LockDetails {
  address: string;
  name: string;
  symbol?: string;
  price: string;
  maxNumberOfKeys: string;
  totalSupply: string;
  expirationDuration: string;
  currencySymbol?: string;
  balance?: string;
}

export interface UnlockConfigProps {
  onConfigChange: (config: { unlockAddress: string }) => void;
  initialConfig?: { unlockAddress: string };
  className?: string;
}

export const UnlockConfig: React.FC<UnlockConfigProps> = ({
  onConfigChange,
  initialConfig,
  className,
}) => {
  const [unlockAddress, setUnlockAddress] = useState(initialConfig?.unlockAddress || "");
  const [selectedLock, setSelectedLock] = useState<LockDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load initial lock if provided
  useEffect(() => {
    if (initialConfig?.unlockAddress && !selectedLock) {
      validateLock(initialConfig.unlockAddress);
    }
  }, [initialConfig, selectedLock]);

  const validateLock = async (lockAddress: string) => {
    if (!lockAddress) {
      setValidationError("Please enter an Unlock Protocol lock address.");
      return;
    }

    // Basic address validation
    if (!lockAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setValidationError("Please enter a valid Ethereum address.");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const lockDetails = await UnlockProvider.getLockDetails(lockAddress);
      
      if (lockDetails) {
        setSelectedLock(lockDetails);
        onConfigChange({ unlockAddress: lockAddress });
      } else {
        setValidationError("Lock not found. Please check the address.");
        setSelectedLock(null);
      }
    } catch (err) {
      console.error("Error validating Unlock lock:", err);
      setValidationError("Error validating lock. Please try again.");
      setSelectedLock(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setUnlockAddress(newAddress);
    setSelectedLock(null);
    setValidationError(null);
  };

  const handleValidate = () => {
    validateLock(unlockAddress);
  };

  const formatPrice = (priceValue: string, symbol?: string) => {
    try {
      const priceNum = parseFloat(priceValue);
      if (priceNum === 0) return "Free";
      return `${priceNum} ${symbol || "ETH"}`;
    } catch {
      return priceValue;
    }
  };

  const formatDuration = (seconds: string) => {
    try {
      const secs = parseInt(seconds);
      if (secs === 0) return "No expiration";
      
      const days = Math.floor(secs / (24 * 60 * 60));
      const hours = Math.floor((secs % (24 * 60 * 60)) / (60 * 60));
      
      if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` ${hours}h` : ''}`;
      }
      
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } catch {
      return seconds + " seconds";
    }
  };

  return (
    <ProtocolConfigBase
      title="Unlock Protocol Gate Configuration"
      description="Require users to hold a key from a specific Unlock lock to access this jar."
      icon="🔓"
      color="bg-blue-500"
      validationError={validationError}
      isLoading={isValidating}
      className={className}
      learnMoreUrl="https://unlock-protocol.com/"
    >
      <div className="space-y-4">
        {/* Lock Address Input */}
        <div>
          <Label htmlFor="unlock-address">Unlock Lock Contract Address *</Label>
          <Input
            id="unlock-address"
            placeholder="0x... (Smart contract address of the lock)"
            value={unlockAddress}
            onChange={handleAddressChange}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            The contract address of the Unlock Protocol lock
          </p>
        </div>

        {/* Validate Button */}
        <div>
          <Button
            onClick={handleValidate}
            disabled={isValidating || !unlockAddress}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating Lock...
              </>
            ) : (
              "Validate Lock"
            )}
          </Button>
        </div>

        {/* Selected Lock Display */}
        {selectedLock && (
          <div className="mt-4 p-4 border rounded-md bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-green-800">
                  Lock Validated Successfully
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <p><span className="font-medium">Name:</span> {selectedLock.name}</p>
                    <p><span className="font-medium">Address:</span> <code className="text-xs bg-gray-100 px-1 rounded">{selectedLock.address}</code></p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      Price: {formatPrice(selectedLock.price, selectedLock.currencySymbol)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Duration: {formatDuration(selectedLock.expirationDuration)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Supply: {selectedLock.totalSupply}/{selectedLock.maxNumberOfKeys}
                    </Badge>
                  </div>
                  
                  {selectedLock.symbol && (
                    <p><span className="font-medium">Symbol:</span> {selectedLock.symbol}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            Find existing locks at{" "}
            <a 
              href="https://unlock-protocol.com/locks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Unlock Protocol Explorer
            </a>
          </p>
          <p>
            Learn more about Unlock Protocol at{" "}
            <a 
              href="https://docs.unlock-protocol.com/" 
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

export default UnlockConfig;
