// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CookieJarLib
/// @notice Shared library for Cookie Jar constants, enums, and structs
library CookieJarLib {
    /// @notice Role identifiers for access control
    /// @dev Following Solidity best practices for role-based access control
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");
    bytes32 public constant JAR_ALLOWLISTED = keccak256("JAR_ALLOWLISTED");

    /// @notice Maximum withdrawal history to prevent unbounded array growth
    uint256 public constant MAX_WITHDRAWAL_HISTORY = 1000;

    /// @notice Protocol Constants
    uint256 public constant PERCENTAGE_BASE = 10000; // 100% = 10000, 1% = 100
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10% maximum fee
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    /// @notice Protocol Constants
    uint256 public constant WITHDRAWAL_PERIOD = 86400; // 24 hours
    
    /// @notice Gas limits for external calls
    uint256 public constant MAX_NFT_VALIDATION_GAS = 50000; // Gas limit for NFT validation
    uint256 public constant MAX_BALANCE_PROOF_AGE = 100; // Max age for balance proof in blocks
    uint256 public constant MAX_NFT_GATES = 10; // Maximum number of NFT gates allowed

    /// @notice Access types for jar - simplified to 3 core types
    /// @dev Following ERC standards: Allowlist, ERC721, ERC1155
    enum AccessType {
        Allowlist,  // Simple allowlist-based access
        ERC721,     // ERC-721 NFT-based access (POAP, Unlock Protocol)
        ERC1155     // ERC-1155 NFT-based access (Hypercerts, Hats Protocol)
    }

    /// @notice Withdrawal type options
    enum WithdrawalTypeOptions {
        Fixed,
        Variable
    }


    /// @notice Events
    event Deposit(address indexed depositor, uint256 amount, address indexed token);
    event Withdrawal(address indexed withdrawer, uint256 amount, string purpose);
    event TokenSwapped(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event FeeCollected(address indexed feeCollector, uint256 amount, address indexed token);
    event JarCreated(address indexed jarAddress, address indexed jarOwner, AccessType accessType);
    event AccessTypeUpdated(AccessType oldType, AccessType newType);
    event PeriodWithdrawalLimitUpdated(uint256 newLimit);
    event NFTAccessValidated(address indexed user, address indexed nftContract, uint256 tokenId);
    
    // Superfluid events
    event SuperfluidConfigUpdated(bool enabled);
    event SuperStreamCreated(address indexed sender, address indexed superToken, int96 flowRate);
    event SuperStreamUpdated(address indexed sender, address indexed superToken, int96 newFlowRate);
    event SuperStreamDeleted(address indexed sender, address indexed superToken);
    event HighGasUsageWarning(address indexed nftContract, uint256 gasUsed);
    event PausedStateChanged(bool paused);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event NFTGateRemoved(address indexed nftAddress);
    event MaxWithdrawalUpdated(uint256 newMaxWithdrawal);
    event FixedWithdrawalAmountUpdated(uint256 newFixedAmount);
    event WithdrawalIntervalUpdated(uint256 newInterval);
    event PendingTokensRecovered(address indexed token, uint256 amount);
    event StreamRegistered(address indexed sender, address indexed token, uint256 ratePerSecond, uint256 streamIndex);
    event StreamApproved(uint256 indexed streamIndex);
    event EmergencyWithdrawal(address indexed user, address indexed token, uint256 amount);
    event StreamProcessed(uint256 indexed streamIndex, uint256 processableAmount, uint256 feeAmount);

    // === STRUCT DEFINITIONS ===

    /// @notice NFT requirement for access control - unified for ERC721 and ERC1155
    /// @dev Simplified from multiple protocol-specific structs to single NFT requirement
    struct NFTRequirement {
        address nftContract;    // NFT contract address
        uint256 tokenId;        // Token ID (0 for any token from contract)
        uint256 minBalance;     // Minimum balance required (for ERC1155)
    }

    /// @notice SIMPLIFIED Multi-token configuration for cookie jar
    /// @dev Replaced complex v3/v4 config with simple Universal Router approach
    struct MultiTokenConfig {
        bool enabled;                   // Enable multi-token support
        uint256 maxSlippagePercent;     // Max slippage (e.g., 500 = 5%)
        uint256 minSwapAmount;          // Minimum amount to trigger auto-swap
        uint24 defaultFee;              // Default pool fee (3000 = 0.3%)
    }
    
    /// @notice Simplified streaming configuration using Superfluid Protocol
    /// @dev Renamed from SuperfluidConfig and simplified - only real-time streaming supported
    struct StreamingConfig {
        bool enabled;                    // Enable real-time streaming via Superfluid
        bool autoAcceptStreams;          // Auto-accept incoming super streams
        address[] acceptedSuperTokens;   // Allowlisted Super Tokens
        int96 minFlowRate;              // Minimum flow rate (wei/second)
    }

    /// @notice Real-time Super Token stream via Superfluid Protocol
    struct SuperfluidStream {
        address superToken;              // Super Token contract address
        address sender;                  // Stream sender
        int96 flowRate;                 // Real-time flow rate (wei/second)
        uint256 startTime;              // Stream start timestamp
        bool isActive;                  // Stream status
    }

    /// @notice SIMPLIFIED Configuration struct for CookieJar constructor
    /// @dev Removed complex multi-token config, now uses simple Universal Router
    struct JarConfig {
        address jarOwner;
        address supportedCurrency;
        AccessType accessType;
        WithdrawalTypeOptions withdrawalOption;
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        uint256 minDeposit;
        uint256 feePercentageOnDeposit;
        bool strictPurpose;
        address feeCollector;
        bool emergencyWithdrawalEnabled;
        bool oneTimeWithdrawal;
        uint256 maxWithdrawalPerPeriod; // 0 means unlimited
        string metadata; // Jar metadata/description
        MultiTokenConfig multiTokenConfig; // Simplified multi-token support
        StreamingConfig streamingConfig; // Real-time streaming via Superfluid Protocol
    }

    /// @notice Simplified access configuration struct
    /// @dev Reduced from complex protocol-specific configs to unified approach
    struct AccessConfig {
        address[] allowlist;           // For allowlist access
        NFTRequirement nftRequirement; // For ERC721/ERC1155 access
    }

    // === ERROR DEFINITIONS ===
    
    error ZeroAmount();
    error ZeroAddress();
    error InvalidTokenAddress();
    error InsufficientBalance();
    error WithdrawalNotAllowed();
    error InvalidWithdrawalAmount();
    error LessThanMinimumDeposit();
    error TransferFailed();
    error FeeTransferFailed();
    error UnauthorizedAccess();
    error InvalidAccessType();
    error NFTNotOwned();
    error StreamNotFound();
    error StreamNotActive();
    error StreamAlreadyExists();
    error InvalidStreamRate();
    error UnauthorizedStreamAccess();
    error NotAuthorized();
    error AdminCannotBeZeroAddress();
    error FeeCollectorAddressCannotBeZeroAddress();
    error WithdrawalAmountNotAllowed(uint256 requested, uint256 allowed);
    error PeriodWithdrawalLimitExceeded(uint256 requested, uint256 available);
    error OneTimeWithdrawalAlreadyUsed();
    error WithdrawalIntervalNotPassed();
    error InvalidNFTGate();
    error NoNFTAddressesProvided();
    error NFTArrayLengthMismatch();
    error WithdrawalHistoryLimitReached();
    error InvalidPurpose();
    error WithdrawalAlreadyDone();
    error WithdrawalTooSoon(uint256 nextAllowed);
    error NFTValidationFailed();
    error StaleBalanceProof();
    error InsufficientNFTBalance();
    error NotFeeCollector();
    error TooManyNFTGates();
    error NFTGateNotFound();
    error InvalidWithdrawalType();
    error EmergencyWithdrawalDisabled();
    error NothingToClaim();
    error DuplicateNFTGate();
}