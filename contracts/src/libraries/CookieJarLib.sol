// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library CookieJarLib {
    // --- Constants ---
    /// @dev Address used to represent ETH in the system
    address public constant ETH_ADDRESS = address(3);
    /// @dev Base for percentage calculations (10000 = 100%)
    uint256 public constant PERCENTAGE_BASE = 10000;
    
    // --- Enums ---
    /// @notice The mode for access control.
    enum AccessType {
        Whitelist,
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
    bytes32 public constant JAR_WHITELISTED = keccak256("JAR_WHITELISTED");

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
    }

    /// @notice NFT and whitelist configuration struct
    struct AccessConfig {
        address[] nftAddresses;
        NFTType[] nftTypes;
        address[] whitelist;
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
    }

    // --- Events ---
    /// @notice Emitted when a deposit is made.
    event Deposit(address indexed sender, uint256 amount, address token);
    /// @notice Emitted when a withdrawal occurs.
    event Withdrawal(address indexed recipient, uint256 amount, string purpose);
    /// @notice Emitted when the fee collector address is updated.
    event FeeCollectorUpdated(address indexed oldFeeCollector, address indexed newFeeCollector);
    /// @notice Emitted when an NFT gate is added.
    event NFTGateAdded(address nftAddress, NFTType nftType);
    /// @notice Emitted when an emergency withdrawal is executed.
    event EmergencyWithdrawal(address indexed admin, address token, uint256 amount);
    /// @notice Emitted when an NFT gate is removed.
    event NFTGateRemoved(address nftAddress);
    /// @notice Emitted when maximum withdrawal amount is updated.
    event MaxWithdrawalUpdated(uint256 newMaxWithdrawal);
    /// @notice Emitted when fixed withdrawal amount is updated.
    event FixedWithdrawalAmountUpdated(uint256 newFixedAmount);
    /// @notice Emitted when withdrawal interval is updated.
    event WithdrawalIntervalUpdated(uint256 newWithdrawalInterval);
    /// @notice Emitted when a deposit fee is collected.
    event FeeCollected(address indexed collector, uint256 feeAmount, address token);
    /// @notice Emitted when NFT access is successfully validated.
    event NFTAccessValidated(address indexed user, address indexed nftContract, uint256 tokenId);

    // --- Custom Errors ---
    error AdminCannotBeZeroAddress();
    error FeeCollectorAddressCannotBeZeroAddress();
    error NoNFTAddressesProvided();
    error NFTArrayLengthMismatch();
    error WhitelistNotAllowedForNFTGated();
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
    error UserNotWhitelisted();
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
}
