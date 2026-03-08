// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CookieJarLib
/// @notice Shared library for Cookie Jar constants, enums, and structs
library CookieJarLib {
    /// @notice Role identifiers for access control
    /// @dev Following Solidity best practices for role-based access control
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");
    bytes32 public constant JAR_ALLOWLISTED = keccak256("JAR_ALLOWLISTED");

    /// @notice Protocol Constants
    uint256 public constant PERCENTAGE_BASE = 10000; // 100% = 10000, 1% = 100
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 public constant WITHDRAWAL_PERIOD = 86400; // 24 hours

    /// @notice Access types for jar - simplified to 3 core types
    /// @dev Following ERC standards: Allowlist, ERC721, ERC1155
    enum AccessType {
        Allowlist, // Simple allowlist-based access
        ERC721, // ERC-721 NFT-based access (POAP, Unlock Protocol)
        ERC1155 // ERC-1155 NFT-based access (Hypercerts, Hats Protocol)
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
    event NFTAccessValidated(address indexed user, address indexed nftContract, uint256 tokenId);
    event PausedStateChanged(bool paused);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);

    /// @notice Generic parameter update event to consolidate specific update events
    /// @param paramName Hash of parameter name (e.g., keccak256("maxWithdrawal"))
    /// @param newValue New parameter value
    event ParameterUpdated(bytes32 indexed paramName, uint256 newValue);

    /// @notice Generic address parameter update event
    /// @param paramName Hash of parameter name
    /// @param newAddress New address value
    event AddressParameterUpdated(bytes32 indexed paramName, address indexed newAddress);
    event PendingTokensRecovered(address indexed token, uint256 amount);
    event EmergencyWithdrawal(address indexed user, address indexed token, uint256 amount);

    /// @notice Parameter name constants for events
    bytes32 public constant PARAM_MAX_WITHDRAWAL = keccak256("maxWithdrawal");
    bytes32 public constant PARAM_FIXED_AMOUNT = keccak256("fixedAmount");
    bytes32 public constant PARAM_WITHDRAWAL_INTERVAL = keccak256("withdrawalInterval");
    bytes32 public constant PARAM_PERIOD_LIMIT = keccak256("periodWithdrawalLimit");

    // === STRUCT DEFINITIONS ===

    /// @notice NFT requirement for access control - unified for ERC721 and ERC1155
    /// @dev Simplified from multiple protocol-specific structs to single NFT requirement
    struct NftRequirement {
        address nftContract; // NFT contract address
        uint256 tokenId; // Token ID (0 for any token from contract)
        uint256 minBalance; // Minimum balance required (for ERC1155)
        bool isPoapEventGate; // Explicit POAP event gate discriminator for ERC721
    }

    /// @notice SIMPLIFIED Multi-token configuration for cookie jar
    /// @dev Replaced complex v3/v4 config with simple Universal Router approach
    struct MultiTokenConfig {
        bool enabled; // Enable multi-token support
        uint256 maxSlippagePercent; // Max slippage (e.g., 500 = 5%)
        uint256 minSwapAmount; // Minimum amount to trigger auto-swap
        uint24 defaultFee; // Default pool fee (3000 = 0.3%)
    }

    /// @notice OPTIMIZED Configuration struct for CookieJar constructor
    /// @dev Optimized storage layout to reduce gas and contract size
    struct JarConfig {
        // Slot 1: addresses (40 bytes total)
        address jarOwner; // 20 bytes
        address supportedCurrency; // 20 bytes
        // Slot 2: fee collector + packed fields (32 bytes total)
        address feeCollector; // 20 bytes
        AccessType accessType; // 1 byte (uint8)
        WithdrawalTypeOptions withdrawalOption; // 1 byte (uint8)
        bool strictPurpose; // 1 byte
        bool emergencyWithdrawalEnabled; // 1 byte
        bool oneTimeWithdrawal; // 1 byte
        // 7 bytes padding

        // Remaining slots: uint256 fields
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        uint256 minDeposit;
        uint256 feePercentageOnDeposit;
        uint256 maxWithdrawalPerPeriod; // 0 means unlimited
        // Dynamic fields (separate slots)
        string metadata; // Jar metadata/description
        MultiTokenConfig multiTokenConfig; // Simplified multi-token support
    }

    /// @notice Simplified access configuration struct
    /// @dev Reduced from complex protocol-specific configs to unified approach
    struct AccessConfig {
        address[] allowlist; // For allowlist access
        NftRequirement nftRequirement; // For ERC721/ERC1155 access
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
