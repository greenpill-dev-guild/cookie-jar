"use client";

import type React from "react";
import { useRouter } from "next/router";
import { useCookieJarConfig } from "../../hooks/UseCookiejar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Users, Coins } from "lucide-react";
import { useSendTransaction, useAccount } from "wagmi";
import { parseEther } from "viem";
import { type ReadContractErrorType } from "viem";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useWriteCookieJarDepositETH,
  useWriteCookieJarDepositCurrency,
} from "../../generated";

import { LoadingState } from "../../components/Loading";
import { ErrorAlert } from "../../components/Error";
import { AdminFunctions } from "../../components/admin/AdminFuctions";
import { ConfigView } from "../../components/users/ConfigView";
import { formatAddress } from "../../utils";
import DefaultFeeCollector from "../../components/FeeCollector/DefaultFeeCollector";

const CookieJarConfigDetails: React.FC = () => {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const { address } = router.query;
  const { data: hash, sendTransaction } = useSendTransaction();
  const { address: userAddress } = useAccount();

  const addressString = address as string;
  const isValidAddress =
    typeof address === "string" && address.startsWith("0x");

  const { config, isLoading, hasError, errors } = useCookieJarConfig(
    isValidAddress
      ? (address as `0x${string}`)
      : "0x0000000000000000000000000000000000000000"
  );

  // Check if the current user is the admin
  const isAdmin =
    userAddress &&
    config?.admin &&
    userAddress.toLowerCase() === config.admin.toLowerCase();

  // Check if the current CookieJar is whitelisted and access type is whitelisted
  const showUserFunctions =
    config?.whitelist === true && config?.accessType === "Whitelist";

  // Check if the current user is the fee collector
  const isFeeCollector =
    userAddress &&
    config?.feeCollector &&
    userAddress.toLowerCase() === config.feeCollector.toLowerCase();

  const { writeContract: DepositETH } = useWriteCookieJarDepositETH();
  const { writeContract: DepositCurrency } = useWriteCookieJarDepositCurrency();

  const onSubmit = (value: string) => {
    if (config.currency == "0x0000000000000000000000000000000000000003") {
      DepositETH({
        address: addressString as `0x${string}`,
        value: BigInt(value),
      });
    } else {
      DepositCurrency({
        address: addressString as `0x${string}`,
        args: [BigInt(value || "0")],
      });
    }
  };

  // Ensure the address is valid before proceeding
  if (!isValidAddress) {
    return (
      <ErrorAlert
        title="Invalid Address"
        description="No valid address was provided. Please check the URL and try again."
      />
    );
  }

  // Handle loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Handle errors
  if (hasError) {
    const formattedErrors = errors
      .filter((error): error is ReadContractErrorType => error !== null)
      .map((error) => ({ message: error.message || "Unknown error" }));
    return (
      <ErrorAlert
        title="Error Loading Configuration"
        errors={formattedErrors}
      />
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                CookieJar Configuration
                <Badge variant="outline" className="ml-2">
                  {formatAddress(addressString)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Detailed configuration for this CookieJar instance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {showUserFunctions && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Whitelisted Access
                </Badge>
              )}
              {isFeeCollector && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  Fee Collector
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="config">
            <TabsList className="mb-4">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              {isFeeCollector && (
                <TabsTrigger value="feeCollector">Fee Collector</TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="admin">Admin Functions</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="config">
              <ConfigView
                config={config}
                amount={amount}
                setAmount={setAmount}
                onSubmit={onSubmit}
              />
            </TabsContent>

            {isFeeCollector && (
              <TabsContent value="feeCollector">
                {/* Fee Collector Functions Content */}
                <div className="space-y-4">
                  <DefaultFeeCollector
                    contractAddress={address as `0x${string}`}
                  />
                </div>
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="admin">
                <AdminFunctions address={address as `0x${string}`} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieJarConfigDetails;
