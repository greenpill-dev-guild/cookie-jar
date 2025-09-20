import { ethers, providers, Contract, BigNumber } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';

// Types
export interface DetectedTransfer {
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  from: string;
  amount: BigNumber;
  amountFormatted: string;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  logIndex: number;
  isDirectTransfer: boolean;
  isJarCall: boolean;
  gasUsed?: BigNumber;
  gasPrice?: BigNumber;
}

export interface JarAnalysis {
  jarAddress: string;
  totalTransfers: number;
  directTransfers: DetectedTransfer[];
  jarCallTransfers: DetectedTransfer[];
  suspiciousTransfers: DetectedTransfer[];
  totalValue: BigNumber;
  uniqueTokens: string[];
  timeRange: {
    earliest: number;
    latest: number;
  };
}

export interface MonitoringConfig {
  scanInterval: number; // milliseconds
  blocksPerBatch: number;
  maxRetries: number;
  enableRealTime: boolean;
  tokenWhitelist?: string[];
  minAmountThreshold?: BigNumber;
}

export class TransferDetector {
  private provider: providers.Provider;
  private jarAddress: string;
  private config: MonitoringConfig;
  private isMonitoring = false;
  private lastScannedBlock = 0;
  private eventCallbacks: Map<string, Function[]> = new Map();

  // ERC-20 Transfer event signature
  private static readonly TRANSFER_TOPIC = ethers.utils.id("Transfer(address,address,uint256)");
  
  // Common ERC-20 ABI for token info
  private static readonly ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];

  constructor(
    provider: providers.Provider,
    jarAddress: string,
    config: Partial<MonitoringConfig> = {}
  ) {
    this.provider = provider;
    this.jarAddress = jarAddress;
    this.config = {
      scanInterval: 30000, // 30 seconds
      blocksPerBatch: 1000,
      maxRetries: 3,
      enableRealTime: true,
      ...config
    };
  }

  // === CORE DETECTION METHODS ===

  /**
   * Scan for transfers in a specific block range
   */
  async scanBlockRange(fromBlock: number, toBlock: number | 'latest' = 'latest'): Promise<DetectedTransfer[]> {
    try {
      // Get all Transfer events to this jar
      const filter = {
        topics: [
          TransferDetector.TRANSFER_TOPIC,
          null, // from (any address)
          ethers.utils.hexZeroPad(this.jarAddress, 32) // to (jar address)
        ],
        fromBlock,
        toBlock
      };

      const logs = await this.provider.getLogs(filter);
      
      // Process logs in parallel for better performance
      const transfers = await Promise.all(
        logs.map(log => this.processTransferLog(log))
      );

      // Filter out failed processing
      return transfers.filter(Boolean) as DetectedTransfer[];

    } catch (error) {
      console.error('Error scanning block range:', error);
      throw new Error(`Failed to scan blocks ${fromBlock}-${toBlock}: ${error}`);
    }
  }

  /**
   * Process a single transfer log
   */
  private async processTransferLog(log: Log): Promise<DetectedTransfer | null> {
    try {
      // Decode transfer event
      const iface = new ethers.utils.Interface(TransferDetector.ERC20_ABI);
      const decoded = iface.parseLog(log);
      
      const { from, to, value } = decoded.args;

      // Get token information
      const tokenContract = new Contract(log.address, TransferDetector.ERC20_ABI, this.provider);
      const [symbol, decimals] = await Promise.all([
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.decimals().catch(() => 18)
      ]);

      // Get transaction details
      const [transaction, receipt, block] = await Promise.all([
        this.provider.getTransaction(log.transactionHash),
        this.provider.getTransactionReceipt(log.transactionHash),
        this.provider.getBlock(log.blockNumber)
      ]);

      // Determine if this was a direct transfer or jar function call
      const isDirectTransfer = transaction.to?.toLowerCase() === log.address.toLowerCase();
      const isJarCall = transaction.to?.toLowerCase() === this.jarAddress.toLowerCase();

      // Format amount
      const amountFormatted = ethers.utils.formatUnits(value, decimals);

      return {
        token: log.address,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        from,
        amount: value,
        amountFormatted,
        blockNumber: log.blockNumber,
        timestamp: block.timestamp,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        isDirectTransfer,
        isJarCall,
        gasUsed: receipt.gasUsed,
        gasPrice: transaction.gasPrice
      };

    } catch (error) {
      console.error('Error processing transfer log:', error);
      return null;
    }
  }

  /**
   * Get comprehensive jar analysis
   */
  async analyzeJar(fromBlock: number = 0, toBlock: number | 'latest' = 'latest'): Promise<JarAnalysis> {
    const transfers = await this.scanBlockRange(fromBlock, toBlock);
    
    // Categorize transfers
    const directTransfers = transfers.filter(t => t.isDirectTransfer);
    const jarCallTransfers = transfers.filter(t => t.isJarCall);
    
    // Find suspicious transfers (high gas, unusual patterns)
    const suspiciousTransfers = transfers.filter(t => 
      t.gasUsed?.gt(500000) || // High gas usage
      t.amount.eq(0) // Zero amount transfers
    );

    // Calculate statistics
    const totalValue = transfers.reduce(
      (sum, t) => sum.add(t.amount), 
      BigNumber.from(0)
    );
    
    const uniqueTokens = [...new Set(transfers.map(t => t.token))];
    
    const timestamps = transfers.map(t => t.timestamp).filter(Boolean);
    const timeRange = {
      earliest: Math.min(...timestamps),
      latest: Math.max(...timestamps)
    };

    return {
      jarAddress: this.jarAddress,
      totalTransfers: transfers.length,
      directTransfers,
      jarCallTransfers,
      suspiciousTransfers,
      totalValue,
      uniqueTokens,
      timeRange
    };
  }

  // === REAL-TIME MONITORING ===

  /**
   * Start real-time monitoring
   */
  async startMonitoring(onTransferDetected?: (transfer: DetectedTransfer) => void): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Already monitoring');
    }

    this.isMonitoring = true;
    this.lastScannedBlock = await this.provider.getBlockNumber();

    console.log(`🔍 Starting real-time monitoring for jar ${this.jarAddress}`);
    console.log(`📊 Starting from block ${this.lastScannedBlock}`);

    // Set up real-time event listener
    if (this.config.enableRealTime) {
      this.setupRealTimeListener(onTransferDetected);
    }

    // Set up periodic batch scanning
    this.setupBatchScanning(onTransferDetected);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.provider.removeAllListeners();
    console.log('🛑 Stopped monitoring');
  }

  /**
   * Setup real-time event listener
   */
  private setupRealTimeListener(callback?: (transfer: DetectedTransfer) => void): void {
    const filter = {
      topics: [
        TransferDetector.TRANSFER_TOPIC,
        null,
        ethers.utils.hexZeroPad(this.jarAddress, 32)
      ]
    };

    this.provider.on(filter, async (log: Log) => {
      try {
        const transfer = await this.processTransferLog(log);
        if (transfer) {
          console.log(`🔔 Real-time transfer detected: ${transfer.amountFormatted} ${transfer.tokenSymbol}`);
          
          callback?.(transfer);
          this.emit('transferDetected', transfer);

          // Auto-trigger on-chain detection if it's a direct transfer
          if (transfer.isDirectTransfer) {
            this.emit('directTransferDetected', transfer);
          }
        }
      } catch (error) {
        console.error('Error processing real-time transfer:', error);
      }
    });
  }

  /**
   * Setup periodic batch scanning
   */
  private setupBatchScanning(callback?: (transfer: DetectedTransfer) => void): void {
    const scanInterval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(scanInterval);
        return;
      }

      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.lastScannedBlock) {
          const fromBlock = this.lastScannedBlock + 1;
          const toBlock = Math.min(currentBlock, fromBlock + this.config.blocksPerBatch - 1);
          
          console.log(`📊 Batch scanning blocks ${fromBlock}-${toBlock}`);
          
          const transfers = await this.scanBlockRange(fromBlock, toBlock);
          
          if (transfers.length > 0) {
            console.log(`🔍 Found ${transfers.length} transfers in batch scan`);
            
            transfers.forEach(transfer => {
              callback?.(transfer);
              this.emit('transferDetected', transfer);
            });
          }
          
          this.lastScannedBlock = toBlock;
        }
      } catch (error) {
        console.error('Error in batch scanning:', error);
      }
    }, this.config.scanInterval);
  }

  // === ADVANCED ANALYSIS ===

  /**
   * Detect patterns and anomalies
   */
  async detectAnomalies(transfers: DetectedTransfer[]): Promise<{
    highValueTransfers: DetectedTransfer[];
    frequentSenders: { address: string; count: number; totalAmount: BigNumber }[];
    unusualTokens: string[];
    gasAnomalies: DetectedTransfer[];
  }> {
    // High value transfers (top 10% by value)
    const sortedByValue = [...transfers].sort((a, b) => 
      b.amount.gt(a.amount) ? 1 : -1
    );
    const highValueThreshold = Math.floor(transfers.length * 0.1);
    const highValueTransfers = sortedByValue.slice(0, highValueThreshold);

    // Frequent senders
    const senderStats = new Map<string, { count: number; totalAmount: BigNumber }>();
    transfers.forEach(t => {
      const existing = senderStats.get(t.from) || { count: 0, totalAmount: BigNumber.from(0) };
      senderStats.set(t.from, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount.add(t.amount)
      });
    });

    const frequentSenders = Array.from(senderStats.entries())
      .map(([address, stats]) => ({ address, ...stats }))
      .filter(s => s.count > 1)
      .sort((a, b) => b.count - a.count);

    // Unusual tokens (not in common token list)
    const commonTokens = new Set([
      '0xA0b86a33E6441E8C8C7014b37C5C3Ff8bB7b1A25', // USDC (example)
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI (example)
      // Add more common tokens
    ]);
    const unusualTokens = [...new Set(transfers.map(t => t.token))]
      .filter(token => !commonTokens.has(token));

    // Gas anomalies
    const avgGasUsed = transfers
      .filter(t => t.gasUsed)
      .reduce((sum, t) => sum.add(t.gasUsed!), BigNumber.from(0))
      .div(transfers.length);
    
    const gasAnomalies = transfers.filter(t => 
      t.gasUsed && (
        t.gasUsed.gt(avgGasUsed.mul(3)) || // 3x average gas
        t.gasUsed.lt(21000) // Below minimum transfer gas
      )
    );

    return {
      highValueTransfers,
      frequentSenders,
      unusualTokens,
      gasAnomalies
    };
  }

  /**
   * Generate recovery recommendations
   */
  async generateRecommendations(analysis: JarAnalysis): Promise<{
    immediate: string[];
    suggested: string[];
    monitoring: string[];
  }> {
    const immediate: string[] = [];
    const suggested: string[] = [];
    const monitoring: string[] = [];

    // Immediate actions for direct transfers
    if (analysis.directTransfers.length > 0) {
      immediate.push(`🚨 ${analysis.directTransfers.length} direct transfers detected - enable monitoring and scan`);
      
      analysis.directTransfers.forEach(transfer => {
        immediate.push(
          `💰 Recover ${transfer.amountFormatted} ${transfer.tokenSymbol} from ${transfer.transactionHash.slice(0, 10)}...`
        );
      });
    }

    // Suggested optimizations
    if (analysis.uniqueTokens.length > 5) {
      suggested.push(`📈 Consider auto-processing for ${analysis.uniqueTokens.length} different tokens`);
    }

    if (analysis.directTransfers.length > analysis.jarCallTransfers.length) {
      suggested.push('📢 Educate users about proper deposit methods');
    }

    // Monitoring recommendations
    analysis.uniqueTokens.forEach(token => {
      monitoring.push(`🔍 Enable monitoring for token ${token}`);
    });

    if (analysis.totalTransfers > 10) {
      monitoring.push('⚙️ Configure auto-processing for frequently transferred tokens');
    }

    return { immediate, suggested, monitoring };
  }

  // === EVENT SYSTEM ===

  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }
}