"use client";

import React, { useState } from 'react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { cookieJarAbi } from "@/generated";
import { cookieJarV1Abi } from "@/lib/abis/cookie-jar-v1-abi";
import { isV2Chain } from "@/config/supported-networks";
import { AllowlistAddressInput } from "./AllowListAddressInput";

interface AllowlistManagementProps {
  cookieJarAddress: `0x${string}`;
}

export const AllowlistManagement: React.FC<AllowlistManagementProps> = ({
  cookieJarAddress 
}) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("view-allowlist");
  const chainId = useChainId();
  const isV2 = isV2Chain(chainId);

  // Version-aware ABI and function selection
  const abi = isV2 ? cookieJarAbi : cookieJarV1Abi;
  const getAllowlistFunction = isV2 ? 'getAllowlist' : 'getWhitelist';
  const grantFunction = isV2 ? 'grantJarAllowlistRole' : 'grantJarWhitelistRole';
  const revokeFunction = isV2 ? 'revokeJarAllowlistRole' : 'revokeJarWhitelistRole';

  // Read allowlist with version-aware function name
  const { data: rawAllowlistData, isLoading: isLoadingAllowlist, refetch: refetchAllowlist } =
    useReadContract({
      address: cookieJarAddress,
      abi,
      functionName: getAllowlistFunction,
    });

  // Type-safe cast of allowlist data
  const allowlistedAddresses = rawAllowlistData as readonly `0x${string}`[] | undefined;

  // Write contract hooks
  const { writeContract: grantAllowlistRole } = useWriteContract();
  const { writeContract: revokeAllowlistRole } = useWriteContract();

  // Handle adding addresses to allowlist
  const handleAddToAllowlist = async (addresses: `0x${string}`[]) => {
    try {
      grantAllowlistRole({
        address: cookieJarAddress,
        abi,
        functionName: grantFunction,
        args: [addresses],
      });
      
      toast({
        title: "Transaction Submitted",
        description: `Adding ${addresses.length} address(es) to allowlist...`,
      });
      
      // Note: refetch will happen automatically when transaction is mined
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add addresses: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error; // Rethrow for AllowlistAddressInput's error handling
    }
  };

  // Handle removing addresses from allowlist
  const handleRemoveFromAllowlist = async (addresses: `0x${string}`[]) => {
    try {
      revokeAllowlistRole({
        address: cookieJarAddress,
        abi,
        functionName: revokeFunction,
        args: [addresses],
      });
      
      toast({
        title: "Transaction Submitted",
        description: `Removing ${addresses.length} address(es) from allowlist...`,
      });
      
      // Note: refetch will happen automatically when transaction is mined
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to remove addresses: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error; // Rethrow for AllowlistAddressInput's error handling
    }
  };

  return (
    <div className="w-full space-y-6">
      <Accordion
        type="single"
        collapsible
        value={activeSection}
        onValueChange={setActiveSection}
        className="w-full"
      >
        {/* View Current Allowlist */}
        <AccordionItem value="view-allowlist">
          <AccordionTrigger className="text-base">View Current Allowlist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                {isLoadingAllowlist ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : !allowlistedAddresses || allowlistedAddresses.length === 0 ? (
                  <p className="text-center text-muted-foreground">No addresses are allowlisted</p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {allowlistedAddresses.map((address: `0x${string}`, index: number) => (
                        <p key={index} className="font-mono text-sm">
                          {address}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Add to Allowlist */}
        <AccordionItem value="add-allowlist">
          <AccordionTrigger className="text-base">Add Addresses to Allowlist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <AllowlistAddressInput
                  mode="add"
                  currentAllowlist={(allowlistedAddresses || []) as readonly `0x${string}`[]}
                  onSubmit={handleAddToAllowlist}
                  placeholder="Enter Ethereum addresses to add, one per line, space, or comma"
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Remove from Allowlist */}
        <AccordionItem value="remove-allowlist">
          <AccordionTrigger className="text-base">Remove Addresses from Allowlist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <AllowlistAddressInput
                  mode="remove"
                  currentAllowlist={(allowlistedAddresses || []) as readonly `0x${string}`[]}
                  onSubmit={handleRemoveFromAllowlist}
                  placeholder="Enter Ethereum addresses to remove, one per line, space, or comma"
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AllowlistManagement;