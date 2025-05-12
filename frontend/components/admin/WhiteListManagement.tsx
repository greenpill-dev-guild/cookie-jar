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
import { useToast } from "@/components/ui/use-toast";
import { 
  useReadCookieJarGetWhitelist, 
  useWriteCookieJarGrantJarWhitelistRole, 
  useWriteCookieJarRevokeJarWhitelistRole 
} from "@/generated";
import { WhiteListAddressInput } from "./WhiteListAddressInput";

interface WhitelistManagementProps {
  cookieJarAddress: `0x${string}`;
}

export const WhitelistManagement: React.FC<WhitelistManagementProps> = ({ 
  cookieJarAddress 
}) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("view-whitelist");

  // Read whitelist
  const { data: whitelistedAddresses, isLoading: isLoadingWhitelist, refetch: refetchWhitelist } = 
    useReadCookieJarGetWhitelist({
      address: cookieJarAddress,
    });

  // Grant whitelist role
  const { writeContractAsync: grantWhitelistRole } = useWriteCookieJarGrantJarWhitelistRole();

  // Revoke whitelist role
  const { writeContractAsync: revokeWhitelistRole } = useWriteCookieJarRevokeJarWhitelistRole();

  // Handle adding addresses to whitelist
  const handleAddToWhitelist = async (addresses: `0x${string}`[]) => {
    try {
      await grantWhitelistRole({
        address: cookieJarAddress,
        args: [addresses],
      });
      
      toast({
        title: "Success",
        description: `Added ${addresses.length} address(es) to whitelist`,
      });
      
      // Refresh whitelist data
      refetchWhitelist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add addresses: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error; // Rethrow for WhiteListAddressInput's error handling
    }
  };

  // Handle removing addresses from whitelist
  const handleRemoveFromWhitelist = async (addresses: `0x${string}`[]) => {
    try {
      await revokeWhitelistRole({
        address: cookieJarAddress,
        args: [addresses],
      });
      
      toast({
        title: "Success",
        description: `Removed ${addresses.length} address(es) from whitelist`,
      });
      
      // Refresh whitelist data
      refetchWhitelist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to remove addresses: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error; // Rethrow for WhiteListAddressInput's error handling
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
        {/* View Current Whitelist */}
        <AccordionItem value="view-whitelist">
          <AccordionTrigger className="text-base">View Current Whitelist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                {isLoadingWhitelist ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : !whitelistedAddresses || whitelistedAddresses.length === 0 ? (
                  <p className="text-center text-muted-foreground">No addresses are whitelisted</p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {whitelistedAddresses.map((address, index) => (
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

        {/* Add to Whitelist */}
        <AccordionItem value="add-whitelist">
          <AccordionTrigger className="text-base">Add Addresses to Whitelist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <WhiteListAddressInput
                  mode="add"
                  currentWhitelist={whitelistedAddresses || []}
                  onSubmit={handleAddToWhitelist}
                  placeholder="Enter Ethereum addresses to add, one per line, space, or comma"
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Remove from Whitelist */}
        <AccordionItem value="remove-whitelist">
          <AccordionTrigger className="text-base">Remove Addresses from Whitelist</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <WhiteListAddressInput
                  mode="remove"
                  currentWhitelist={whitelistedAddresses || []}
                  onSubmit={handleRemoveFromWhitelist}
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

export default WhitelistManagement;