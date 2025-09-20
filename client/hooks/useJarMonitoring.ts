import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, BigNumber } from 'ethers';
import { useProvider, useSigner, useAccount } from 'wagmi';
import { JarMonitorClient, JarHealth, RecoveryAction } from '../lib/jar-monitor/JarMonitorClient';
import { TransferDetector, DetectedTransfer, JarAnalysis } from '../lib/jar-monitor/TransferDetector';

export interface UseJarMonitoringOptions {
  jarAddress: string;
  autoScan?: boolean;
  scanInterval?: number;
  enableNotifications?: boolean;
  onTransferDetected?: (transfer: DetectedTransfer) => void;
  onHealthChange?: (health: JarHealth) => void;
}

export interface JarMonitoringState {
  // Status
  isConnected: boolean;
  isScanning: boolean;
  isMonitoring: boolean;
  lastScanBlock: number;
  
  // Data
  health: JarHealth | null;
  transfers: DetectedTransfer[];
  analysis: JarAnalysis | null;
  actions: RecoveryAction[];
  
  // Statistics
  stats: {
    totalTransfers: number;
    directTransfers: number;
    uniqueTokens: number;
    totalValue: BigNumber;
    lastUpdated: number;
  };
  
  // Methods
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  scanHistorical: (fromBlock?: number, toBlock?: number | 'latest') => Promise<void>;
  checkHealth: () => Promise<void>;
  executeAction: (action: RecoveryAction) => Promise<void>;
  quickRecover: (tokenAddress: string) => Promise<void>;
  enableTokenMonitoring: (tokenAddress: string) => Promise<void>;
  
  // Utilities
  getTokenTransfers: (tokenAddress: string) => DetectedTransfer[];
  getDirectTransfers: () => DetectedTransfer[];
  getRecentTransfers: (hours?: number) => DetectedTransfer[];
}

export function useJarMonitoring(options: UseJarMonitoringOptions): JarMonitoringState {
  const provider = useProvider();
  const { data: signer } = useSigner();
  const { address: userAddress } = useAccount();
  
  // Refs for stable instances
  const detectorRef = useRef<TransferDetector>();
  const clientRef = useRef<JarMonitorClient>();
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastScanBlock, setLastScanBlock] = useState(0);
  const [health, setHealth] = useState<JarHealth | null>(null);
  const [transfers, setTransfers] = useState<DetectedTransfer[]>([]);
  const [analysis, setAnalysis] = useState<JarAnalysis | null>(null);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [stats, setStats] = useState({
    totalTransfers: 0,
    directTransfers: 0,
    uniqueTokens: 0,
    totalValue: BigNumber.from(0),
    lastUpdated: 0
  });

  // Initialize clients
  useEffect(() => {
    if (provider && options.jarAddress) {
      detectorRef.current = new TransferDetector(provider, options.jarAddress);
      clientRef.current = new JarMonitorClient(provider, options.jarAddress, signer);
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [provider, signer, options.jarAddress]);

  // Update stats when transfers change
  useEffect(() => {
    const directTransfers = transfers.filter(t => t.isDirectTransfer);
    const uniqueTokens = new Set(transfers.map(t => t.token));
    const totalValue = transfers.reduce((sum, t) => sum.add(t.amount), BigNumber.from(0));

    setStats({
      totalTransfers: transfers.length,
      directTransfers: directTransfers.length,
      uniqueTokens: uniqueTokens.size,
      totalValue,
      lastUpdated: Date.now()
    });
  }, [transfers]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    if (!detectorRef.current || isMonitoring) return;

    try {
      setIsMonitoring(true);
      
      await detectorRef.current.startMonitoring((transfer: DetectedTransfer) => {
        setTransfers(prev => [transfer, ...prev]);
        options.onTransferDetected?.(transfer);
        
        // Show notification for direct transfers
        if (transfer.isDirectTransfer && options.enableNotifications) {
          showNotification(
            '🚨 Direct Transfer Detected!',
            `${transfer.amountFormatted} ${transfer.tokenSymbol} sent to jar`
          );
        }
      });

      // Start periodic health checks
      monitoringIntervalRef.current = setInterval(async () => {
        await checkHealth();
      }, options.scanInterval || 60000);

      console.log('🚀 Jar monitoring started');
      
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      setIsMonitoring(false);
    }
  }, [isMonitoring, options]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stopMonitoring();
    }
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    
    setIsMonitoring(false);
    console.log('🛑 Jar monitoring stopped');
  }, []);

  // Scan historical transfers
  const scanHistorical = useCallback(async (
    fromBlock: number = 0, 
    toBlock: number | 'latest' = 'latest'
  ) => {
    if (!detectorRef.current) return;

    setIsScanning(true);
    try {
      console.log(`🔍 Scanning historical transfers from block ${fromBlock}...`);
      
      const historicalTransfers = await detectorRef.current.scanBlockRange(fromBlock, toBlock);
      const newAnalysis = await detectorRef.current.analyzeJar(fromBlock, toBlock);
      
      setTransfers(historicalTransfers);
      setAnalysis(newAnalysis);
      setLastScanBlock(typeof toBlock === 'number' ? toBlock : await provider.getBlockNumber());
      
      console.log(`✅ Historical scan complete: ${historicalTransfers.length} transfers found`);
      
    } catch (error) {
      console.error('❌ Historical scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [provider]);

  // Check jar health
  const checkHealth = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      const newHealth = await clientRef.current.checkJarHealth();
      setHealth(newHealth);
      options.onHealthChange?.(newHealth);
      
      // Generate recovery actions
      if (!newHealth.isHealthy) {
        const fullAnalysis = await clientRef.current.performFullAnalysis();
        setActions(fullAnalysis.recoveryActions);
      } else {
        setActions([]);
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }, [options]);

  // Execute recovery action
  const executeAction = useCallback(async (action: RecoveryAction) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`⚡ Executing: ${action.description}`);
      
      const tx = await action.execute();
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      await tx.wait();
      console.log(`✅ Action completed: ${action.description}`);
      
      // Refresh health status
      await checkHealth();
      
    } catch (error) {
      console.error(`❌ Action failed: ${action.description}`, error);
      throw error;
    }
  }, [signer, checkHealth]);

  // Quick recover specific token
  const quickRecover = useCallback(async (tokenAddress: string) => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    try {
      const tx = await clientRef.current.quickRecover(tokenAddress);
      await tx.wait();
      
      // Refresh data
      await Promise.all([checkHealth(), scanHistorical(lastScanBlock)]);
      
    } catch (error) {
      console.error(`❌ Quick recovery failed for ${tokenAddress}:`, error);
      throw error;
    }
  }, [checkHealth, scanHistorical, lastScanBlock]);

  // Enable token monitoring
  const enableTokenMonitoring = useCallback(async (tokenAddress: string) => {
    if (!clientRef.current || !signer) {
      throw new Error('Client not initialized or wallet not connected');
    }

    try {
      const tx = await clientRef.current.contract.enableTokenMonitoring(tokenAddress);
      await tx.wait();
      
      console.log(`✅ Monitoring enabled for token ${tokenAddress}`);
      await checkHealth();
      
    } catch (error) {
      console.error(`❌ Failed to enable monitoring for ${tokenAddress}:`, error);
      throw error;
    }
  }, [signer, checkHealth]);

  // Utility functions
  const getTokenTransfers = useCallback((tokenAddress: string) => {
    return transfers.filter(t => t.token.toLowerCase() === tokenAddress.toLowerCase());
  }, [transfers]);

  const getDirectTransfers = useCallback(() => {
    return transfers.filter(t => t.isDirectTransfer);
  }, [transfers]);

  const getRecentTransfers = useCallback((hours: number = 24) => {
    const cutoff = Date.now() / 1000 - (hours * 60 * 60);
    return transfers.filter(t => t.timestamp > cutoff);
  }, [transfers]);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (options.autoScan && isConnected && !isMonitoring) {
      startMonitoring();
    }
  }, [options.autoScan, isConnected, isMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // Status
    isConnected,
    isScanning,
    isMonitoring,
    lastScanBlock,
    
    // Data
    health,
    transfers,
    analysis,
    actions,
    stats,
    
    // Methods
    startMonitoring,
    stopMonitoring,
    scanHistorical,
    checkHealth,
    executeAction,
    quickRecover,
    enableTokenMonitoring,
    
    // Utilities
    getTokenTransfers,
    getDirectTransfers,
    getRecentTransfers
  };
}

// Utility function for notifications
function showNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { 
      body, 
      icon: '/cookie-jar-icon.png',
      badge: '/cookie-jar-badge.png'
    });
  }
}

export default useJarMonitoring;