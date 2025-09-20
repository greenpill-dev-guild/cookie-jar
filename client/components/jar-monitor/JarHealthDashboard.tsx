'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers, BigNumber } from 'ethers';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { JarMonitorClient, JarHealth, RecoveryAction } from '../../lib/jar-monitor/JarMonitorClient';

interface JarHealthDashboardProps {
  jarAddresses: string[];
  refreshInterval?: number;
}

interface JarStatus {
  address: string;
  health: JarHealth;
  actions: RecoveryAction[];
  isLoading: boolean;
  lastUpdated: number;
}

export function JarHealthDashboard({ 
  jarAddresses, 
  refreshInterval = 60000 // 1 minute
}: JarHealthDashboardProps) {
  const { address: userAddress } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [jarStatuses, setJarStatuses] = useState<Map<string, JarStatus>>(new Map());
  const [isGlobalRefresh, setIsGlobalRefresh] = useState(false);
  const [selectedJar, setSelectedJar] = useState<string | null>(null);

  // Initialize jar monitoring clients
  const [monitorClients] = useState(() => 
    new Map(jarAddresses.map(address => [
      address, 
      new JarMonitorClient(provider, address, signer)
    ]))
  );

  // Check health for a specific jar
  const checkJarHealth = useCallback(async (jarAddress: string) => {
    const client = monitorClients.get(jarAddress);
    if (!client) return;

    setJarStatuses(prev => new Map(prev.set(jarAddress, {
      ...prev.get(jarAddress)!,
      isLoading: true
    })));

    try {
      const [health, analysis] = await Promise.all([
        client.checkJarHealth(),
        client.performFullAnalysis()
      ]);

      setJarStatuses(prev => new Map(prev.set(jarAddress, {
        address: jarAddress,
        health,
        actions: analysis.recoveryActions,
        isLoading: false,
        lastUpdated: Date.now()
      })));

    } catch (error) {
      console.error(`Error checking health for jar ${jarAddress}:`, error);
      
      setJarStatuses(prev => new Map(prev.set(jarAddress, {
        address: jarAddress,
        health: {
          address: jarAddress,
          isHealthy: false,
          issues: [`Connection error: ${error}`],
          recommendations: ['Check network connection'],
          lastChecked: Date.now()
        },
        actions: [],
        isLoading: false,
        lastUpdated: Date.now()
      })));
    }
  }, [monitorClients]);

  // Check all jars
  const checkAllJars = useCallback(async () => {
    setIsGlobalRefresh(true);
    try {
      await Promise.all(jarAddresses.map(checkJarHealth));
    } finally {
      setIsGlobalRefresh(false);
    }
  }, [jarAddresses, checkJarHealth]);

  // Initialize jar statuses
  useEffect(() => {
    jarAddresses.forEach(address => {
      if (!jarStatuses.has(address)) {
        setJarStatuses(prev => new Map(prev.set(address, {
          address,
          health: {
            address,
            isHealthy: true,
            issues: [],
            recommendations: [],
            lastChecked: 0
          },
          actions: [],
          isLoading: false,
          lastUpdated: 0
        })));
      }
    });
  }, [jarAddresses]);

  // Auto-refresh
  useEffect(() => {
    checkAllJars();
    
    const interval = setInterval(checkAllJars, refreshInterval);
    return () => clearInterval(interval);
  }, [checkAllJars, refreshInterval]);

  // Execute recovery action
  const executeAction = async (jarAddress: string, action: RecoveryAction) => {
    if (!signer) {
      alert('Please connect your wallet to execute actions');
      return;
    }

    try {
      console.log(`🚀 Executing action: ${action.description}`);
      
      const tx = await action.execute();
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed: ${receipt.transactionHash}`);
      
      // Refresh jar status
      await checkJarHealth(jarAddress);
      
    } catch (error) {
      console.error('❌ Action execution failed:', error);
      alert(`Action failed: ${error}`);
    }
  };

  return (
    <div className="jar-health-dashboard">
      <div className="dashboard-header">
        <h2>🍪 Cookie Jar Health Dashboard</h2>
        <div className="dashboard-controls">
          <button 
            onClick={checkAllJars} 
            disabled={isGlobalRefresh}
            className="refresh-button"
          >
            {isGlobalRefresh ? '🔄 Refreshing...' : '🔄 Refresh All'}
          </button>
          <span className="jar-count">
            {jarAddresses.length} jar{jarAddresses.length !== 1 ? 's' : ''} monitored
          </span>
        </div>
      </div>

      <div className="jars-grid">
        {jarAddresses.map(address => {
          const status = jarStatuses.get(address);
          if (!status) return null;

          return (
            <JarHealthCard
              key={address}
              status={status}
              onRefresh={() => checkJarHealth(address)}
              onExecuteAction={(action) => executeAction(address, action)}
              onSelect={() => setSelectedJar(address)}
              isSelected={selectedJar === address}
            />
          );
        })}
      </div>

      {selectedJar && (
        <JarDetailModal
          jarAddress={selectedJar}
          status={jarStatuses.get(selectedJar)!}
          onClose={() => setSelectedJar(null)}
          onExecuteAction={(action) => executeAction(selectedJar, action)}
        />
      )}
    </div>
  );
}

// Individual jar health card
function JarHealthCard({ 
  status, 
  onRefresh, 
  onExecuteAction, 
  onSelect,
  isSelected 
}: {
  status: JarStatus;
  onRefresh: () => void;
  onExecuteAction: (action: RecoveryAction) => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const { health, actions, isLoading } = status;
  
  const healthColor = health.isHealthy ? 'green' : 'red';
  const urgentActions = actions.filter(a => a.type === 'emergency');
  
  return (
    <div 
      className={`jar-health-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="jar-address">
          📍 {status.address.slice(0, 6)}...{status.address.slice(-4)}
        </div>
        <div className={`health-indicator ${healthColor}`}>
          {health.isHealthy ? '✅ Healthy' : '⚠️ Issues'}
        </div>
      </div>

      <div className="card-content">
        {isLoading ? (
          <div className="loading">🔄 Checking...</div>
        ) : (
          <>
            {health.issues.length > 0 && (
              <div className="issues">
                <strong>Issues ({health.issues.length}):</strong>
                <ul>
                  {health.issues.slice(0, 3).map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                  {health.issues.length > 3 && (
                    <li>... and {health.issues.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {urgentActions.length > 0 && (
              <div className="urgent-actions">
                <strong>🚨 Urgent Actions:</strong>
                {urgentActions.slice(0, 2).map((action, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteAction(action);
                    }}
                    className="urgent-action-button"
                  >
                    {action.description}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card-footer">
        <button onClick={(e) => { e.stopPropagation(); onRefresh(); }}>
          🔄 Refresh
        </button>
        <span className="last-updated">
          {status.lastUpdated ? `Updated ${Math.round((Date.now() - status.lastUpdated) / 1000)}s ago` : 'Never'}
        </span>
      </div>
    </div>
  );
}

// Detailed jar modal
function JarDetailModal({
  jarAddress,
  status,
  onClose,
  onExecuteAction
}: {
  jarAddress: string;
  status: JarStatus;
  onClose: () => void;
  onExecuteAction: (action: RecoveryAction) => void;
}) {
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="jar-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🍪 Jar Details</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="jar-info">
            <p><strong>Address:</strong> {jarAddress}</p>
            <p><strong>Health:</strong> 
              <span className={status.health.isHealthy ? 'healthy' : 'unhealthy'}>
                {status.health.isHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}
              </span>
            </p>
            <p><strong>Last Checked:</strong> {new Date(status.health.lastChecked).toLocaleString()}</p>
          </div>

          {status.health.issues.length > 0 && (
            <div className="issues-section">
              <h4>🚨 Issues</h4>
              <ul>
                {status.health.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {status.actions.length > 0 && (
            <div className="actions-section">
              <h4>🔧 Available Actions</h4>
              <div className="actions-list">
                {status.actions.map((action, index) => (
                  <div key={index} className={`action-item ${action.type}`}>
                    <div className="action-info">
                      <div className="action-description">{action.description}</div>
                      <div className="action-meta">
                        Type: {action.type} | Est. Gas: {action.estimatedGas.toString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onExecuteAction(action)}
                      className={`execute-button ${action.type}`}
                    >
                      Execute
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.health.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>💡 Recommendations</h4>
              <ul>
                {status.health.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// CSS styles (you'd put this in a separate file)
const styles = `
.jar-health-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.jars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.jar-health-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.jar-health-card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.jar-health-card.selected {
  border-color: #007bff;
  background-color: #f8f9fa;
}

.health-indicator.green {
  color: #28a745;
}

.health-indicator.red {
  color: #dc3545;
}

.urgent-action-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  margin: 2px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.jar-detail-modal {
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin: 5px 0;
}

.action-item.emergency {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.execute-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.execute-button.emergency {
  background: #dc3545;
  color: white;
}

.execute-button.scan {
  background: #007bff;
  color: white;
}

.execute-button.process {
  background: #28a745;
  color: white;
}
`;