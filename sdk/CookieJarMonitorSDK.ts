import { ethers, Contract, providers, BigNumber } from 'ethers';

// Types
interface DetectedTransfer {
  token: string;
  amount: BigNumber;
  blockNumber: number;
  timestamp: number;
  processed: boolean;
  detectedBy: string;
}

interface TransferEvent {
  token: string;
  from: string;
  to: string;
  amount: BigNumber;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

interface JarStatistics {
  totalDetectedTransfers: number;
  monitoredTokensCount: number;
  monitoredTokens: string[];
  unaccountedBalances: BigNumber[];
  pendingBalances: BigNumber[];
}

interface AutoProcessSettings {
  enabled: boolean;
  minAmount: BigNumber;
  maxSlippage: number;
  swapPath: string[];
}

// ABIs (simplified - in practice you'd import these)
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

const COOKIE_JAR_DETECTION_ABI = [
  // Events
  "event DirectTransferDetected(address indexed token, uint256 amount, uint256 blockNumber, address indexed detectedBy, uint256 transferIndex)",
  "event DetectedTransferProcessed(address indexed token, uint256 amount, uint256 amountOut, address indexed processedBy, uint256 transferIndex)",
  "event TokenMonitoringEnabled(address indexed token, address indexed enabledBy)",
  
  // View functions
  "function getMonitoredTokens() view returns (address[])",
  "function getTotalDetectedTransfers() view returns (uint256)",
  "function getUnaccountedBalance(address token) view returns (uint256)",
  "function getUnprocessedTransfersForToken(address token) view returns (tuple(address token, uint256 amount, uint256 blockNumber, uint256 timestamp, bool processed, address detectedBy)[])",
  "function detectedTransfers(uint256 index) view returns (address token, uint256 amount, uint256 blockNumber, uint256 timestamp, bool processed, address detectedBy)",
  "function monitoredTokens(address token) view returns (bool)",
  "function pendingTokens(address token) view returns (uint256)",
  "function lastKnownBalance(address token) view returns (uint256)",
  "function autoProcessSettings(address token) view returns (bool enabled, uint256 minAmount, uint256 maxSlippage, address[] swapPath)",
  
  // State changing functions
  "function enableTokenMonitoring(address token)",
  "function scanToken(address token) returns (bool)",
  "function scanAllMonitoredTokens() returns (uint256)",
  "function processDetectedTransfer(uint256 transferIndex, uint256 minOut, address[] path)",
  "function processAllDetectedTransfers(address token, uint256 minOut, address[] path)",
  "function emergencyRecover(address token, uint256 amount, uint256 minOut, address[] path)",
  "function configureAutoProcessing(address token, bool enabled, uint256 minAmount, uint256 maxSlippage, address[] swapPath)"
];

const MONITOR_ABI = [
  "function batchScanJars(address[] jars, address[] tokens) returns (uint256[][])",
  "function batchHealthCheck(address[] jars) returns (bool[])",
  "function getJarStatistics(address jarAddress) view returns (uint256, uint256, address[], uint256[], uint256[])",
  "function simulateBatchOperations(address[] jars, address[] tokens) view returns (uint256[][], uint256[][], bool[][])"
];

export class CookieJarMonitorSDK {
  private provider: providers.Provider;
  private signer?: ethers.Signer;
  private monitorContract?: Contract;

  constructor(provider: providers.Provider, signer?: ethers.Signer, monitorAddress?: string) {
    this.provider = provider;
    this.signer = signer;
    
    if (monitorAddress && signer) {
      this.monitorContract = new Contract(monitorAddress, MONITOR_ABI, signer);
    }
  }

  // === DETECTION METHODS ===

  /**
   * Monitor Transfer events to detect direct transfers to a jar
   */
  async monitorTransferEvents(
    jarAddress: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest'
  ): Promise<TransferEvent[]> {
    // Transfer event topic
    const transferTopic = ethers.utils.id("Transfer(address,address,uint256)");
    
    // Filter for transfers TO the jar address
    const filter = {
      topics: [
        transferTopic,
        null, // from (any address)
        ethers.utils.hexZeroPad(jarAddress, 32) // to (jar address)
      ],
      fromBlock,
      toBlock
    };

    const logs = await this.provider.getLogs(filter);
    
    return Promise.all(logs.map(async (log) => {
      const iface = new ethers.utils.Interface(ERC20_ABI);
      const decoded = iface.parseLog(log);
      
      return {
        token: log.address,
        from: decoded.args.from,
        to: decoded.args.to,
        amount: decoded.args.value,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex
      };
    }));
  }

  /**
   * Get comprehensive jar analysis
   */
  async analyzeJar(jarAddress: string, fromBlock: number = 0): Promise<{
    directTransfers: TransferEvent[];
    detectedTransfers: DetectedTransfer[];
    statistics: JarStatistics;
    healthStatus: boolean;
    recommendations: string[];
  }> {
    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.provider);
    
    // Get direct transfers from events
    const directTransfers = await this.monitorTransferEvents(jarAddress, fromBlock);
    
    // Get detected transfers
    const totalDetected = await jarContract.getTotalDetectedTransfers();
    const detectedTransfers: DetectedTransfer[] = [];
    
    for (let i = 0; i < totalDetected.toNumber(); i++) {
      const transfer = await jarContract.detectedTransfers(i);
      detectedTransfers.push({
        token: transfer.token,
        amount: transfer.amount,
        blockNumber: transfer.blockNumber.toNumber(),
        timestamp: transfer.timestamp.toNumber(),
        processed: transfer.processed,
        detectedBy: transfer.detectedBy
      });
    }

    // Get statistics
    const statistics = await this.getJarStatistics(jarAddress);
    
    // Determine health status
    const unprocessedCount = detectedTransfers.filter(t => !t.processed).length;
    const healthStatus = unprocessedCount === 0;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      directTransfers,
      detectedTransfers,
      statistics
    );

    return {
      directTransfers,
      detectedTransfers,
      statistics,
      healthStatus,
      recommendations
    };
  }

  /**
   * Get jar statistics
   */
  async getJarStatistics(jarAddress: string): Promise<JarStatistics> {
    if (!this.monitorContract) {
      throw new Error("Monitor contract not initialized");
    }

    const [
      totalDetectedTransfers,
      monitoredTokensCount,
      monitoredTokens,
      unaccountedBalances,
      pendingBalances
    ] = await this.monitorContract.getJarStatistics(jarAddress);

    return {
      totalDetectedTransfers: totalDetectedTransfers.toNumber(),
      monitoredTokensCount: monitoredTokensCount.toNumber(),
      monitoredTokens,
      unaccountedBalances,
      pendingBalances
    };
  }

  /**
   * Batch scan multiple jars
   */
  async batchScanJars(jarAddresses: string[], tokenAddresses: string[]): Promise<BigNumber[][]> {
    if (!this.monitorContract) {
      throw new Error("Monitor contract not initialized");
    }

    return await this.monitorContract.batchScanJars(jarAddresses, tokenAddresses);
  }

  /**
   * Batch health check
   */
  async batchHealthCheck(jarAddresses: string[]): Promise<boolean[]> {
    if (!this.monitorContract) {
      throw new Error("Monitor contract not initialized");
    }

    return await this.monitorContract.batchHealthCheck(jarAddresses);
  }

  // === RECOVERY METHODS ===

  /**
   * Enable monitoring for a token
   */
  async enableTokenMonitoring(jarAddress: string, tokenAddress: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Signer required for state changes");
    }

    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer);
    return await jarContract.enableTokenMonitoring(tokenAddress);
  }

  /**
   * Scan a specific jar for a specific token
   */
  async scanToken(jarAddress: string, tokenAddress: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Signer required for state changes");
    }

    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer);
    return await jarContract.scanToken(tokenAddress);
  }

  /**
   * Process a detected transfer
   */
  async processDetectedTransfer(
    jarAddress: string,
    transferIndex: number,
    minOut: BigNumber,
    swapPath: string[] = []
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Signer required for state changes");
    }

    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer);
    return await jarContract.processDetectedTransfer(transferIndex, minOut, swapPath);
  }

  /**
   * Emergency recover unaccounted tokens
   */
  async emergencyRecover(
    jarAddress: string,
    tokenAddress: string,
    amount: BigNumber = BigNumber.from(0),
    minOut: BigNumber = BigNumber.from(0),
    swapPath: string[] = []
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Signer required for state changes");
    }

    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer);
    return await jarContract.emergencyRecover(tokenAddress, amount, minOut, swapPath);
  }

  /**
   * Configure auto-processing for a token
   */
  async configureAutoProcessing(
    jarAddress: string,
    tokenAddress: string,
    settings: AutoProcessSettings
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error("Signer required for state changes");
    }

    const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer);
    return await jarContract.configureAutoProcessing(
      tokenAddress,
      settings.enabled,
      settings.minAmount,
      settings.maxSlippage,
      settings.swapPath
    );
  }

  // === UTILITY METHODS ===

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string): Promise<{
    symbol: string;
    decimals: number;
    balance: BigNumber;
  }> {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.provider);
    
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);

    return {
      symbol,
      decimals,
      balance: BigNumber.from(0) // Would need jar address to get balance
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    directTransfers: TransferEvent[],
    detectedTransfers: DetectedTransfer[],
    statistics: JarStatistics
  ): string[] {
    const recommendations: string[] = [];

    // Check for unprocessed transfers
    const unprocessed = detectedTransfers.filter(t => !t.processed);
    if (unprocessed.length > 0) {
      recommendations.push(`Process ${unprocessed.length} unprocessed detected transfers`);
    }

    // Check for unmonitored tokens that received transfers
    const transferredTokens = new Set(directTransfers.map(t => t.token));
    const monitoredTokens = new Set(statistics.monitoredTokens);
    
    for (const token of transferredTokens) {
      if (!monitoredTokens.has(token)) {
        recommendations.push(`Enable monitoring for token ${token}`);
      }
    }

    // Check for large unaccounted balances
    statistics.unaccountedBalances.forEach((balance, index) => {
      if (balance.gt(0)) {
        const token = statistics.monitoredTokens[index];
        recommendations.push(`Investigate unaccounted balance of ${balance.toString()} for token ${token}`);
      }
    });

    // Check for old unprocessed transfers
    const oldTransfers = unprocessed.filter(
      t => Date.now() / 1000 - t.timestamp > 24 * 60 * 60 // 24 hours
    );
    if (oldTransfers.length > 0) {
      recommendations.push(`Process ${oldTransfers.length} transfers older than 24 hours`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Jar is healthy - no actions needed");
    }

    return recommendations;
  }

  /**
   * Auto-monitor and process jars
   */
  async autoMonitor(
    jarAddresses: string[],
    options: {
      enableMissingMonitoring?: boolean;
      autoProcess?: boolean;
      maxSlippage?: number;
      minAmountThreshold?: BigNumber;
    } = {}
  ): Promise<{
    scanned: number;
    detected: number;
    processed: number;
    errors: string[];
  }> {
    const results = {
      scanned: 0,
      detected: 0,
      processed: 0,
      errors: [] as string[]
    };

    for (const jarAddress of jarAddresses) {
      try {
        // Analyze jar
        const analysis = await this.analyzeJar(jarAddress);
        results.scanned++;

        // Enable monitoring for tokens that received transfers
        if (options.enableMissingMonitoring) {
          const transferredTokens = new Set(analysis.directTransfers.map(t => t.token));
          const monitoredTokens = new Set(analysis.statistics.monitoredTokens);
          
          for (const token of transferredTokens) {
            if (!monitoredTokens.has(token)) {
              try {
                await this.enableTokenMonitoring(jarAddress, token);
              } catch (error) {
                results.errors.push(`Failed to enable monitoring for ${token}: ${error}`);
              }
            }
          }
        }

        // Scan for new transfers
        const jarContract = new Contract(jarAddress, COOKIE_JAR_DETECTION_ABI, this.signer || this.provider);
        const detected = await jarContract.callStatic.scanAllMonitoredTokens();
        results.detected += detected.toNumber();

        if (detected.gt(0)) {
          await jarContract.scanAllMonitoredTokens();
        }

        // Auto-process if enabled
        if (options.autoProcess && this.signer) {
          const unprocessed = analysis.detectedTransfers.filter(t => !t.processed);
          
          for (const transfer of unprocessed) {
            try {
              if (!options.minAmountThreshold || transfer.amount.gte(options.minAmountThreshold)) {
                await this.processDetectedTransfer(
                  jarAddress,
                  analysis.detectedTransfers.indexOf(transfer),
                  BigNumber.from(0) // Could calculate based on maxSlippage
                );
                results.processed++;
              }
            } catch (error) {
              results.errors.push(`Failed to process transfer: ${error}`);
            }
          }
        }

      } catch (error) {
        results.errors.push(`Failed to process jar ${jarAddress}: ${error}`);
      }
    }

    return results;
  }
}

// Usage example
export async function createMonitoringBot(
  provider: providers.Provider,
  signer: ethers.Signer,
  monitorAddress: string
) {
  const sdk = new CookieJarMonitorSDK(provider, signer, monitorAddress);

  // Monitor jars every 5 minutes
  setInterval(async () => {
    try {
      const jarAddresses = ['0x...', '0x...']; // Your jar addresses
      
      const results = await sdk.autoMonitor(jarAddresses, {
        enableMissingMonitoring: true,
        autoProcess: true,
        maxSlippage: 500, // 5%
        minAmountThreshold: ethers.utils.parseEther("10") // Only process > 10 tokens
      });

      console.log('Monitoring results:', results);
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}