"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/design/use-toast";
import { Loader2, Wallet, ExternalLink, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useConnect, useAccount, Connector } from "wagmi";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Connector metadata for better UX
const connectorConfig: Record<string, {
  name: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  priority: number; // Lower numbers appear first
}> = {
  injected: {
    name: "Browser Wallet",
    description: "Connect using browser wallet (MetaMask, etc.)",
    icon: <Wallet className="w-6 h-6" />,
    bgColor: "bg-orange-50 hover:bg-orange-100",
    textColor: "text-orange-600",
    priority: 1,
  },
  metaMask: {
    name: "MetaMask",
    description: "Connect using MetaMask wallet",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.516 10.512c0-.325-.127-.64-.352-.871L14.871 2.352A1.226 1.226 0 0013.996 2H2.004c-.325 0-.64.127-.871.352L.352 3.133A1.226 1.226 0 000 4.008v15.984c0 .325.127.64.352.871l.781.781c.231.225.546.352.871.352h11.992c.325 0 .64-.127.871-.352l7.293-7.289c.225-.231.352-.546.352-.871V10.512h.004zm-9.512 2.5h-2.008v2.004H9.004v-2.004H7v-1.996h2.004V9.012H11v2.004h2.004v1.996z"/>
      </svg>
    ),
    bgColor: "bg-amber-50 hover:bg-amber-100",
    textColor: "text-amber-600",
    priority: 1,
  },
  walletConnect: {
    name: "WalletConnect",
    description: "Scan with WalletConnect to connect",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.913 7.519c3.915-3.831 10.26-3.831 14.174 0l.471.461a.483.483 0 0 1 0 .694l-1.611 1.576a.252.252 0 0 1-.354 0l-.649-.634c-2.73-2.673-7.157-2.673-9.887 0l-.694.679a.252.252 0 0 1-.354 0L4.398 8.72a.483.483 0 0 1 0-.694l.515-.507zm17.5 3.263 1.434 1.404a.483.483 0 0 1 0 .694l-6.466 6.329a.507.507 0 0 1-.709 0l-4.588-4.493a.126.126 0 0 0-.177 0l-4.588 4.493a.507.507 0 0 1-.709 0L.144 12.88a.483.483 0 0 1 0-.694l1.434-1.404a.507.507 0 0 1 .709 0l4.588 4.493a.126.126 0 0 0 .177 0l4.588-4.493a.507.507 0 0 1 .709 0l4.588 4.493a.126.126 0 0 0 .177 0l4.588-4.493a.507.507 0 0 1 .709 0z"/>
      </svg>
    ),
    bgColor: "bg-blue-50 hover:bg-blue-100",
    textColor: "text-blue-600",
    priority: 2,
  },
  coinbaseWallet: {
    name: "Coinbase Wallet",
    description: "Connect using Coinbase Wallet",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm-1.5-6h3a1.5 1.5 0 000-3h-3a1.5 1.5 0 000 3z"/>
      </svg>
    ),
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
    textColor: "text-indigo-600",
    priority: 3,
  },
};

export function CustomConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connect, connectors, error, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [connectingConnector, setConnectingConnector] = useState<string | null>(null);

  // Close modal when connected
  useEffect(() => {
    if (isConnected) {
      onClose();
      setConnectingConnector(null);
    }
  }, [isConnected, onClose]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
      setConnectingConnector(null);
    }
  }, [error, toast]);

  const handleConnect = async (connector: Connector) => {
    try {
      setConnectingConnector(connector.id);
      await connect({ connector });
    } catch (err) {
      console.error("Connection error:", err);
      setConnectingConnector(null);
    }
  };

  const getConnectorInfo = (connector: Connector) => {
    // Try to match by ID or name
    const configKey = Object.keys(connectorConfig).find(key => 
      connector.id.toLowerCase().includes(key.toLowerCase()) ||
      connector.name.toLowerCase().includes(key.toLowerCase())
    );
    
    if (configKey) {
      return connectorConfig[configKey];
    }

    // Default fallback
    return {
      name: connector.name,
      description: `Connect using ${connector.name}`,
      icon: <Wallet className="w-6 h-6" />,
      bgColor: "bg-gray-50 hover:bg-gray-100",
      textColor: "text-gray-600",
      priority: 999,
    };
  };

  // Sort connectors by priority
  const sortedConnectors = [...connectors].sort((a, b) => {
    const infoA = getConnectorInfo(a);
    const infoB = getConnectorInfo(b);
    return infoA.priority - infoB.priority;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#3c2a14]">
            <Wallet className="w-5 h-5 text-[#ff5e14]" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to Cookie Jar V3
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {sortedConnectors.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No wallets detected</p>
              <p className="text-sm text-gray-400 mt-2">
                Please install a wallet extension to continue
              </p>
            </div>
          )}

          {sortedConnectors.map((connector) => {
            const info = getConnectorInfo(connector);
            const isConnecting = connectingConnector === connector.id;
            const isDisabled = isPending || isConnecting;

            return (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isDisabled}
                variant="outline"
                className={`w-full h-auto p-4 justify-start ${info.bgColor} border-2 border-transparent hover:border-[#ff5e14] transition-all duration-200`}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className={`p-2 rounded-lg ${info.bgColor} ${info.textColor}`}>
                    {isConnecting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      info.icon
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-[#3c2a14]">
                      {info.name}
                    </div>
                    <div className="text-sm text-[#8b7355]">
                      {isConnecting ? "Connecting..." : info.description}
                    </div>
                  </div>

                  {!isConnecting && (
                    <ExternalLink className="w-4 h-4 text-[#8b7355]" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* Footer information */}
        <div className="pt-4 border-t">
          <p className="text-xs text-[#8b7355] text-center">
            By connecting a wallet, you agree to Cookie Jar's{" "}
            <a href="#" className="text-[#ff5e14] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-[#ff5e14] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 