"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/app/useToast";
import { useAccount, useChainId } from "wagmi";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Waves, 
  Settings,
  ExternalLink 
} from "lucide-react";
import { formatUnits, parseUnits, isAddress } from "viem";
import { formatAddress } from "@/lib/app/utils";
import { useStreamingData } from "@/hooks/jar/useStreamingData";
import { useStreamingActions } from "@/hooks/jar/useStreamingActions";
import { StreamProcessingCard } from "./StreamProcessingCard";


interface StreamingPanelProps {
  jarAddress: `0x${string}`;
  isAdmin: boolean;
}

export const StreamingPanel: React.FC<StreamingPanelProps> = ({ 
  jarAddress, 
  isAdmin 
}) => {
  const { toast } = useToast();
  const chainId = useChainId();
  const { address: userAddress } = useAccount();

  // Stream registration form state
  const [newStreamSender, setNewStreamSender] = useState("");
  const [newStreamToken, setNewStreamToken] = useState("");
  const [newStreamRate, setNewStreamRate] = useState("");

  // Use real contract hooks
  const {
    streams,
    // streamingConfig: config,
    isLoadingStreams,
    calculateClaimable,
    formatStreamRate,
    refetchStreams,
  } = useStreamingData(jarAddress);

  const {
    createSuperStream,
    isRegistering,
    isApproving,
    isProcessing,
  } = useStreamingActions(jarAddress);

  const handleCreateSuperStream = async () => {
    await createSuperStream(newStreamToken, newStreamRate);

    // Reset form on success
    setNewStreamSender("");
    setNewStreamToken("");
    setNewStreamRate("");
  };

  if (isLoadingStreams && !streams.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-blue-500" />
          Streaming Management
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Streams</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage">Manage</TabsTrigger>}
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {streams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Waves className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active streams found</p>
              </div>
            ) : (
              streams.map((stream) => (
                <Card key={stream.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={stream.isApproved ? "default" : "secondary"}>
                            {stream.isApproved ? "Active" : "Pending Approval"}
                          </Badge>
                          <span className="text-sm font-mono">
                            Stream #{stream.id}
                          </span>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">From:</span>{" "}
                            <span className="font-mono">{formatAddress(stream.sender)}</span>
                          </p>
                          <p>
                            <span className="font-medium">Rate:</span>{" "}
                            {formatStreamRate(stream.ratePerSecond, 18)}
                          </p>
                          <p>
                            <span className="font-medium">Total Streamed:</span>{" "}
                            {formatUnits(stream.totalStreamed, 18)}
                          </p>
                        </div>

                        {stream.isApproved && (
                          <div className="bg-green-50 p-2 rounded text-sm">
                            <p className="text-green-700 font-medium">
                              Claimable: {formatUnits(calculateClaimable(stream), 18)} tokens
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* {!stream.isApproved && isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveStream(stream.id)}
                            disabled={isApproving}
                          >
                            {isApproving ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                        )} */}
{/*                         
                        {stream.isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessStream(stream.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-1"></div>
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Process
                          </Button>
                        )} */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="manage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create Superfluid Stream</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="superToken">Super Token Address</Label>
                      <Input
                        id="superToken"
                        placeholder="0x... (Super Token contract address)"
                        value={newStreamToken}
                        onChange={(e) => setNewStreamToken(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="rate">Rate (tokens per second)</Label>
                    <Input
                      id="rate"
                      placeholder="0.1"
                      value={newStreamRate}
                      onChange={(e) => setNewStreamRate(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    onClick={handleCreateSuperStream}
                    disabled={isRegistering}
                    className="w-full"
                  >
                    {isRegistering ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Create Superfluid Stream
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
