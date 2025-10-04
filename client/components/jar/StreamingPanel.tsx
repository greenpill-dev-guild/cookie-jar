'use client';

import { Pause, Settings, Waves } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/app/useToast';
import { useSuperfluidTokenInfo } from '@/hooks/blockchain/useSuperfluidTokenInfo';
import { useStreamingActions } from '@/hooks/jar/useStreamingActions';
import { useStreamingData } from '@/hooks/jar/useStreamingData';
import { useSuperfluidAccountInfo } from '@/hooks/jar/useSuperfluidAccountInfo';
import { formatAddress } from '@/lib/app/utils';

interface StreamingPanelProps {
  jarAddress: `0x${string}`;
  isAdmin: boolean;
}

export const StreamingPanel: React.FC<StreamingPanelProps> = ({
  jarAddress,
  isAdmin,
}) => {
  const { toast: _toast } = useToast();
  const _chainId = useChainId();
  const { address: _userAddress } = useAccount();

  // Stream registration form state
  const [_newStreamSender, _setNewStreamSender] = useState('');
  const [newStreamToken, setNewStreamToken] = useState('');
  const [newStreamRate, setNewStreamRate] = useState('');

  // Use real Superfluid SDK hooks
  const {
    streams,
    // streamingConfig: config,
    isLoadingStreams,
    calculateClaimable,
    formatStreamRate,
    refetchStreams: _refetchStreams,
  } = useStreamingData(jarAddress);

  const {
    createSuperStream,
    isCreating,
    updateSuperStream,
    isUpdating,
    deleteSuperStream,
    isDeleting,
  } = useStreamingActions(jarAddress);

  const { data: accountInfo } = useSuperfluidAccountInfo(jarAddress);

  const handleCreateSuperStream = async () => {
    try {
      await createSuperStream(newStreamToken, newStreamRate);

      // Reset form on success
      setNewStreamToken('');
      setNewStreamRate('');
    } catch (error) {
      console.error('Failed to create stream:', error);
    }
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="active">Active Streams</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage">Manage</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {accountInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Jar Flow Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Net Flow Rate:</span>
                      <div className="font-mono text-green-600">
                        {accountInfo.formattedNetFlowRate} ETH/s
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Deposit:</span>
                      <div className="font-mono text-blue-600">
                        {accountInfo.formattedTotalDeposit} ETH
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stream Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {streams.length}
                    </div>
                    <div className="text-sm text-gray-600">Active Streams</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {streams
                        .reduce(
                          (sum, stream) =>
                            sum + Number(formatUnits(stream.ratePerSecond, 18)),
                          0
                        )
                        .toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Rate (ETH/s)
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {streams
                        .reduce(
                          (sum, stream) =>
                            sum + Number(formatUnits(stream.totalStreamed, 18)),
                          0
                        )
                        .toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Streamed (ETH)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {streams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Waves className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active streams found</p>
              </div>
            ) : (
              streams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onUpdate={(rate) => updateSuperStream(stream.token, rate)}
                  onDelete={() => deleteSuperStream(stream.token)}
                  isUpdating={isUpdating}
                  isDeleting={isDeleting}
                  formatStreamRate={formatStreamRate}
                  calculateClaimable={calculateClaimable}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="manage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Create Superfluid Stream
                  </CardTitle>
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
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
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

interface StreamCardProps {
  stream: any; // Using any for now, should be properly typed
  onUpdate: (rate: string) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  formatStreamRate: (rate: bigint, decimals: number) => string;
  calculateClaimable: (stream: any) => bigint;
  isAdmin: boolean;
}

const StreamCard: React.FC<StreamCardProps> = ({
  stream,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  formatStreamRate,
  calculateClaimable,
  isAdmin,
}) => {
  const { data: _tokenInfo } = useSuperfluidTokenInfo(stream.token);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={stream.isActive ? 'default' : 'secondary'}>
                {stream.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-sm font-mono text-gray-600">
                {stream.tokenSymbol || 'TOKEN'}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">From:</span>{' '}
                <span className="font-mono">
                  {formatAddress(stream.sender)}
                </span>
              </p>
              <p>
                <span className="font-medium">Rate:</span>{' '}
                {formatStreamRate(stream.ratePerSecond, 18)}
              </p>
              <p>
                <span className="font-medium">Total Streamed:</span>{' '}
                {formatUnits(stream.totalStreamed, 18)}
              </p>
            </div>

            {stream.isActive && (
              <div className="bg-green-50 p-2 rounded text-sm">
                <p className="text-green-700 font-medium">
                  Claimable: {formatUnits(calculateClaimable(stream), 18)}{' '}
                  tokens
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newRate = prompt(
                      'Enter new flow rate (wei per second):',
                      stream.ratePerSecond.toString()
                    );
                    if (newRate) onUpdate(newRate);
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700"
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
