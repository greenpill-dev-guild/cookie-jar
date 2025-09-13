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
  useReadCookieJarGetAllowlist,
  useWriteCookieJarGrantJarAllowlistRole,
  useWriteCookieJarRevokeJarAllowlistRole
} from "@/generated";
import { AllowlistAddressInput } from "./AllowlistAddressInput";

interface AllowlistManagementProps {
  cookieJarAddress: `0x${string}`;
}

export const AllowlistManagement: React.FC<AllowlistManagementProps> = ({
  cookieJarAddress 
}) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("view-allowlist");

  // Read allowlist
  const { data: allowlistedAddresses, isLoading: isLoadingAllowlist, refetch: refetchAllowlist } =
    useReadCookieJarGetAllowlist({
      address: cookieJarAddress,
    });

  // Grant allowlist role
  const { writeContractAsync: grantAllowlistRole } = useWriteCookieJarGrantJarAllowlistRole();

  // Revoke allowlist role
  const { writeContractAsync: revokeAllowlistRole } = useWriteCookieJarRevokeJarAllowlistRole();

  // Handle adding addresses to allowlist
  const handleAddToAllowlist = async (addresses: `0x${string}`[]) => {
    try {
      await grantAllowlistRole({
        address: cookieJarAddress,
        args: [addresses],
      });
      
      toast({
        title: "Success",
        description: `Added ${addresses.length} address(es) to allowlist`,
      });
      
      // Refresh allowlist data
      refetchAllowlist();
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
      await revokeAllowlistRole({
        address: cookieJarAddress,
        args: [addresses],
      });
      
      toast({
        title: "Success",
        description: `Removed ${addresses.length} address(es) from allowlist`,
      });
      
      // Refresh allowlist data
      refetchAllowlist();
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
                      {allowlistedAddresses.map((address, index) => (
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
                  currentAllowlist={allowlistedAddresses || []}
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
                  currentAllowlist={allowlistedAddresses || []}
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