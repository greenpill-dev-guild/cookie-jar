"use client";

import React, { useState, useTransition } from "react";
import { useWriteCookieJarFactoryCreateCookieJar } from "../../generated";
import { useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

// Enums matching the contract
enum AccessType {
  Whitelist = 0,
  NFTGated = 1,
}

enum WithdrawalTypeOptions {
  Fixed = 0,
  Variable = 1,
}

enum NFTType {
  ERC721 = 0,
  ERC1155 = 1,
  Soulbound = 2,
}

const CreateCookieJarForm: React.FC = () => {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [jarOwnerAddress, setJarOwnerAddress] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000000"
  );
  const [supportedCurrency, setSupportedCurrency] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000003" // ETHEREUM DEFAULT CURRENCY
  );
  const [accessType, setAccessType] = useState<AccessType>(
    AccessType.Whitelist
  );
  const [withdrawalOption, setWithdrawalOption] =
    useState<WithdrawalTypeOptions>(WithdrawalTypeOptions.Fixed);
  const [fixedAmount, setFixedAmount] = useState("0");
  const [maxWithdrawal, setMaxWithdrawal] = useState("0");
  const [withdrawalInterval, setWithdrawalInterval] = useState("0");
  const [strictPurpose, setStrictPurpose] = useState(false);
  const [emergencyWithdrawalEnabled, setEmergencyWithdrawalEnabled] =
    useState(true);
  const [oneTimeWithdrawal, setOneTimeWithdrawal] = useState(false);
  const [metadata, setMetadata] = useState("");
  const { isConnected } = useAccount();

  // NFT management
  const [nftAddresses, setNftAddresses] = useState<string[]>([]);
  const [nftTypes, setNftTypes] = useState<number[]>([]);
  const [newNftAddress, setNewNftAddress] = useState("");
  const [newNftType, setNewNftType] = useState<number>(NFTType.ERC721);

  // Contract write hook
  const {
    writeContract: createCookieJar,
    data: txHash,
    isPending: isCreating,
    isSuccess: isSubmitted,
    error: createError,
  } = useWriteCookieJarFactoryCreateCookieJar();

  // Transaction receipt hook
  const {
    data: receipt,
    isLoading: isWaitingForReceipt,
    isSuccess: txConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Add an NFT address and type
  const addNft = () => {
    if (newNftAddress) {
      setNftAddresses([...nftAddresses, newNftAddress]);
      setNftTypes([...nftTypes, newNftType]);
      setNewNftAddress("");
    }
  };

  // Remove an NFT address and type
  const removeNft = (index: number) => {
    setNftAddresses(nftAddresses.filter((_, i) => i !== index));
    setNftTypes(nftTypes.filter((_, i) => i !== index));
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(() => {
      // Only use NFT addresses if access type is TokenGated
      const effectiveNftAddresses =
        accessType === AccessType.NFTGated ? nftAddresses : [];
      const effectiveNftTypes =
        accessType === AccessType.NFTGated ? nftTypes : [];

      try {
        createCookieJar({
          args: [
            jarOwnerAddress,
            supportedCurrency,
            accessType,
            effectiveNftAddresses as readonly `0x${string}`[],
            effectiveNftTypes,
            withdrawalOption,
            BigInt(fixedAmount || "0"),
            BigInt(maxWithdrawal || "0"),
            BigInt(withdrawalInterval || "0"),
            strictPurpose,
            emergencyWithdrawalEnabled,
            oneTimeWithdrawal,
            metadata,
          ],
        });
      } catch (error) {
        console.error("Error creating cookie jar:", error);
      }
    });
  };

  // Reset form after submission
  const resetForm = () => {
    setJarOwnerAddress("0x0000000000000000000000000000000000000000");
    setSupportedCurrency("0x0000000000000000000000000000000000000000");
    setAccessType(AccessType.Whitelist);
    setWithdrawalOption(WithdrawalTypeOptions.Fixed);
    setFixedAmount("0");
    setMaxWithdrawal("0");
    setWithdrawalInterval("0");
    setStrictPurpose(false);
    setEmergencyWithdrawalEnabled(true);
    setOneTimeWithdrawal(false);
    setMetadata("");
    setNftAddresses([]);
    setNftTypes([]);
  };

  // Display success when transaction is confirmed
  React.useEffect(() => {
    if (txConfirmed && receipt) {
      // Reset form after successful creation
      resetForm();
    }
  }, [txConfirmed, receipt, txHash]);

  // Show error if transaction fails
  React.useEffect(() => {
    if (createError) {
      console.error("Transaction error:", createError);
      alert(`Transaction failed: ${createError.message}`);
    }
  }, [createError]);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Cookie Jar</CardTitle>
        <CardDescription>
          Configure and deploy a new cookie jar onchain
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Jar Owner Address */}
          <div className="space-y-2">
            <Label htmlFor="admin">Jar Owner Address</Label>
            <Input
              id="jarOwner"
              placeholder="0x..."
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("0x") && value.length === 42) {
                  setJarOwnerAddress(value as `0x${string}`);
                } else {
                  console.error("Invalid Ethereum address");
                }
              }}
              required
            />
            <p className="text-sm text-muted-foreground">
              The address that will have owner/admin rights for this cookie jar
            </p>
          </div>

          {/* Supported Currency*/}
          <div className="space-y-2">
            <Label htmlFor="admin">Supported Currency for Jar</Label>
            <Input
              id="supportedCurrency"
              placeholder="0x..."
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("0x") && value.length === 42) {
                  setSupportedCurrency(value as `0x${string}`);
                } else {
                  console.error("Invalid Token address");
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              Address of the token contract of the currency to support, address
              (3) for native ETH with will be the case if left blank.
            </p>
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label htmlFor="accessType">Access Type</Label>
            <Select
              value={accessType.toString()}
              onValueChange={(value) =>
                setAccessType(Number(value) as AccessType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Whitelist</SelectItem>
                <SelectItem value="1">NFT Gated</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Determine who can access this cookie jar
            </p>
          </div>

          {/* NFT Addresses (only show if TokenGated is selected) */}
          {accessType === AccessType.NFTGated && (
            <div className="space-y-4">
              <Label>NFT Addresses & Types</Label>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-sm">NFT Address</Label>
                  <Input
                    placeholder="0x..."
                    value={newNftAddress}
                    onChange={(e) => setNewNftAddress(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Label className="text-sm">NFT Type</Label>
                  <Select
                    value={newNftType.toString()}
                    onValueChange={(value) =>
                      setNewNftType(Number(value) as NFTType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">ERC721</SelectItem>
                      <SelectItem value="1">ERC1155</SelectItem>
                      <SelectItem value="2">SoulBound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addNft}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Withdrawal Option */}
          <div className="space-y-2">
            <Label htmlFor="withdrawalOption">Withdrawal Option</Label>
            <Select
              value={withdrawalOption.toString()}
              onValueChange={(value) =>
                setWithdrawalOption(Number(value) as WithdrawalTypeOptions)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Fixed</SelectItem>
                <SelectItem value="1">Variable</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How withdrawals will be handled
            </p>
          </div>

          {/* Fixed Amount (show if Fixed is selected) */}
          {withdrawalOption === WithdrawalTypeOptions.Fixed && (
            <div className="space-y-2">
              <Label htmlFor="fixedAmount">Fixed Amount </Label>
              <Input
                id="fixedAmount"
                type="text"
                placeholder="0.1"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Fixed withdrawal amount
              </p>
            </div>
          )}

          {/* Max Withdrawal (show if Range is selected) */}
          {withdrawalOption === WithdrawalTypeOptions.Variable && (
            <div className="space-y-2">
              <Label htmlFor="maxWithdrawal">Maximum Withdrawal </Label>
              <Input
                id="maxWithdrawal"
                type="text"
                placeholder="1.0"
                value={maxWithdrawal}
                onChange={(e) => setMaxWithdrawal(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Maximum withdrawal amount in wei, so we can support erc20
                withdrawals too.
              </p>
            </div>
          )}

          {/* Withdrawal Interval */}
          <div className="space-y-2">
            <Label htmlFor="withdrawalInterval">
              Withdrawal Interval (seconds)
            </Label>
            <Input
              id="withdrawalInterval"
              type="number"
              placeholder="86400"
              value={withdrawalInterval}
              onChange={(e) => setWithdrawalInterval(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Time between allowed withdrawals (86400 = 1 day)
            </p>
          </div>

          {/* Strict Purpose */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="strictPurpose"
              checked={strictPurpose}
              onCheckedChange={(checked) =>
                setStrictPurpose(checked as boolean)
              }
            />
            <div className="grid gap-1.5">
              <Label htmlFor="strictPurpose">Strict Purpose</Label>
              <p className="text-sm text-muted-foreground">
                Enforce strict purpose for withdrawals
              </p>
            </div>
          </div>

          {/* Emergency Withdrawal */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="emergencyWithdrawal"
              checked={emergencyWithdrawalEnabled}
              onCheckedChange={(checked) =>
                setEmergencyWithdrawalEnabled(checked as boolean)
              }
            />
            <div className="grid gap-1.5">
              <Label htmlFor="emergencyWithdrawal">Emergency Withdrawal</Label>
              <p className="text-sm text-muted-foreground">
                Allow emergency withdrawals by jar owner
              </p>
            </div>
          </div>

          {/* One TIme Withdrawal */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="oneTimeWithdrawal"
              checked={oneTimeWithdrawal}
              onCheckedChange={(checked) =>
                setOneTimeWithdrawal(checked as boolean)
              }
            />
            <div className="grid gap-1.5">
              <Label htmlFor="oneTimeWithdrawal">One Time Withdrawal</Label>
              <p className="text-sm text-muted-foreground">
                If whitelisted users can only withdraw once.
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata</Label>
            <Textarea
              id="metadata"
              placeholder="Provide a description or any additional information"
              className="min-h-24"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Additional information about this cookie jar
            </p>
          </div>

          {/* Transaction status alerts */}
          {isSubmitted && !txConfirmed && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertTitle>Transaction Submitted</AlertTitle>
              <AlertDescription>
                Your transaction has been submitted. Waiting for confirmation...
              </AlertDescription>
            </Alert>
          )}

          {txConfirmed && (
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle>Cookie Jar Created!</AlertTitle>
              <AlertDescription>
                Your cookie jar has been created successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isCreating || isWaitingForReceipt}
          >
            {(isPending || isCreating || isWaitingForReceipt) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isCreating
              ? "Creating..."
              : isWaitingForReceipt
                ? "Confirming..."
                : "Create Cookie Jar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateCookieJarForm;
