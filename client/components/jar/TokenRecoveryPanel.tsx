"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/app/useToast";
import { useAccount, useChainId } from "wagmi";
import { 
  RefreshCw, 
  AlertTriangle, 
  ArrowRightLeft, 
  Coins,
  ExternalLink,
  Info
} from "lucide-react";
import { formatUnits } from "viem";
import { formatAddress } from "@/lib/app/utils";
import { usePendingTokens } from "@/hooks/jar/usePendingTokens";
import { useTokenRecoveryActions } from "@/hooks/jar/useTokenRecoveryActions";


interface TokenRecoveryPanelProps {
  jarAddress: `0x${string}`;
  jarTokenAddress: `0x${string}`;
  jarTokenSymbol: string;
  isAdmin: boolean;
}

export const TokenRecoveryPanel: React.FC<TokenRecoveryPanelProps> = ({ 
  jarAddress, 
  jarTokenAddress,
  jarTokenSymbol,
  isAdmin 
}) => {
  const { toast } = useToast();
  const chainId = useChainId();
  const { address: userAddress } = useAccount();

  // Use real contract hooks
  const {
    pendingTokens,
    isLoading,
    totalEstimatedValue,
    swappableTokensCount,
    formatTokenBalance,
    refetch,
    isRefetching,
  } = usePendingTokens(jarAddress);

  const {
    swapPendingToken,
    isSwapping,
    isSwappingToken,
  } = useTokenRecoveryActions(jarAddress);

  const handleSwapToken = async (tokenAddress: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only jar admin can perform token swaps.",
        variant: "destructive",
      });
      return;
    }

    await swapPendingToken(tokenAddress);
  };

  const handleRefreshBalances = async () => {
    await refetch();
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Token Recovery
            {pendingTokens.length > 0 && (
              <Badge variant="secondary">
                {pendingTokens.length} pending
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshBalances}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isAdmin && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Only the jar admin can perform token recovery operations.
            </AlertDescription>
          </Alert>
        )}

        {pendingTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Pending Tokens</p>
            <p className="text-sm">
              Tokens sent to this jar will appear here for recovery and swapping.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {pendingTokens.length}
                  </div>
                  <div className="text-sm text-gray-600">Pending Tokens</div>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {swappableTokensCount}
                  </div>
                  <div className="text-sm text-gray-600">Swappable</div>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatUnits(totalEstimatedValue, 18).slice(0, 8)}
                  </div>
                  <div className="text-sm text-gray-600">Est. {jarTokenSymbol}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {pendingTokens.map((token) => (
                <Card key={token.address} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{token.name}</h4>
                          <Badge variant="outline">{token.symbol}</Badge>
                          {!token.isSwappable && (
                            <Badge variant="destructive" className="text-xs">
                              Not Swappable
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Balance:</span>{" "}
                            {formatTokenBalance(token.balance, token.decimals)} {token.symbol}
                          </p>
                          <p className="font-mono text-xs text-gray-500">
                            {formatAddress(token.address)}
                          </p>
                          {token.estimatedOutput && (
                            <p className="text-green-600">
                              <span className="font-medium">Estimated Output:</span>{" "}
                              ~{formatUnits(token.estimatedOutput, 18).slice(0, 8)} {jarTokenSymbol}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!token.isSwappable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="opacity-50"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Cannot Swap
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwapToken(token.address)}
                            disabled={!isAdmin || isSwappingToken(token.address)}
                          >
                            {isSwappingToken(token.address) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                            ) : (
                              <ArrowRightLeft className="h-4 w-4 mr-1" />
                            )}
                            Swap to {jarTokenSymbol}
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://etherscan.io/address/${token.address}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isAdmin && swappableTokensCount > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These tokens were sent directly to the jar and need to be manually swapped to {jarTokenSymbol}. 
                  ETH sent to the jar is automatically swapped.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
