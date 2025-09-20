'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { JarHealthDashboard } from '../../components/jar-monitor/JarHealthDashboard';
import { TransferScanner } from '../../components/jar-monitor/TransferScanner';
import { useJarMonitoring } from '../../hooks/useJarMonitoring';
import { DetectedTransfer } from '../../lib/jar-monitor/TransferDetector';

// Example jar addresses (you'd get these from your app state)
const EXAMPLE_JARS = [
  '0x742d35Cc6635C0532925a3b8D4ba7d1A4C0b6C6', // Example jar 1
  '0x8ba1f109551bD432803012645Hac136c9c0b6C6', // Example jar 2
  '0x123d35Cc6635C0532925a3b8D4ba7d1A4C0b6C6', // Example jar 3
];

export default function JarMonitorPage() {
  const { address: userAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [selectedJar, setSelectedJar] = useState<string>(EXAMPLE_JARS[0]);
  const [notifications, setNotifications] = useState<DetectedTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'individual'>('dashboard');

  // Individual jar monitoring
  const jarMonitoring = useJarMonitoring({
    jarAddress: selectedJar,
    autoScan: true,
    enableNotifications: true,
    onTransferDetected: (transfer) => {
      setNotifications(prev => [transfer, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show toast notification
      showToast(
        transfer.isDirectTransfer ? '🚨 Direct Transfer!' : '📥 Transfer Detected',
        `${transfer.amountFormatted} ${transfer.tokenSymbol} → ${selectedJar.slice(0, 8)}...`
      );
    },
    onHealthChange: (health) => {
      if (!health.isHealthy) {
        showToast('⚠️ Jar Health Issue', `${health.issues.length} issues detected`);
      }
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scan on jar selection change
  useEffect(() => {
    if (selectedJar && jarMonitoring.isConnected) {
      jarMonitoring.scanHistorical();
    }
  }, [selectedJar]);

  const handleQuickSetup = async () => {
    if (!selectedJar || !jarMonitoring.isConnected) return;

    try {
      // Common tokens to monitor (you'd customize this per chain)
      const commonTokens = [
        '0xA0b86a33E6441E8C8C7014b37C5C3Ff8bB7b1A25', // USDC
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      ];

      for (const token of commonTokens) {
        try {
          await jarMonitoring.enableTokenMonitoring(token);
        } catch (error) {
          console.log(`Token ${token} monitoring already enabled or failed`);
        }
      }

      showToast('✅ Setup Complete', 'Monitoring enabled for common tokens');
      
    } catch (error) {
      console.error('Setup failed:', error);
      showToast('❌ Setup Failed', 'Check console for details');
    }
  };

  if (!isConnected) {
    return (
      <div className="connect-wallet-page">
        <div className="connect-container">
          <h1>🍪 Cookie Jar Monitor</h1>
          <p>Connect your wallet to monitor Cookie Jar transfers and recover accidentally sent tokens.</p>
          
          <div className="connectors">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="connect-button"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jar-monitor-page">
      <header className="page-header">
        <div className="header-content">
          <h1>🍪 Cookie Jar Monitor</h1>
          <div className="header-controls">
            <select 
              value={selectedJar} 
              onChange={(e) => setSelectedJar(e.target.value)}
              className="jar-selector"
            >
              {EXAMPLE_JARS.map(address => (
                <option key={address} value={address}>
                  {address.slice(0, 8)}...{address.slice(-6)}
                </option>
              ))}
            </select>
            
            <button onClick={handleQuickSetup} className="quick-setup-button">
              ⚡ Quick Setup
            </button>
            
            <button onClick={disconnect} className="disconnect-button">
              🔌 Disconnect
            </button>
          </div>
        </div>

        <nav className="tab-navigation">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={activeTab === 'scanner' ? 'active' : ''}
            onClick={() => setActiveTab('scanner')}
          >
            🔍 Scanner
          </button>
          <button 
            className={activeTab === 'individual' ? 'active' : ''}
            onClick={() => setActiveTab('individual')}
          >
            🎯 Individual Jar
          </button>
        </nav>
      </header>

      <main className="page-content">
        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="notifications-bar">
            <h3>🔔 Recent Notifications</h3>
            <div className="notifications-list">
              {notifications.slice(0, 3).map((transfer, index) => (
                <div key={index} className={`notification ${transfer.isDirectTransfer ? 'urgent' : 'normal'}`}>
                  <span className="notification-icon">
                    {transfer.isDirectTransfer ? '🚨' : '📥'}
                  </span>
                  <span className="notification-text">
                    {transfer.amountFormatted} {transfer.tokenSymbol} 
                    {transfer.isDirectTransfer ? ' sent directly' : ' via jar function'}
                  </span>
                  <span className="notification-time">
                    {new Date(transfer.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <JarHealthDashboard jarAddresses={EXAMPLE_JARS} />
        )}

        {activeTab === 'scanner' && (
          <TransferScanner 
            jarAddress={selectedJar}
            onTransferDetected={(transfer) => {
              setNotifications(prev => [transfer, ...prev.slice(0, 9)]);
            }}
            autoScan={true}
          />
        )}

        {activeTab === 'individual' && (
          <IndividualJarMonitor 
            jarAddress={selectedJar}
            monitoring={jarMonitoring}
          />
        )}
      </main>
    </div>
  );
}

// Individual jar monitoring component
function IndividualJarMonitor({ 
  jarAddress, 
  monitoring 
}: {
  jarAddress: string;
  monitoring: ReturnType<typeof useJarMonitoring>;
}) {
  const directTransfers = monitoring.getDirectTransfers();
  const recentTransfers = monitoring.getRecentTransfers(24); // Last 24 hours

  return (
    <div className="individual-jar-monitor">
      <div className="jar-overview">
        <h2>🎯 Individual Jar Monitor</h2>
        <p>Address: <code>{jarAddress}</code></p>
        
        <div className="monitoring-status">
          <div className={`status-indicator ${monitoring.isMonitoring ? 'active' : 'inactive'}`}>
            {monitoring.isMonitoring ? '🟢 Monitoring Active' : '🔴 Monitoring Inactive'}
          </div>
          
          {!monitoring.isMonitoring && (
            <button onClick={monitoring.startMonitoring} className="start-monitoring-btn">
              🚀 Start Monitoring
            </button>
          )}
          
          {monitoring.isMonitoring && (
            <button onClick={monitoring.stopMonitoring} className="stop-monitoring-btn">
              🛑 Stop Monitoring
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{monitoring.stats.totalTransfers}</div>
          <div className="stat-label">Total Transfers</div>
        </div>
        <div className="stat-card urgent">
          <div className="stat-value">{monitoring.stats.directTransfers}</div>
          <div className="stat-label">Direct Transfers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{monitoring.stats.uniqueTokens}</div>
          <div className="stat-label">Unique Tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {monitoring.health?.isHealthy ? '✅' : '⚠️'}
          </div>
          <div className="stat-label">Health Status</div>
        </div>
      </div>

      {/* Health Issues */}
      {monitoring.health && !monitoring.health.isHealthy && (
        <div className="health-issues">
          <h3>⚠️ Health Issues</h3>
          <ul>
            {monitoring.health.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recovery Actions */}
      {monitoring.actions.length > 0 && (
        <div className="recovery-actions">
          <h3>🔧 Recovery Actions</h3>
          <div className="actions-grid">
            {monitoring.actions.map((action, index) => (
              <div key={index} className={`action-card ${action.type}`}>
                <div className="action-description">{action.description}</div>
                <div className="action-meta">
                  Gas estimate: {action.estimatedGas.toString()}
                </div>
                <button
                  onClick={() => monitoring.executeAction(action)}
                  className={`action-button ${action.type}`}
                >
                  Execute
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Transfers Alert */}
      {directTransfers.length > 0 && (
        <div className="direct-transfers-alert">
          <h3>🚨 Direct Transfers Detected</h3>
          <p>{directTransfers.length} tokens were sent directly to this jar and may need recovery.</p>
          
          <div className="direct-transfers-list">
            {directTransfers.slice(0, 5).map((transfer, index) => (
              <div key={index} className="direct-transfer-item">
                <span className="transfer-info">
                  {transfer.amountFormatted} {transfer.tokenSymbol}
                </span>
                <span className="transfer-hash">
                  Tx: {transfer.transactionHash.slice(0, 10)}...
                </span>
                <button
                  onClick={() => monitoring.quickRecover(transfer.token)}
                  className="quick-recover-button"
                >
                  🚀 Quick Recover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentTransfers.length > 0 && (
        <div className="recent-activity">
          <h3>📈 Recent Activity (24h)</h3>
          <div className="activity-timeline">
            {recentTransfers.slice(0, 10).map((transfer, index) => (
              <div key={index} className="activity-item">
                <div className="activity-time">
                  {new Date(transfer.timestamp * 1000).toLocaleString()}
                </div>
                <div className="activity-description">
                  {transfer.amountFormatted} {transfer.tokenSymbol} 
                  {transfer.isDirectTransfer ? ' sent directly' : ' via jar function'}
                </div>
                <div className="activity-status">
                  {transfer.isDirectTransfer ? '🚨' : '✅'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Toast notification function
function showToast(title: string, message: string) {
  // You'd implement this with your preferred toast library
  console.log(`🔔 ${title}: ${message}`);
  
  // Example with browser notification as fallback
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
}