"use client";

import type React from "react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Waves, Coins, Settings, AlertTriangle } from "lucide-react";
import { StreamingPanel } from "./StreamingPanel";
import { TokenRecoveryPanel } from "./TokenRecoveryPanel";
import { useJarFeatures } from "@/hooks/jar/useJarVersion";

interface JarStreamingTabProps {
  jarAddress: `0x${string}`;
  jarTokenAddress: `0x${string}`;
  jarTokenSymbol: string;
  isAdmin: boolean;
  streamingEnabled: boolean;
}

export const JarStreamingTab: React.FC<JarStreamingTabProps> = ({
  jarAddress,
  jarTokenAddress,
  jarTokenSymbol,
  isAdmin,
  streamingEnabled
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // 🆕 VERSION DETECTION: Check if this jar supports v2 features
  const { streaming, superfluid, multiToken, isLoading } = useJarFeatures(jarAddress);

  // Show loading state while detecting version
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5e14] mx-auto mb-2"></div>
          <p className="text-sm text-[#8b7355]">Loading jar features...</p>
        </div>
      </div>
    );
  }

  // 🚨 V1 JAR: Show graceful fallback for v1 jars
  if (!streaming && !superfluid && !multiToken) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is a v1 Cookie Jar. Streaming and token recovery features are available in v2 jars only.
            <br />
            <a 
              href="https://docs.cookiejar.wtf/migration/v1-to-v2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#ff5e14] hover:text-[#e5531b] underline ml-1"
            >
              Learn about upgrading →
            </a>
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#ff5e14]" />
              Available in v2 Jars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                <Waves className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="font-medium">Real-time Streaming</h4>
                  <p className="text-sm text-gray-600">Superfluid integration for continuous token streams</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                <Coins className="h-5 w-5 text-yellow-500" />
                <div>
                  <h4 className="font-medium">Multi-token Support</h4>
                  <p className="text-sm text-gray-600">Automatic token swapping and recovery</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg opacity-50">
                <Settings className="h-5 w-5 text-gray-500" />
                <div>
                  <h4 className="font-medium">Advanced Controls</h4>
                  <p className="text-sm text-gray-600">Enhanced admin tools and stream management</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ V2 JAR: Full streaming functionality
  return (
    <div className="space-y-6">
      {!streamingEnabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Streaming is currently disabled for this jar. Enable streaming in the jar configuration to accept token streams.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="streaming" className="flex items-center gap-2">
            <Waves className="h-4 w-4" />
            Streaming
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Token Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Streaming Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={streamingEnabled ? "default" : "secondary"}>
                    {streamingEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {streamingEnabled ? "Accepting streams" : "Not accepting streams"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Jar Token</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{jarTokenSymbol}</p>
                  <p className="text-xs font-mono text-gray-500">
                    {jarTokenAddress.slice(0, 6)}...{jarTokenAddress.slice(-4)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Admin Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {isAdmin ? "Admin" : "Viewer"}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {isAdmin ? "Full access" : "Read-only"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Streaming Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Waves className="h-4 w-4 text-blue-500" />
                    Token Streams
                  </h4>
                  <p className="text-sm text-gray-600">
                    External parties can register continuous token streams to fund this jar. 
                    Streams flow at a defined rate and must be processed periodically by the admin.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    Token Recovery
                  </h4>
                  <p className="text-sm text-gray-600">
                    Tokens sent directly to the jar address are held in pending balances. 
                    ETH is automatically swapped, while other ERC-20 tokens require manual swapping by the admin.
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  All streaming and token recovery operations maintain the jar's access control. 
                  Only users with proper NFT/protocol credentials can withdraw the final {jarTokenSymbol} balance.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaming">
          <StreamingPanel 
            jarAddress={jarAddress}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="recovery">
          <TokenRecoveryPanel
            jarAddress={jarAddress}
            jarTokenAddress={jarTokenAddress}
            jarTokenSymbol={jarTokenSymbol}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
