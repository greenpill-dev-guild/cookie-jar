// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library CookieJarLib {
    // --- Constants ---
    /// @dev Address used to represent ETH in the system
    address public constant ETH_ADDRESS = address(3);
    /// @dev Base for percentage calculations (10000 = 100%)
    uint256 public constant PERCENTAGE_BASE = 10000;
    /// @dev Maximum number of NFT gates allowed per jar (gas optimization)
    uint256 public constant MAX_NFT_GATES = 24;
    /// @dev Maximum withdrawal history entries to prevent unbounded array growth
    uint256 public constant MAX_WITHDRAWAL_HISTORY = 1000;
    /// @dev Period for withdrawal limits (1 week)
    uint256 public constant WITHDRAWAL_PERIOD = 7 days;
    /// @dev Maximum gas allowed for NFT validation calls (increased for safety)
    uint256 public constant MAX_NFT_VALIDATION_GAS = 150000;
    /// @dev Maximum blocks a balance proof can be old (increased for better UX)
    uint256 public constant MAX_BALANCE_PROOF_AGE = 10;
    /// @dev Maximum batch size for operations to prevent gas issues
    uint256 public constant MAX_BATCH_SIZE = 50;
    
    // --- NFT Gate Bit Flags ---
    /// @dev Bit flag: Gate is active and can be used
    uint8 public constant GATE_ACTIVE = 1 << 0;           // Bit 0
    /// @dev Bit flag: Gate has quantity requirements (ERC1155)
    uint8 public constant GATE_QUANTITY_BASED = 1 << 1;   // Bit 1
    /// @dev Bit flag: Gate has trait-based requirements (future)
    uint8 public constant GATE_TRAIT_BASED = 1 << 2;      // Bit 2
    /// @dev Bit flag: Gate has analytics tracking enabled
    // TEMPORARILY REMOVED: Analytics constants
    // uint8 public constant GATE_ANALYTICS_ENABLED = 1 << 3;
    
    // --- Enums ---
    /// @notice The mode for access control.
    enum AccessType {
        Allowlist,
        NFTGated,
        POAP,
        Unlock,
        Hypercert,
        Hats
    }
    /// @notice Specifies the withdrawal type.
    enum WithdrawalTypeOptions {
        Fixed,
        Variable
    }
    /// @notice Supported NFT types for gating.
    enum NFTType {
        None,
        ERC721,
        ERC1155
    }

    // --- Constants ---
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");
    bytes32 public constant JAR_ALLOWLISTED = keccak256("JAR_ALLOWLISTED");

    // --- Structs ---
    /// @notice Represents an NFT gate with a contract address and its NFT type.
    struct NFTGate {
        address nftAddress; // Address of the NFT contract.
        NFTType nftType; // NFT type: ERC721 or ERC1155
    }

    /// @notice POAP requirement for access control
    struct POAPRequirement {
        uint256 eventId; // POAP event ID required
        address poapContract; // POAP contract address (0 = use canonical address)
    }

    /// @notice Unlock Protocol requirement for access control
    struct UnlockRequirement {
        address lockAddress; // Unlock Protocol lock contract address
    }

    /// @notice Hypercert requirement for access control
    struct HypercertRequirement {
        address tokenContract; // Hypercert token contract address
        uint256 tokenId; // Specific hypercert token ID required
        uint256 minBalance; // Minimum balance required (default 1)
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

    // --- Enhanced NFT Structs ---
    
    // TEMPORARILY REMOVED: PackedNFTGate struct to reduce contract size
    // struct PackedNFTGate { ... }

    // TEMPORARILY REMOVED: Analytics structs to reduce contract size under 24KB limit
    // These will be re-enabled in a future version with external analytics library
    // struct NFTGateStats { ... }
    // struct WithdrawalAnalytics { ... }

    /// @notice Configuration struct for CookieJar constructor to avoid stack too deep
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
    }

    /// @notice NFT and allowlist configuration struct
    struct AccessConfig {
        address[] nftAddresses;
        NFTType[] nftTypes;
        address[] allowlist;
        // Protocol-specific requirements
        POAPRequirement poapReq;
        UnlockRequirement unlockReq;
        HypercertRequirement hypercertReq;
        HatsRequirement hatsReq;
    }

    /// @notice Optimized parameter grouping for factory functions to avoid stack too deep
    struct CreateJarParams {
        address cookieJarOwner;
        address supportedCurrency;
        AccessType accessType;
        WithdrawalTypeOptions withdrawalOption;
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        bool strictPurpose;
        bool emergencyWithdrawalEnabled;
        bool oneTimeWithdrawal;
        string metadata;
        uint256 customFeePercentage; // 0 means use default fee
        uint256 maxWithdrawalPerPeriod; // 0 means unlimited
    }

    // --- Events ---
    /// @notice Emitted when a deposit is made.
    event Deposit(address indexed sender, uint256 amount, address indexed token);
    /// @notice Emitted when a withdrawal occurs.
    event Withdrawal(address indexed recipient, uint256 indexed amount, string purpose);
    /// @notice Emitted when the fee collector address is updated.
    event FeeCollectorUpdated(address indexed oldFeeCollector, address indexed newFeeCollector);
    /// @notice Emitted when an NFT gate is added.
    event NFTGateAdded(address indexed nftAddress, NFTType nftType);
    /// @notice Emitted when an emergency withdrawal is executed.
    event EmergencyWithdrawal(address indexed admin, address indexed token, uint256 amount);
    /// @notice Emitted when an NFT gate is removed.
    event NFTGateRemoved(address indexed nftAddress);
    /// @notice Emitted when maximum withdrawal amount is updated.
    event MaxWithdrawalUpdated(uint256 indexed newMaxWithdrawal);
    /// @notice Emitted when fixed withdrawal amount is updated.
    event FixedWithdrawalAmountUpdated(uint256 indexed newFixedAmount);
    /// @notice Emitted when withdrawal interval is updated.
    event WithdrawalIntervalUpdated(uint256 indexed newWithdrawalInterval);
    /// @notice Emitted when a deposit fee is collected.
    event FeeCollected(address indexed collector, uint256 feeAmount, address indexed token);
    /// @notice Emitted when NFT access is successfully validated.
    event NFTAccessValidated(address indexed user, address indexed nftContract, uint256 indexed tokenId);
    /// @notice Emitted when jar is paused/unpaused.
    event PausedStateChanged(bool indexed isPaused);
    /// @notice Emitted when period withdrawal limit is updated.
    event PeriodWithdrawalLimitUpdated(uint256 indexed newLimit);
    
    // --- Enhanced NFT Events ---
    /// @notice Emitted when balance proof withdrawal is used.
    event NFTBalanceProofWithdrawal(address indexed user, address indexed nftContract, uint256 indexed tokenId, uint256 expectedBalance, uint256 actualBalance);
    /// @notice Emitted when high gas usage is detected in NFT validation.
    event HighGasUsageWarning(address indexed nftContract, uint256 gasUsed);
    /// @notice Emitted when NFT gates are added in batch.
    event NFTGatesBatchAdded(address[] nftAddresses, uint8[] nftTypes);
    /// @notice Emitted when NFT gates are removed in batch.
    event NFTGatesBatchRemoved(address[] nftAddresses);
    /// @notice Emitted when NFT withdrawal analytics are recorded.
    // TEMPORARILY REMOVED: Analytics events
    // event NFTWithdrawalAnalytics(...);

    // --- Custom Errors ---
    error AdminCannotBeZeroAddress();
    error FeeCollectorAddressCannotBeZeroAddress();
    error NoNFTAddressesProvided();
    error NFTArrayLengthMismatch();
    error AllowlistNotAllowedForNFTGated();
    error SupportedCurrencyCannotBeZeroAddress();
    error InvalidFixedAmountMustBeGreaterThanZero();
    error InvalidMaxWithdrawalMustBeGreaterThanZero();
    error InvalidWithdrawalIntervalMustBeGreaterThanZero();
    error InvalidMinDepositMustBeGreaterThanZero();
    error InvalidFeePercentage();
    error WithdrawalAmountMustBeGreaterThanZero();
    error FixedAmountExceedsBalance();
    error VariableAmountExceedsMaxWithdrawal();
    error VariableAmountExceedsBalance();
    error CanOnlyWithdrawOnce();
    error PurposeRequired();
    error PurposeTooShort();
    error UnauthorizedUser();
    error UserNotAllowlisted();
    error UserBlacklisted();
    error InvalidNFTGate();
    error NFTTokenDoesNotExist();
    error CallerMustOwnToken();
    error CallerMustHaveBalance();
    error EmergencyWithdrawalNotEnabled();
    error TransferFailed();
    error InvalidDepositAmount();
    error OnlyETHAccepted();
    error OnlyERC20Accepted();
    error ZeroAmountNotAllowed();
    error NotValidERC721();
    error NotValidERC1155();
    error NFTGateAlreadyExists();
    error NFTGateDoesNotExist();
    error TooManyNFTGates();
    error InvalidAccessType();
    error NotFeeCollector();
    error NFTGateNotFound();
    error InvalidWithdrawalType();
    error ZeroAmount();
    error EmergencyWithdrawalDisabled();
    error InsufficientBalance();
    error InvalidTokenAddress();
    error LessThanMinimumDeposit();
    error FeeTransferFailed();
    error InvalidNFTType();
    error DuplicateNFTGate();
    error NotAuthorized();
    error InvalidPurpose();
    error WithdrawalAlreadyDone();
    error WithdrawalTooSoon(uint256 nextAllowedTime);
    error WithdrawalAmountNotAllowed(uint256 provided, uint256 required);
    error WithdrawalHistoryLimitReached();
    error ContractPaused();
    error PeriodWithdrawalLimitExceeded(uint256 requested, uint256 available);
    
    // --- Enhanced NFT Errors ---
    /// @notice Thrown when balance proof is too old (more than 5 blocks)
    error StaleBalanceProof();
    /// @notice Thrown when NFT validation uses excessive gas
    error ExcessiveGasUsage();
    /// @notice Thrown when NFT validation fails due to network or contract issues
    error NFTValidationFailed();
    /// @notice Thrown when user doesn't have sufficient NFT balance for ERC1155
    error InsufficientNFTBalance();
    /// @notice Thrown when user has excessive NFT quantity (above max limit)
    error ExcessiveNFTQuantity();
    /// @notice Thrown when trying to perform quantity validation on ERC721
    error QuantityValidationNotSupported();
    /// @notice Thrown when array lengths don't match in batch operations
    error ArrayLengthMismatch();
}
