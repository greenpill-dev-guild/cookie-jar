// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CookieJarLib
/// @notice Shared library for Cookie Jar constants, enums, and structs
library CookieJarLib {
    /// @notice Role identifiers for access control
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");
    bytes32 public constant JAR_ADMIN = keccak256("JAR_ADMIN");
    bytes32 public constant JAR_ALLOWLISTED = keccak256("JAR_ALLOWLISTED");
    bytes32 public constant JAR_DENYLISTED = keccak256("JAR_DENYLISTED");

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

    /// @notice Access types for jar
    enum AccessType {
        Allowlist,
        NFTGated,
        POAP,
        Unlock,
        Hypercert,
        Hats
    }

    /// @notice Withdrawal type options
    enum WithdrawalTypeOptions {
        Fixed,
        Variable
    }

    /// @notice NFT types for gating
    enum NFTType {
        None,
        ERC721,
        ERC1155
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
    event NFTGateAdded(address indexed nftAddress, NFTType nftType);

    // === STRUCT DEFINITIONS ===

    /// @notice NFT gate configuration
    struct NFTGate {
        address nftAddress;
        NFTType nftType;
        uint256 threshold;
    }

    /// @notice POAP requirement for access control
    struct POAPRequirement {
        uint256 eventId; // POAP event ID required
        address poapContract; // POAP contract address (for custom networks)
    }

    /// @notice Unlock Protocol requirement for access control
    struct UnlockRequirement {
        address lockAddress; // Lock contract address
        bool requireValidKey; // Whether valid key is required
    }

    /// @notice Hypercert requirement for access control
    struct HypercertRequirement {
        address hypercertContract; // Hypercert contract address
        uint256 requiredFractions; // Minimum fraction ownership required
        address[] allowedCreators; // Allowed hypercert creators
        uint256 tokenId; // Specific token ID required (if 0, any token from contract is valid)
        address tokenContract; // Alternative token contract address (for backward compatibility)
        uint256 minBalance; // Minimum balance required (for backward compatibility)
    }

    /// @notice Hats Protocol requirement for access control
    struct HatsRequirement {
        uint256 hatId; // Hat ID required for access
        address hatsContract; // Hats Protocol contract address (network specific)
    }

    struct WithdrawalData {
        uint256 amount; // Amount of tokens to be withdrawn.
        string purpose; // Reason for the withdrawal.
        address recipient; // Address of the user who withdrew
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

    /// @notice NFT and allowlist configuration struct
    struct AccessConfig {
        address[] nftAddresses;
        NFTType[] nftTypes;
        uint256[] nftThresholds;
        address[] allowlist;
        POAPRequirement poapReq;
        UnlockRequirement unlockReq;
        HypercertRequirement hypercertReq;
        HatsRequirement hatsReq;
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
    error UserDenylisted();
    error InvalidNFTGate();
    error AllowlistNotAllowedForNFTGated();
    error NoNFTAddressesProvided();
    error NFTArrayLengthMismatch();
    error WithdrawalHistoryLimitReached();
    error InvalidPurpose();
    error WithdrawalAlreadyDone();
    error WithdrawalTooSoon(uint256 nextAllowed);
    error NFTValidationFailed();
    error InvalidNFTType();
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