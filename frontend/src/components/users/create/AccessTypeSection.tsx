// src/components/CookieJar/AccessTypeSection.tsx
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
// Enums matching the contract
export enum AccessType {
    Whitelist = 0,
    NFTGated = 1,
  }
  
  export enum WithdrawalTypeOptions {
    Fixed = 0,
    Variable = 1,
  }
  
  export enum NFTType {
    ERC721 = 0,
    ERC1155 = 1,
    Soulbound = 2,
  }
interface AccessTypeSectionProps {
  accessType: AccessType;
  setAccessType: (type: AccessType) => void;
  nftAddresses: string[];
  setNftAddresses: (addresses: string[]) => void;
  nftTypes: number[];
  setNftTypes: (types: number[]) => void;
}

export const AccessTypeSection: React.FC<AccessTypeSectionProps> = ({
  accessType,
  setAccessType,
  nftAddresses,
  setNftAddresses,
  nftTypes,
  setNftTypes
}) => {
  const [newNftAddress, setNewNftAddress] = useState("");
  const [newNftType, setNewNftType] = useState<number>(NFTType.ERC721);

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

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="accessType">Access Type</Label>
        <Select
          value={accessType.toString()}
          onValueChange={(value) => setAccessType(Number(value) as AccessType)}
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
                onValueChange={(value) => setNewNftType(Number(value) as NFTType)}
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
            <Button type="button" variant="outline" size="icon" onClick={addNft}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Display list of added NFTs */}
          {nftAddresses.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Added NFTs:</Label>
              <div className="space-y-2">
                {nftAddresses.map((address, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{address}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({nftTypes[index] === 0 ? "ERC721" : nftTypes[index] === 1 ? "ERC1155" : "SoulBound"})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNft(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};