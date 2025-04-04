import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseEther } from "viem";
import {
  useWriteCookieJarTransferJarOwnership,
  useWriteCookieJarGrantJarWhitelistRole,
  useWriteCookieJarRevokeJarWhitelistRole,
  useWriteCookieJarGrantJarBlacklistRole,
  useWriteCookieJarRevokeJarBlacklistRole,
  useWriteCookieJarEmergencyWithdrawWithoutState,
  useWriteCookieJarEmergencyWithdrawCurrencyWithState,
  useWriteCookieJarAddNftGate,
  useWriteCookieJarRemoveNftGate,
} from "../../generated";

enum NFTType {
  ERC721 = 0,
  ERC1155 = 1,
  Soulbound = 2,
}

interface AdminFunctionsProps {
  address: `0x${string}`;
}

export const AdminFunctions: React.FC<AdminFunctionsProps> = ({ address }) => {
  const [newJarOwner, setNewJarOwner] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [addressToUpdate, setAddressToUpdate] = useState("");
  const [nftAddress, setNftAddress] = useState("");
  const [nftTokenId, setNftTokenId] = useState("");

  const {
    writeContract: transferJarOwnership,
    data: adminData,
    error: adminError,
  } = useWriteCookieJarTransferJarOwnership();

  const {
    writeContract: emergencyWithdrawWithoutState,
    data: emergencyWithdrawWithoutStateData,
    error: emergencyWithdrawWithoutStateError,
  } = useWriteCookieJarEmergencyWithdrawWithoutState();

  const {
    writeContract: emergencyWithdrawCurrencyWithState,
    data: emergencyWithdrawWithStateData,
    error: emergencyWithdrawWithStateError,
  } = useWriteCookieJarEmergencyWithdrawCurrencyWithState();

  const {
    writeContract: grantJarWhitelistRole,
    data: whitelistGrantData,
    error: whitelistGrantError,
  } = useWriteCookieJarGrantJarWhitelistRole();

  const {
    writeContract: revokeJarWhitelistRole,
    data: whitelistRevokeData,
    error: whitelistRevokeError,
  } = useWriteCookieJarRevokeJarWhitelistRole();

  const {
    writeContract: grantJarBlacklistRole,
    data: blacklistGrantData,
    error: blacklistGrantError,
  } = useWriteCookieJarGrantJarBlacklistRole();

  const {
    writeContract: revokeJarBlacklistRole,
    data: blacklistRevokeData,
    error: blacklistRevokeError,
  } = useWriteCookieJarRevokeJarBlacklistRole();

  const {
    writeContract: addNftGate,
    data: nftGateData,
    error: nftGateError,
  } = useWriteCookieJarAddNftGate();

  const {
    writeContract: removeNftGate,
    data: removeNftGateData,
    error: removeNftGateError,
  } = useWriteCookieJarRemoveNftGate();

  // Admin functions
  const handleTransferJarOwnership = () => {
    if (!newJarOwner) return;
    transferJarOwnership({
      address: address,
      args: [newJarOwner as `0x${string}`],
    });
  };

  const handleEmergencyWithdraw = () => {
    if (!withdrawalAmount) return;
    console.log("Emergency withdrawal amount:", withdrawalAmount);
    if (tokenAddress.length > 3) {
      emergencyWithdrawWithoutState({
        address: address,
        args: [tokenAddress as `0x${string}`, BigInt(withdrawalAmount)],
      });
    } else {
      emergencyWithdrawCurrencyWithState({
        address: address,
        args: [
          parseEther(withdrawalAmount), // amount as second argument
        ],
      });
    }
  };

  const handleGrantJarBlacklistRole = () => {
    if (!addressToUpdate) return;
    console.log(`"Adding  addresses to blacklist:`, addressToUpdate);
    grantJarBlacklistRole({
      address: address,
      args: [[addressToUpdate as `0x${string}`]],
    });
  };

  const handleRevokeJarBlacklistRole = () => {
    if (!addressToUpdate) return;
    console.log(`Removing address from blacklist:`, addressToUpdate);
    revokeJarBlacklistRole({
      address: address,
      args: [[addressToUpdate as `0x${string}`]],
    });
  };

  const handleGrantJarWhitelistRole = () => {
    if (!addressToUpdate) return;
    console.log(`Adding address to whitelist:`, addressToUpdate);
    grantJarWhitelistRole({
      address: address,
      args: [[addressToUpdate as `0x${string}`]],
    });
  };

  const handleRevokeJarWhitelistRole = () => {
    if (!addressToUpdate) return;
    console.log(`Removing address from whitelist:`, addressToUpdate);
    revokeJarWhitelistRole({
      address: address,
      args: [[addressToUpdate as `0x${string}`]],
    });
  };

  const handleAddNFTGate = () => {
    if (!nftAddress || !nftTokenId) return;
    console.log("Adding NFT gate:", nftAddress, nftTokenId);
    addNftGate({
      address: address,
      args: [nftAddress as `0x${string}`, parseInt(nftTokenId, 10)],
    });
  };

  const handleRemoveNFTGate = () => {
    if (!nftAddress) return;
    console.log("Removing NFT gate:", nftAddress);
    removeNftGate({
      address: address,
      args: [nftAddress as `0x${string}`],
    });
  };

  return (
    <div className="space-y-6">
      <div className="border p-4 rounded-md">
        <h3 className="font-medium mb-2">Transfer Jar Ownership</h3>
        <div className="flex gap-2">
          <Input
            placeholder="New admin address"
            value={newJarOwner}
            onChange={(e) => setNewJarOwner(e.target.value)}
          />
          <Button onClick={handleTransferJarOwnership}>Update</Button>
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <h3 className="font-medium mb-2">Emergency Withdraw</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Amount to withdraw"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
          />
          <Input
            placeholder="Token address to withdraw: Only fill in this, if using without state change withdraw."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <Button onClick={handleEmergencyWithdraw} variant="destructive">
            Withdraw
          </Button>
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <h3 className="font-medium mb-2">Whitelist/Blacklist Management</h3>
        <Input
          placeholder="Address to update"
          value={addressToUpdate}
          onChange={(e) => setAddressToUpdate(e.target.value)}
          className="mb-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => handleGrantJarWhitelistRole()}>
            Add to Whitelist
          </Button>
          <Button
            onClick={() => handleRevokeJarWhitelistRole()}
            variant="outline"
          >
            Remove from Whitelist
          </Button>
          <Button onClick={() => handleGrantJarBlacklistRole()}>
            Add to Blacklist
          </Button>
          <Button
            onClick={() => handleRevokeJarBlacklistRole()}
            variant="outline"
          >
            Remove from Blacklist
          </Button>
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <h3 className="font-medium mb-2">NFT Gate Management</h3>
        <div className="space-y-2 mb-2">
          <Input
            placeholder="NFT contract address"
            value={nftAddress}
            onChange={(e) => setNftAddress(e.target.value)}
          />
          <Select onValueChange={setNftTokenId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select NFT Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NFTType)
                .filter(([key]) => isNaN(Number(key))) // Remove reverse-mapped numeric keys
                .map(([key, value]) => (
                  <SelectItem key={value} value={String(value)}>
                    {key}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNFTGate}>Add NFT Gate</Button>
          <Button onClick={handleRemoveNFTGate} variant="outline">
            Remove NFT Gate
          </Button>
        </div>
      </div>
    </div>
  );
};
