'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers, BigNumber } from 'ethers';
import { useProvider, useSigner } from 'wagmi';
import { TransferDetector, DetectedTransfer } from '../../lib/jar-monitor/TransferDetector';

interface TransferScannerProps {
  jarAddress: string;
  onTransferDetected?: (transfer: DetectedTransfer) => void;
  autoScan?: boolean;
}

interface ScanResult {
  transfers: DetectedTransfer[];
  blockRange: { from: number; to: number };
  scanTime: number;
  totalValue: BigNumber;
}

export function TransferScanner({ 
  jarAddress, 
  onTransferDetected,
  autoScan = false 
}: TransferScannerProps) {
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [detector] = useState(() => new TransferDetector(provider, jarAddress));
  const [isScanning, setIsScanning] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);
  const [realtimeTransfers, setRealtimeTransfers] = useState<DetectedTransfer[]>([]);
  const [scanFromBlock, setScanFromBlock] = useState<string>('');
  const [scanToBlock, setScanToBlock] = useState<string>('latest');

  // Setup real-time monitoring
  useEffect(() => {
    if (autoScan && !isMonitoring) {
      startRealTimeMonitoring();
    }
    
    return () => {
      if (isMonitoring) {
        stopRealTimeMonitoring();
      }
    };
  }, [autoScan]);

  // Manual scan function
  const performScan = async () => {
    if (!scanFromBlock) {
      alert('Please enter a starting block number');
      return;
    }

    setIsScanning(true);
    const startTime = Date.now();

    try {
      const fromBlock = parseInt(scanFromBlock);
      const toBlock = scanToBlock === 'latest' ? 'latest' : parseInt(scanToBlock);
      
      console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock}...`);
      
      const transfers = await detector.scanBlockRange(fromBlock, toBlock);
      
      const totalValue = transfers.reduce(
        (sum, t) => sum.add(t.amount),
        BigNumber.from(0)
      );

      const result: ScanResult = {
        transfers,
        blockRange: { 
          from: fromBlock, 
          to: typeof toBlock === 'number' ? toBlock : await provider.getBlockNumber() 
        },
        scanTime: Date.now() - startTime,
        totalValue
      };

      setScanResults(result);
      
      // Notify parent component
      transfers.forEach(transfer => onTransferDetected?.(transfer));
      
      console.log(`✅ Scan complete: ${transfers.length} transfers found in ${result.scanTime}ms`);
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      alert(`Scan failed: ${error}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Start real-time monitoring
  const startRealTimeMonitoring = async () => {
    try {
      setIsMonitoring(true);
      
      await detector.startMonitoring((transfer: DetectedTransfer) => {
        console.log('🔔 Real-time transfer detected:', transfer);
        
        setRealtimeTransfers(prev => [transfer, ...prev.slice(0, 49)]); // Keep last 50
        onTransferDetected?.(transfer);
        
        // Show notification for direct transfers
        if (transfer.isDirectTransfer) {
          showNotification(
            '🚨 Direct Transfer Detected!',
            `${transfer.amountFormatted} ${transfer.tokenSymbol} sent directly to jar`
          );
        }
      });
      
      console.log('🚀 Real-time monitoring started');
      
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      setIsMonitoring(false);
    }
  };

  // Stop real-time monitoring
  const stopRealTimeMonitoring = () => {
    detector.stopMonitoring();
    setIsMonitoring(false);
    console.log('🛑 Real-time monitoring stopped');
  };

  // Quick scan recent blocks
  const quickScan = async () => {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 100; // Last 100 blocks (~20 minutes)
    
    setScanFromBlock(fromBlock.toString());
    setScanToBlock('latest');
    
    await performScan();
  };

  // Show browser notification
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/cookie-jar-icon.png' });
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="transfer-scanner">
      <div className="scanner-header">
        <h3>🔍 Transfer Scanner</h3>
        <div className="scanner-status">
          {isMonitoring && <span className="monitoring-badge">🔴 Live Monitoring</span>}
        </div>
      </div>

      <div className="scanner-controls">
        <div className="scan-range">
          <label>
            From Block:
            <input
              type="number"
              value={scanFromBlock}
              onChange={(e) => setScanFromBlock(e.target.value)}
              placeholder="e.g., 18500000"
            />
          </label>
          <label>
            To Block:
            <input
              type="text"
              value={scanToBlock}
              onChange={(e) => setScanToBlock(e.target.value)}
              placeholder="latest"
            />
          </label>
        </div>

        <div className="scan-actions">
          <button onClick={performScan} disabled={isScanning}>
            {isScanning ? '🔄 Scanning...' : '🔍 Scan Range'}
          </button>
          <button onClick={quickScan} disabled={isScanning}>
            ⚡ Quick Scan (Last 100 blocks)
          </button>
        </div>

        <div className="monitoring-controls">
          {!isMonitoring ? (
            <button onClick={startRealTimeMonitoring} className="start-monitoring">
              🚀 Start Real-Time Monitoring
            </button>
          ) : (
            <button onClick={stopRealTimeMonitoring} className="stop-monitoring">
              🛑 Stop Monitoring
            </button>
          )}
          
          <button onClick={requestNotificationPermission} className="enable-notifications">
            🔔 Enable Notifications
          </button>
        </div>
      </div>

      {/* Scan Results */}
      {scanResults && (
        <div className="scan-results">
          <h4>📊 Scan Results</h4>
          <div className="results-summary">
            <div className="stat">
              <strong>{scanResults.transfers.length}</strong>
              <span>Total Transfers</span>
            </div>
            <div className="stat">
              <strong>{scanResults.transfers.filter(t => t.isDirectTransfer).length}</strong>
              <span>Direct Transfers</span>
            </div>
            <div className="stat">
              <strong>{[...new Set(scanResults.transfers.map(t => t.token))].length}</strong>
              <span>Unique Tokens</span>
            </div>
            <div className="stat">
              <strong>{scanResults.scanTime}ms</strong>
              <span>Scan Time</span>
            </div>
          </div>

          <TransferList 
            transfers={scanResults.transfers}
            title="Historical Transfers"
          />
        </div>
      )}

      {/* Real-time Transfers */}
      {realtimeTransfers.length > 0 && (
        <div className="realtime-results">
          <h4>🔴 Real-Time Transfers</h4>
          <TransferList 
            transfers={realtimeTransfers}
            title="Live Transfers"
            showTimestamp
          />
        </div>
      )}
    </div>
  );
}

// Transfer list component
function TransferList({ 
  transfers, 
  title,
  showTimestamp = false 
}: {
  transfers: DetectedTransfer[];
  title: string;
  showTimestamp?: boolean;
}) {
  if (transfers.length === 0) {
    return (
      <div className="no-transfers">
        <p>No transfers found</p>
      </div>
    );
  }

  return (
    <div className="transfer-list">
      <h5>{title} ({transfers.length})</h5>
      <div className="transfers-table">
        <div className="table-header">
          <span>Token</span>
          <span>Amount</span>
          <span>From</span>
          <span>Type</span>
          <span>Block</span>
          {showTimestamp && <span>Time</span>}
          <span>Action</span>
        </div>
        
        {transfers.map((transfer, index) => (
          <div key={`${transfer.transactionHash}-${transfer.logIndex}`} className="table-row">
            <span className="token-info">
              {transfer.tokenSymbol}
              <small>{transfer.token.slice(0, 8)}...</small>
            </span>
            <span className="amount">
              {parseFloat(transfer.amountFormatted).toFixed(4)}
            </span>
            <span className="from">
              {transfer.from.slice(0, 6)}...{transfer.from.slice(-4)}
            </span>
            <span className={`transfer-type ${transfer.isDirectTransfer ? 'direct' : 'jar-call'}`}>
              {transfer.isDirectTransfer ? '🚨 Direct' : '✅ Jar Call'}
            </span>
            <span className="block">
              {transfer.blockNumber}
            </span>
            {showTimestamp && (
              <span className="timestamp">
                {new Date(transfer.timestamp * 1000).toLocaleTimeString()}
              </span>
            )}
            <span className="action">
              <a 
                href={`https://etherscan.io/tx/${transfer.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-tx-link"
              >
                View Tx
              </a>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransferScanner;