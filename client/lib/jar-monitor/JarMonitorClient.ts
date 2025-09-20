import { ethers, providers, Contract, BigNumber } from 'ethers';
import { TransferDetector, DetectedTransfer, JarAnalysis } from './TransferDetector';

// Types
export interface RecoveryAction {
  type: 'scan' | 'process' | 'emergency' | 'configure';
  description: string;
  token?: string;
  amount?: BigNumber;
  estimatedGas: BigNumber;
  execute: () => Promise<ethers.ContractTransaction>;
}

export interface JarHealth {
  address: string;
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  lastChecked: number;
}

export interface MonitoringSession {
  jarAddress: string;
  startTime: number;
  transfersDetected: number;
  transfersProcessed: number;
  totalValueRecovered: BigNumber;
  isActive: boolean;
}

// Cookie Jar contract ABI
const COOKIE_JAR_DETECTION_ABI = [
  // View functions
  "function getMonitoredTokens() view returns (address[])",
  "function monitoredTokens(address) view returns (bool)",
  "function getUnaccountedBalance(address) view returns (uint256)",
  "function getTotalDetectedTransfers() view returns (uint256)",
  "function getUnprocessedTransfersForToken(address) view returns (tuple(address,uint256,uint256,uint256,bool,address)[])",
  "function pendingTokens(address) view returns (uint256)",
  "function getJarTokenBalance() view returns (uint256)",
  "function isJarToken(address) view returns (bool)",
  
  // State changing functions  
  "function enableTokenMonitoring(address)",
  "function scanToken(address) returns (bool)",
  "function scanAllMonitoredTokens() returns (uint256)",
  "function processDetectedTransfer(uint256,uint256,address[])",
  "function processAllDetectedTransfers(address,uint256,address[])",
  "function emergencyRecover(address,uint256,uint256,address[])",
  "function configureAutoProcessing(address,bool,uint256,uint256,address[])",
  
  // Events
  "event DirectTransferDetected(address indexed token, uint256 amount, uint256 blockNumber, address indexed detectedBy, uint256 transferIndex)",
  "event DetectedTransferProcessed(address indexed token, uint256 amount, uint256 amountOut, address indexed processedBy, uint256 transferIndex)"
];

export class JarMonitorClient {
  private provider: providers.Provider;
  private signer?: ethers.Signer;
  private detector: TransferDetector;
  private contract: Contract;
  private monitoringSessions: Map<string, MonitoringSession> = new Map();

  constructor(
    provider: providers.Provider,
    jarAddress: string,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;
    this.detector = new TransferDetector(provider, jarAddress);
    this.contract = new Contract(
      jarAddress, 
      COOKIE_JAR_DETECTION_ABI, 
      signer || provider
    );
  }

  // === COMPREHENSIVE JAR ANALYSIS ===

  /**
   * Perform complete jar analysis
   */
  async performFullAnalysis(fromBlock: number = 0): Promise<{
    transferAnalysis: JarAnalysis;
    onChainStatus: any;
    recoveryActions: RecoveryAction[];
    healthStatus: JarHealth;
  }> {
    console.log('🔍 Starting comprehensive jar analysis...');

    // 1. Analyze transfer history
    const transferAnalysis = await this.detector.analyzeJar(fromBlock);
    
    // 2. Get on-chain status
    const onChainStatus = await this.getOnChainStatus();
    
    // 3. Generate recovery actions
    const recoveryActions = await this.generateRecoveryActions(transferAnalysis, onChainStatus);
    
    // 4. Check health
    const healthStatus = await this.checkJarHealth();

    console.log(`✅ Analysis complete: ${transferAnalysis.totalTransfers} transfers, ${recoveryActions.length} actions`);

    return {
      transferAnalysis,
      onChainStatus,
      recoveryActions,
      healthStatus
    };
  }

  /**
   * Get current on-chain status
   */
  async getOnChainStatus(): Promise<{
    monitoredTokens: string[];
    unaccountedBalances: { token: string; amount: BigNumber; symbol: string }[];
    pendingBalances: { token: string; amount: BigNumber; symbol: string }[];
    totalDetectedTransfers: number;
    jarTokenBalance: BigNumber;
  }> {
    try {
      const [monitoredTokens, totalDetectedTransfers, jarTokenBalance] = await Promise.all([
        this.contract.getMonitoredTokens(),
        this.contract.getTotalDetectedTransfers(),
        this.contract.getJarTokenBalance()
      ]);

      // Get balances for monitored tokens
      const [unaccountedBalances, pendingBalances] = await Promise.all([
        this.getTokenBalances(monitoredTokens, 'unaccounted'),
        this.getTokenBalances(monitoredTokens, 'pending')
      ]);

      return {
        monitoredTokens,
        unaccountedBalances,
        pendingBalances,
        totalDetectedTransfers: totalDetectedTransfers.toNumber(),
        jarTokenBalance
      };
    } catch (error) {
      console.error('Error getting on-chain status:', error);
      throw error;
    }
  }

  /**
   * Get token balances with metadata
   */
  private async getTokenBalances(
    tokens: string[], 
    type: 'unaccounted' | 'pending'
  ): Promise<{ token: string; amount: BigNumber; symbol: string }[]> {
    const balances = await Promise.all(
      tokens.map(async (token) => {
        try {
          const [amount, symbol] = await Promise.all([
            type === 'unaccounted' 
              ? this.contract.getUnaccountedBalance(token)
              : this.contract.pendingTokens(token),
            this.getTokenSymbol(token)
          ]);

          return { token, amount, symbol };
        } catch (error) {
          console.error(`Error getting ${type} balance for ${token}:`, error);
          return { token, amount: BigNumber.from(0), symbol: 'UNKNOWN' };
        }
      })
    );

    return balances.filter(b => b.amount.gt(0));
  }

  /**
   * Generate actionable recovery recommendations
   */
  async generateRecoveryActions(
    analysis: JarAnalysis, 
    onChainStatus: any
  ): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = [];

    // 1. Enable monitoring for tokens that received direct transfers
    const unmonitoredTokens = analysis.directTransfers
      .map(t => t.token)
      .filter(token => !onChainStatus.monitoredTokens.includes(token));

    for (const token of [...new Set(unmonitoredTokens)]) {
      actions.push({
        type: 'configure',
        description: `Enable monitoring for ${await this.getTokenSymbol(token)}`,
        token,
        estimatedGas: BigNumber.from(50000),
        execute: async () => this.contract.enableTokenMonitoring(token)
      });
    }

    // 2. Scan for undetected transfers
    if (analysis.directTransfers.length > onChainStatus.totalDetectedTransfers) {
      actions.push({
        type: 'scan',
        description: 'Scan all monitored tokens for new transfers',
        estimatedGas: BigNumber.from(100000),
        execute: async () => this.contract.scanAllMonitoredTokens()
      });
    }

    // 3. Process unaccounted balances
    for (const balance of onChainStatus.unaccountedBalances) {
      actions.push({
        type: 'emergency',
        description: `Emergency recover ${ethers.utils.formatEther(balance.amount)} ${balance.symbol}`,
        token: balance.token,
        amount: balance.amount,
        estimatedGas: BigNumber.from(200000),
        execute: async () => this.contract.emergencyRecover(balance.token, 0, 0, [])
      });
    }

    // 4. Process pending balances
    for (const balance of onChainStatus.pendingBalances) {
      actions.push({
        type: 'process',
        description: `Process ${ethers.utils.formatEther(balance.amount)} pending ${balance.symbol}`,
        token: balance.token,
        amount: balance.amount,
        estimatedGas: BigNumber.from(150000),
        execute: async () => this.contract.adminSwapPending(balance.token, 0, [])
      });
    }

    return actions;
  }

  /**
   * Check jar health
   */
  async checkJarHealth(): Promise<JarHealth> {
    try {
      const onChainStatus = await this.getOnChainStatus();
      
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for unaccounted balances
      if (onChainStatus.unaccountedBalances.length > 0) {
        issues.push(`${onChainStatus.unaccountedBalances.length} tokens with unaccounted balances`);
        recommendations.push('Run emergency recovery for unaccounted tokens');
      }

      // Check for pending balances
      if (onChainStatus.pendingBalances.length > 0) {
        issues.push(`${onChainStatus.pendingBalances.length} tokens with pending balances`);
        recommendations.push('Process pending token swaps');
      }

      // Check monitoring coverage
      const analysis = await this.detector.analyzeJar();
      const unmonitoredTokens = analysis.uniqueTokens.filter(
        token => !onChainStatus.monitoredTokens.includes(token)
      );
      
      if (unmonitoredTokens.length > 0) {
        issues.push(`${unmonitoredTokens.length} tokens not monitored`);
        recommendations.push('Enable monitoring for all tokens that received transfers');
      }

      const isHealthy = issues.length === 0;

      return {
        address: this.contract.address,
        isHealthy,
        issues,
        recommendations,
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        address: this.contract.address,
        isHealthy: false,
        issues: [`Error checking health: ${error}`],
        recommendations: ['Check contract connectivity'],
        lastChecked: Date.now()
      };
    }
  }

  // === AUTOMATED RECOVERY ===

  /**
   * Auto-recover all detected issues
   */
  async autoRecover(options: {
    enableMonitoring?: boolean;
    processUnaccounted?: boolean;
    processPending?: boolean;
    maxGasPrice?: BigNumber;
    dryRun?: boolean;
  } = {}): Promise<{
    actionsExecuted: number;
    totalGasUsed: BigNumber;
    errors: string[];
    transactions: string[];
  }> {
    const results = {
      actionsExecuted: 0,
      totalGasUsed: BigNumber.from(0),
      errors: [] as string[],
      transactions: [] as string[]
    };

    try {
      if (!this.signer) {
        throw new Error('Signer required for auto-recovery');
      }

      // Get current status and generate actions
      const analysis = await this.performFullAnalysis();
      const actions = analysis.recoveryActions;

      console.log(`🔧 Auto-recovery: ${actions.length} actions planned`);

      if (options.dryRun) {
        console.log('🧪 DRY RUN - No transactions will be executed');
        return results;
      }

      // Execute actions
      for (const action of actions) {
        try {
          // Check gas price if specified
          if (options.maxGasPrice) {
            const gasPrice = await this.provider.getGasPrice();
            if (gasPrice.gt(options.maxGasPrice)) {
              results.errors.push(`Gas price too high: ${gasPrice.toString()}`);
              continue;
            }
          }

          console.log(`⚡ Executing: ${action.description}`);
          
          const tx = await action.execute();
          const receipt = await tx.wait();
          
          results.actionsExecuted++;
          results.totalGasUsed = results.totalGasUsed.add(receipt.gasUsed);
          results.transactions.push(tx.hash);
          
          console.log(`✅ Completed: ${action.description} (Gas: ${receipt.gasUsed})`);
          
        } catch (error) {
          const errorMsg = `Failed to execute ${action.description}: ${error}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🎉 Auto-recovery complete: ${results.actionsExecuted}/${actions.length} actions executed`);

    } catch (error) {
      results.errors.push(`Auto-recovery failed: ${error}`);
      console.error('❌ Auto-recovery failed:', error);
    }

    return results;
  }

  // === MONITORING SESSIONS ===

  /**
   * Start a monitoring session
   */
  async startMonitoringSession(options: {
    autoRecover?: boolean;
    notificationCallback?: (transfer: DetectedTransfer) => void;
  } = {}): Promise<string> {
    const sessionId = `session_${Date.now()}`;
    
    const session: MonitoringSession = {
      jarAddress: this.contract.address,
      startTime: Date.now(),
      transfersDetected: 0,
      transfersProcessed: 0,
      totalValueRecovered: BigNumber.from(0),
      isActive: true
    };

    this.monitoringSessions.set(sessionId, session);

    // Setup transfer detection callback
    const onTransferDetected = async (transfer: DetectedTransfer) => {
      session.transfersDetected++;
      
      console.log(`🔔 Transfer detected in session ${sessionId}:`, {
        token: transfer.tokenSymbol,
        amount: transfer.amountFormatted,
        from: transfer.from,
        isDirectTransfer: transfer.isDirectTransfer
      });

      // Notify callback
      options.notificationCallback?.(transfer);

      // Auto-recover if enabled
      if (options.autoRecover && transfer.isDirectTransfer && this.signer) {
        try {
          await this.quickRecover(transfer.token);
          session.transfersProcessed++;
          session.totalValueRecovered = session.totalValueRecovered.add(transfer.amount);
        } catch (error) {
          console.error('Auto-recovery failed:', error);
        }
      }
    };

    // Start monitoring
    await this.detector.startMonitoring(onTransferDetected);

    console.log(`🚀 Monitoring session ${sessionId} started for jar ${this.contract.address}`);
    
    return sessionId;
  }

  /**
   * Stop monitoring session
   */
  stopMonitoringSession(sessionId: string): MonitoringSession | null {
    const session = this.monitoringSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.detector.stopMonitoring();
      this.monitoringSessions.delete(sessionId);
      
      console.log(`🛑 Monitoring session ${sessionId} stopped:`, {
        duration: Date.now() - session.startTime,
        transfersDetected: session.transfersDetected,
        transfersProcessed: session.transfersProcessed,
        totalValueRecovered: session.totalValueRecovered.toString()
      });
      
      return session;
    }
    return null;
  }

  // === QUICK ACTIONS ===

  /**
   * Quick recover a specific token
   */
  async quickRecover(tokenAddress: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) {
      throw new Error('Signer required for recovery');
    }

    console.log(`🚀 Quick recovering token ${tokenAddress}...`);

    // Check if monitoring is enabled
    const isMonitored = await this.contract.monitoredTokens(tokenAddress);
    
    if (!isMonitored) {
      console.log('📊 Enabling monitoring...');
      await (await this.contract.enableTokenMonitoring(tokenAddress)).wait();
    }

    // Scan for transfers
    console.log('🔍 Scanning for transfers...');
    const detected = await this.contract.callStatic.scanToken(tokenAddress);
    
    if (detected) {
      await (await this.contract.scanToken(tokenAddress)).wait();
    }

    // Emergency recover any unaccounted balance
    const unaccounted = await this.contract.getUnaccountedBalance(tokenAddress);
    
    if (unaccounted.gt(0)) {
      console.log(`💰 Recovering ${ethers.utils.formatEther(unaccounted)} tokens...`);
      return await this.contract.emergencyRecover(tokenAddress, 0, 0, []);
    } else {
      throw new Error('No tokens to recover');
    }
  }

  /**
   * Setup optimal monitoring for a jar
   */
  async setupOptimalMonitoring(commonTokens: string[]): Promise<{
    tokensEnabled: string[];
    autoProcessingConfigured: string[];
    errors: string[];
  }> {
    const results = {
      tokensEnabled: [] as string[],
      autoProcessingConfigured: [] as string[],
      errors: [] as string[]
    };

    if (!this.signer) {
      throw new Error('Signer required for setup');
    }

    // Enable monitoring for common tokens
    for (const token of commonTokens) {
      try {
        const isMonitored = await this.contract.monitoredTokens(token);
        if (!isMonitored) {
          await (await this.contract.enableTokenMonitoring(token)).wait();
          results.tokensEnabled.push(token);
        }
      } catch (error) {
        results.errors.push(`Failed to enable monitoring for ${token}: ${error}`);
      }
    }

    // Configure auto-processing for stablecoins (typically higher volume)
    const stablecoins = commonTokens.filter(token => 
      this.isStablecoin(token) // You'd implement this based on known addresses
    );

    for (const token of stablecoins) {
      try {
        await (await this.contract.configureAutoProcessing(
          token,
          true,                           // enabled
          ethers.utils.parseEther("100"), // min amount
          500,                            // 5% max slippage
          []                              // default path
        )).wait();
        
        results.autoProcessingConfigured.push(token);
      } catch (error) {
        results.errors.push(`Failed to configure auto-processing for ${token}: ${error}`);
      }
    }

    return results;
  }

  // === UTILITY METHODS ===

  /**
   * Get token symbol
   */
  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new Contract(tokenAddress, ['function symbol() view returns (string)'], this.provider);
      return await tokenContract.symbol();
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Check if token is a known stablecoin
   */
  private isStablecoin(tokenAddress: string): boolean {
    const stablecoins = new Set([
      '0xA0b86a33E6441E8C8C7014b37C5C3Ff8bB7b1A25', // USDC
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI  
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      // Add more stablecoin addresses per chain
    ]);
    
    return stablecoins.has(tokenAddress.toLowerCase());
  }

  /**
   * Get monitoring session status
   */
  getSessionStatus(sessionId: string): MonitoringSession | null {
    return this.monitoringSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): MonitoringSession[] {
    return Array.from(this.monitoringSessions.values()).filter(s => s.isActive);
  }
}