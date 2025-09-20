# 📱 Client-Side Cookie Jar Monitoring

Complete guide for implementing off-chain transfer detection and monitoring in your dApp.

## 🎯 Overview

The client-side monitoring system provides:

- **🔍 Real-time transfer detection** - Monitor transfers as they happen
- **📊 Historical analysis** - Scan past blocks for missed transfers  
- **🚨 Direct transfer alerts** - Immediate notifications for accidental sends
- **🛠 Automated recovery** - One-click recovery workflows
- **📈 Health monitoring** - Track jar status across multiple tokens
- **🔧 Batch operations** - Manage multiple jars efficiently

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client-Side Monitoring                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ TransferDetector│  │ JarMonitorClient│  │ React Components│ │
│  │                 │  │                 │  │                 │ │
│  │ • Event scanning│  │ • Health checks │  │ • Dashboard UI  │ │
│  │ • Real-time mon │  │ • Auto recovery │  │ • Transfer lists│ │
│  │ • Block analysis│  │ • Action generation│ │ • Notifications │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    useJarMonitoring Hook                    │ │
│  │                                                             │ │
│  │ • State management for monitoring data                     │ │
│  │ • Automatic refresh and real-time updates                 │ │
│  │ • Action execution and error handling                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### **1. Basic Integration**

```typescript
import { useJarMonitoring } from '../hooks/useJarMonitoring';

function MyJarComponent({ jarAddress }: { jarAddress: string }) {
  const monitoring = useJarMonitoring({
    jarAddress,
    autoScan: true,
    enableNotifications: true,
    onTransferDetected: (transfer) => {
      console.log('Transfer detected:', transfer);
      
      if (transfer.isDirectTransfer) {
        // Alert user about direct transfer
        alert(`🚨 Direct transfer detected: ${transfer.amountFormatted} ${transfer.tokenSymbol}`);
      }
    }
  });

  return (
    <div>
      <h2>Jar Status: {monitoring.health?.isHealthy ? '✅ Healthy' : '⚠️ Issues'}</h2>
      
      {monitoring.actions.length > 0 && (
        <div>
          <h3>🔧 Recovery Actions:</h3>
          {monitoring.actions.map((action, index) => (
            <button key={index} onClick={() => monitoring.executeAction(action)}>
              {action.description}
            </button>
          ))}
        </div>
      )}
      
      <div>
        <h3>📊 Statistics:</h3>
        <p>Total Transfers: {monitoring.stats.totalTransfers}</p>
        <p>Direct Transfers: {monitoring.stats.directTransfers}</p>
        <p>Unique Tokens: {monitoring.stats.uniqueTokens}</p>
      </div>
    </div>
  );
}
```

### **2. Advanced Dashboard**

```typescript
import { JarHealthDashboard } from '../components/jar-monitor/JarHealthDashboard';

function JarManagementPage() {
  const jarAddresses = ['0x...', '0x...', '0x...']; // Your jar addresses

  return (
    <div>
      <h1>🍪 Cookie Jar Management</h1>
      <JarHealthDashboard 
        jarAddresses={jarAddresses}
        refreshInterval={30000} // 30 seconds
      />
    </div>
  );
}
```

### **3. Transfer Scanner**

```typescript
import { TransferScanner } from '../components/jar-monitor/TransferScanner';

function TransferAnalysisPage({ jarAddress }: { jarAddress: string }) {
  return (
    <TransferScanner
      jarAddress={jarAddress}
      onTransferDetected={(transfer) => {
        // Handle detected transfer
        if (transfer.isDirectTransfer) {
          // Show recovery UI
          showRecoveryModal(transfer);
        }
      }}
      autoScan={true}
    />
  );
}
```

## 🔍 **Detection Methods**

### **Method 1: Real-Time Event Monitoring**

```typescript
// Automatically detects transfers as they happen
const detector = new TransferDetector(provider, jarAddress);

await detector.startMonitoring((transfer) => {
  console.log('🔔 Real-time transfer:', transfer);
  
  if (transfer.isDirectTransfer) {
    // Immediate alert for direct transfers
    showUrgentNotification(transfer);
  }
});
```

### **Method 2: Historical Block Scanning**

```typescript
// Scan specific block ranges for missed transfers
const transfers = await detector.scanBlockRange(18500000, 'latest');

// Analyze patterns
const analysis = await detector.analyzeJar(18500000);
console.log('📊 Analysis:', {
  totalTransfers: analysis.totalTransfers,
  directTransfers: analysis.directTransfers.length,
  suspiciousTransfers: analysis.suspiciousTransfers.length
});
```

### **Method 3: Comprehensive Analysis**

```typescript
// Full jar analysis with recommendations
const client = new JarMonitorClient(provider, jarAddress, signer);
const fullAnalysis = await client.performFullAnalysis();

console.log('🔍 Full Analysis:', {
  transfers: fullAnalysis.transferAnalysis,
  onChain: fullAnalysis.onChainStatus,
  actions: fullAnalysis.recoveryActions,
  health: fullAnalysis.healthStatus
});
```

## 🚨 **Automated Recovery Workflows**

### **Scenario 1: User Accidentally Sends USDC Directly**

```typescript
// 1. Real-time detection
detector.on('directTransferDetected', async (transfer) => {
  if (transfer.tokenSymbol === 'USDC') {
    // 2. Show immediate notification
    showNotification(
      '🚨 USDC Direct Transfer Detected!',
      `${transfer.amountFormatted} USDC sent directly to jar`
    );
    
    // 3. Auto-recovery option
    const shouldRecover = await confirm('Auto-recover this USDC?');
    if (shouldRecover) {
      await client.quickRecover(transfer.token);
      showNotification('✅ Recovery Complete', 'USDC converted to jar token');
    }
  }
});
```

### **Scenario 2: Batch Recovery for Multiple Tokens**

```typescript
// Scan and recover all detected issues
const results = await client.autoRecover({
  enableMonitoring: true,    // Enable monitoring for new tokens
  processUnaccounted: true,  // Process unaccounted balances
  processPending: true,      // Process pending swaps
  maxGasPrice: ethers.utils.parseUnits('50', 'gwei'),
  dryRun: false             // Execute for real
});

console.log('🎉 Auto-recovery results:', {
  actionsExecuted: results.actionsExecuted,
  totalGasUsed: results.totalGasUsed.toString(),
  errors: results.errors
});
```

### **Scenario 3: Monitoring Dashboard for Multiple Jars**

```typescript
// Monitor multiple jars with health checks
const jarAddresses = getUserJars(); // Get user's jar addresses

const healthStatuses = await Promise.all(
  jarAddresses.map(async (address) => {
    const client = new JarMonitorClient(provider, address, signer);
    return await client.checkJarHealth();
  })
);

// Show alerts for unhealthy jars
healthStatuses.forEach((health, index) => {
  if (!health.isHealthy) {
    showAlert(`⚠️ Jar ${jarAddresses[index]} has ${health.issues.length} issues`);
  }
});
```

## 📊 **Data Flow**

### **Real-Time Monitoring Flow:**
```
1. 📡 Provider.on(TransferEvent) → 
2. 🔍 TransferDetector.processLog() → 
3. 📊 JarMonitorClient.analyzeTransfer() → 
4. 🚨 React.Component.showAlert() → 
5. 🛠 User.clickRecover() → 
6. ⚡ Contract.emergencyRecover() → 
7. ✅ Transfer.converted()
```

### **Historical Analysis Flow:**
```
1. 🔍 User.requestScan(fromBlock, toBlock) → 
2. 📡 Provider.getLogs(transferFilter) → 
3. 📊 TransferDetector.analyzeJar() → 
4. 🎯 JarMonitorClient.generateActions() → 
5. 📱 Dashboard.showResults() → 
6. 🛠 User.executeActions()
```

## 🔧 **Configuration Options**

### **Monitoring Configuration**
```typescript
const monitoringConfig = {
  scanInterval: 30000,        // 30 seconds between scans
  blocksPerBatch: 1000,      // Process 1000 blocks at a time
  maxRetries: 3,             // Retry failed operations 3 times
  enableRealTime: true,      // Enable real-time event monitoring
  tokenWhitelist: [          // Only monitor specific tokens
    '0x...', // USDC
    '0x...', // DAI
  ],
  minAmountThreshold: ethers.utils.parseEther("10") // Only alert for > 10 tokens
};
```

### **Auto-Recovery Configuration**
```typescript
const autoRecoveryConfig = {
  enableMonitoring: true,     // Auto-enable monitoring for new tokens
  processUnaccounted: true,   // Auto-process unaccounted balances
  processPending: true,       // Auto-process pending swaps
  maxGasPrice: ethers.utils.parseUnits('100', 'gwei'), // Gas limit
  dryRun: false              // Set to true for testing
};
```

### **Notification Configuration**
```typescript
const notificationConfig = {
  enableBrowser: true,        // Browser notifications
  enableToast: true,         // In-app toast notifications
  enableEmail: false,        // Email alerts (requires backend)
  urgentOnly: false,         // Only notify for urgent issues
  quietHours: {              // Don't notify during these hours
    start: 22, // 10 PM
    end: 8     // 8 AM
  }
};
```

## 📱 **Frontend Integration Examples**

### **React Hook Usage**
```typescript
function JarPage({ jarAddress }: { jarAddress: string }) {
  const monitoring = useJarMonitoring({
    jarAddress,
    autoScan: true,
    onTransferDetected: (transfer) => {
      // Custom handling
      if (transfer.isDirectTransfer) {
        setShowRecoveryModal(true);
        setSelectedTransfer(transfer);
      }
    }
  });

  // Auto-setup monitoring for common tokens
  useEffect(() => {
    const setupMonitoring = async () => {
      const commonTokens = ['USDC', 'DAI', 'WETH']; // Your token list
      for (const token of commonTokens) {
        try {
          await monitoring.enableTokenMonitoring(token);
        } catch (error) {
          console.log(`Token ${token} already monitored`);
        }
      }
    };

    if (monitoring.isConnected) {
      setupMonitoring();
    }
  }, [monitoring.isConnected]);

  return (
    <div>
      {/* Health Status */}
      <HealthIndicator health={monitoring.health} />
      
      {/* Direct Transfer Alerts */}
      {monitoring.getDirectTransfers().length > 0 && (
        <DirectTransferAlert 
          transfers={monitoring.getDirectTransfers()}
          onRecover={monitoring.quickRecover}
        />
      )}
      
      {/* Recovery Actions */}
      <RecoveryActions 
        actions={monitoring.actions}
        onExecute={monitoring.executeAction}
      />
    </div>
  );
}
```

### **Automated Monitoring Bot**
```typescript
// Background monitoring service
class JarMonitoringBot {
  private clients: Map<string, JarMonitorClient> = new Map();
  
  async startMonitoring(jarAddresses: string[]) {
    for (const address of jarAddresses) {
      const client = new JarMonitorClient(provider, address, signer);
      this.clients.set(address, client);
      
      // Start monitoring session
      await client.startMonitoringSession({
        autoRecover: true, // Auto-recover direct transfers
        notificationCallback: (transfer) => {
          this.sendAlert(address, transfer);
        }
      });
    }
  }
  
  private async sendAlert(jarAddress: string, transfer: DetectedTransfer) {
    if (transfer.isDirectTransfer) {
      // Send webhook notification
      await fetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'direct_transfer',
          jarAddress,
          transfer,
          timestamp: Date.now()
        })
      });
    }
  }
}
```

## 🔔 **Notification System**

### **Browser Notifications**
```typescript
// Request permission
await Notification.requestPermission();

// Show notification
function showTransferNotification(transfer: DetectedTransfer) {
  if (Notification.permission === 'granted') {
    const notification = new Notification('🚨 Direct Transfer Detected!', {
      body: `${transfer.amountFormatted} ${transfer.tokenSymbol} sent to jar`,
      icon: '/cookie-jar-icon.png',
      badge: '/cookie-jar-badge.png',
      tag: 'jar-transfer', // Prevents spam
      requireInteraction: true // Stays visible until clicked
    });
    
    notification.onclick = () => {
      // Navigate to recovery page
      window.focus();
      window.location.href = `/jar/${transfer.token}/recover`;
    };
  }
}
```

### **In-App Notifications**
```typescript
// Toast notifications with action buttons
function showRecoveryToast(transfer: DetectedTransfer) {
  toast.custom((t) => (
    <div className="recovery-toast">
      <div className="toast-content">
        <h4>🚨 Direct Transfer Detected</h4>
        <p>{transfer.amountFormatted} {transfer.tokenSymbol}</p>
      </div>
      <div className="toast-actions">
        <button onClick={() => quickRecover(transfer.token)}>
          🚀 Quick Recover
        </button>
        <button onClick={() => toast.dismiss(t.id)}>
          ⏰ Later
        </button>
      </div>
    </div>
  ), {
    duration: 10000, // 10 seconds
    position: 'top-right'
  });
}
```

## 📊 **Analytics & Reporting**

### **Transfer Analytics**
```typescript
function TransferAnalytics({ jarAddress }: { jarAddress: string }) {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const analyzeTransfers = async () => {
      const detector = new TransferDetector(provider, jarAddress);
      const analysis = await detector.analyzeJar();
      
      // Generate analytics
      const analytics = {
        transfersByDay: groupTransfersByDay(analysis.directTransfers),
        topTokens: getTopTokensByVolume(analysis.directTransfers),
        frequentSenders: getFrequentSenders(analysis.directTransfers),
        recoveryRate: calculateRecoveryRate(analysis),
        averageAmount: calculateAverageAmount(analysis.directTransfers)
      };
      
      setAnalytics(analytics);
    };
    
    analyzeTransfers();
  }, [jarAddress]);

  return (
    <div className="transfer-analytics">
      <h3>📊 Transfer Analytics</h3>
      
      {analytics && (
        <>
          <Chart data={analytics.transfersByDay} type="line" title="Transfers per Day" />
          <Chart data={analytics.topTokens} type="bar" title="Top Tokens by Volume" />
          <MetricCard title="Recovery Rate" value={`${analytics.recoveryRate}%`} />
          <MetricCard title="Average Amount" value={analytics.averageAmount} />
        </>
      )}
    </div>
  );
}
```

## 🛠 **Advanced Use Cases**

### **1. Multi-Jar Portfolio Monitoring**
```typescript
function PortfolioMonitor({ userAddress }: { userAddress: string }) {
  const [userJars, setUserJars] = useState<string[]>([]);
  const [portfolioHealth, setPortfolioHealth] = useState<Map<string, JarHealth>>(new Map());

  // Get user's jars from factory events
  useEffect(() => {
    const fetchUserJars = async () => {
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const filter = factory.filters.CookieJarCreated(userAddress);
      const events = await factory.queryFilter(filter);
      
      const jars = events.map(event => event.args.cookieJarAddress);
      setUserJars(jars);
    };
    
    fetchUserJars();
  }, [userAddress]);

  // Monitor all user jars
  useEffect(() => {
    const monitorJars = async () => {
      const healthChecks = await Promise.all(
        userJars.map(async (jarAddress) => {
          const client = new JarMonitorClient(provider, jarAddress, signer);
          const health = await client.checkJarHealth();
          return [jarAddress, health] as const;
        })
      );
      
      setPortfolioHealth(new Map(healthChecks));
    };
    
    if (userJars.length > 0) {
      monitorJars();
      const interval = setInterval(monitorJars, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [userJars]);

  const unhealthyJars = Array.from(portfolioHealth.entries())
    .filter(([_, health]) => !health.isHealthy);

  return (
    <div className="portfolio-monitor">
      <h2>🏦 Portfolio Health</h2>
      
      <div className="portfolio-stats">
        <div className="stat">
          <strong>{userJars.length}</strong>
          <span>Total Jars</span>
        </div>
        <div className="stat">
          <strong>{unhealthyJars.length}</strong>
          <span>Issues Detected</span>
        </div>
      </div>

      {unhealthyJars.length > 0 && (
        <div className="urgent-issues">
          <h3>🚨 Urgent Issues</h3>
          {unhealthyJars.map(([address, health]) => (
            <JarIssueCard key={address} address={address} health={health} />
          ))}
        </div>
      )}
      
      <JarHealthDashboard jarAddresses={userJars} />
    </div>
  );
}
```

### **2. Automated Recovery Service**
```typescript
// Background service for automatic recovery
class AutoRecoveryService {
  private monitoredJars = new Set<string>();
  
  async addJar(jarAddress: string, options: {
    autoRecover?: boolean;
    maxGasPrice?: BigNumber;
    minAmount?: BigNumber;
  } = {}) {
    if (this.monitoredJars.has(jarAddress)) return;
    
    this.monitoredJars.add(jarAddress);
    
    const client = new JarMonitorClient(provider, jarAddress, signer);
    
    // Start monitoring session with auto-recovery
    await client.startMonitoringSession({
      autoRecover: options.autoRecover ?? true,
      notificationCallback: async (transfer) => {
        if (transfer.isDirectTransfer && transfer.amount.gte(options.minAmount ?? 0)) {
          try {
            // Check gas price
            const gasPrice = await provider.getGasPrice();
            if (options.maxGasPrice && gasPrice.gt(options.maxGasPrice)) {
              console.log('⏰ Gas price too high, deferring recovery');
              return;
            }
            
            // Execute recovery
            await client.quickRecover(transfer.token);
            
            // Log success
            console.log(`✅ Auto-recovered ${transfer.amountFormatted} ${transfer.tokenSymbol}`);
            
          } catch (error) {
            console.error('❌ Auto-recovery failed:', error);
            // Could send alert to user
          }
        }
      }
    });
  }
  
  async removeJar(jarAddress: string) {
    this.monitoredJars.delete(jarAddress);
    // Stop monitoring session
  }
}
```

## 🎯 **Integration with Existing dApp**

### **Add to Existing Jar Page**
```typescript
// Add monitoring to your existing jar page
function ExistingJarPage({ jarAddress }: { jarAddress: string }) {
  const monitoring = useJarMonitoring({ jarAddress, autoScan: true });
  
  return (
    <div>
      {/* Your existing jar UI */}
      <ExistingJarComponent jarAddress={jarAddress} />
      
      {/* Add monitoring section */}
      {monitoring.stats.directTransfers > 0 && (
        <div className="monitoring-alert">
          <h3>🚨 Recovery Needed</h3>
          <p>{monitoring.stats.directTransfers} direct transfers detected</p>
          <button onClick={() => monitoring.quickRecover()}>
            🚀 Auto-Recover All
          </button>
        </div>
      )}
      
      {/* Health status in sidebar */}
      <HealthSidebar health={monitoring.health} />
    </div>
  );
}
```

### **Add to Jar Creation Flow**
```typescript
function CreateJarPage() {
  const [newJarAddress, setNewJarAddress] = useState<string>('');
  
  const handleJarCreated = async (jarAddress: string) => {
    setNewJarAddress(jarAddress);
    
    // Immediately setup monitoring for new jar
    const client = new JarMonitorClient(provider, jarAddress, signer);
    await client.setupOptimalMonitoring([
      USDC_ADDRESS,
      DAI_ADDRESS,
      WETH_ADDRESS
    ]);
    
    // Show success message
    toast.success('✅ Jar created and monitoring enabled!');
  };

  return (
    <div>
      <CreateJarForm onJarCreated={handleJarCreated} />
      
      {newJarAddress && (
        <div className="new-jar-monitoring">
          <h3>🔍 Monitoring Setup Complete</h3>
          <p>Your new jar is now protected against accidental transfers!</p>
          <TransferScanner jarAddress={newJarAddress} autoScan={true} />
        </div>
      )}
    </div>
  );
}
```

## 🏁 **Summary**

The client-side monitoring system provides:

### ✅ **Complete Detection Coverage**
- **Real-time monitoring** via WebSocket/event listeners
- **Historical scanning** via RPC log queries
- **Batch analysis** for multiple jars
- **Pattern detection** for anomalies

### ✅ **User-Friendly Recovery**
- **One-click recovery** for direct transfers
- **Automated workflows** for common scenarios
- **Batch processing** for multiple issues
- **Progress tracking** and notifications

### ✅ **Developer-Friendly Integration**
- **React hooks** for easy state management
- **TypeScript SDK** with full type safety
- **Modular components** for flexible UI
- **Comprehensive examples** and documentation

This system transforms the user experience from **"be careful or lose tokens"** to **"send however you want, we'll detect and recover automatically!"** 🚀

The off-chain monitoring is the perfect complement to the on-chain detection system, providing real-time alerts and automated recovery workflows that make Cookie Jars truly user-friendly.