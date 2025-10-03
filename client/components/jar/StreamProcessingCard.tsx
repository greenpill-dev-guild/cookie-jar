"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/app/useToast";
import { 
  Play, 
  2_Pause, 
  Clock, 
  TrendingUp,
  Droplets
} from "lucide-react";
import { formatUnits } from "viem";
import { formatAddress } from "@/lib/app/utils";

interface StreamData {
  id: number;
  sender: string;
  token: string;
  tokenSymbol: string;
  ratePerSecond: bigint;
  totalStreamed: bigint;
  pendingAmount: bigint;
  lastProcessedTime: number;
  nextProcessTime: number;
  isActive: boolean;
  decimals: number;
}

interface StreamProcessingCardProps {
  stream: StreamData;
  onProcess: (14_streamId: number) => Promise<void>;
  isProcessing: boolean;
  showActions?: boolean;
}

export const StreamProcessingCard: React.FC<StreamProcessingCardProps> = ({ 
  stream, 
  onProcess,
  isProcessing,
  showActions = true
}) => {
  const { toast } = useToast();

  const handleProcess = async () => {
    try {
      await onProcess(stream.id);
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: `Failed to process stream #${stream.id}`,
        variant: "destructive",
      });
    }
  };

  const calculateTimeUntilNext = (): string => {
    const now = Date.now();
    const timeUntilNext = stream.nextProcessTime - now;
    
    if (timeUntilNext <= 0) return "Ready to process";
    
    const minutes = Math.floor(timeUntilNext / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return "< 1m";
  };

  const getProcessingProgress = (): number => {
    const now = Date.now();
    const timeSinceLastProcess = now - stream.lastProcessedTime;
    const timeUntilNext = stream.nextProcessTime - stream.lastProcessedTime;
    
    if (timeUntilNext <= 0) return 100;
    return Math.min(100, (timeSinceLastProcess / timeUntilNext) * 100);
  };

  const formatRate = (ratePerSecond: bigint, decimals: number): string => {
    const ratePerHour = ratePerSecond * BigInt(3600);
    const ratePerDay = ratePerSecond * BigInt(86400);
    
    if (ratePerDay < BigInt(10) ** BigInt(decimals)) {
      return `${formatUnits(ratePerHour, decimals)}/hr`;
    } else {
      return `${formatUnits(ratePerDay, decimals)}/day`;
    }
  };

  const isReadyToProcess = () => {
    return Date.now() >= stream.nextProcessTime && stream.pendingAmount > BigInt(0);
  };

  return (
    <Card className={`border-l-4 ${isReadyToProcess() ? 'border-l-green-500' : 'border-l-blue-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Stream #{stream.id}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={stream.isActive ? "default" : "secondary"} className="text-xs">
              {stream.isActive ? "Active" : "Paused"}
            </Badge>
            {isReadyToProcess() && (
              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                Ready
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">From</p>
            <p className="font-mono text-xs">{formatAddress(stream.sender)}</p>
          </div>
          <div>
            <p className="text-gray-600">Rate</p>
            <p className="font-medium">{formatRate(stream.ratePerSecond, stream.decimals)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Processing Progress</span>
            <span className="text-xs">{calculateTimeUntilNext()}</span>
          </div>
          <Progress value={getProcessingProgress()} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-700">Pending</span>
            </div>
            <p className="font-mono text-lg text-blue-800">
              {formatUnits(stream.pendingAmount, stream.decimals).slice(0, 8)} {stream.tokenSymbol}
            </p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-700">Total Streamed</span>
            </div>
            <p className="font-mono text-lg text-green-800">
              {formatUnits(stream.totalStreamed, stream.decimals).slice(0, 8)} {stream.tokenSymbol}
            </p>
          </div>
        </div>

        {showActions && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              size="sm"
              onClick={handleProcess}
              disabled={!isReadyToProcess() || isProcessing}
              variant={isReadyToProcess() ? "default" : "outline"}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : isReadyToProcess() ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              {isReadyToProcess() ? "Process Now" : "Waiting"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
