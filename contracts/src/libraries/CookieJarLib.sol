// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library CookieJarLib {
    // --- Enums ---
    /// @notice The mode for access control.
    enum AccessType {
        Whitelist,
        NFTGated
    }
    /// @notice Specifies the withdrawal type.
    enum WithdrawalTypeOptions {
        Fixed,
        Variable
    }
    /// @notice Supported NFT types for gating.
    enum NFTType {
        ERC721,
        ERC1155,
        Soulbound
    }

    // --- Constants ---
    uint256 internal constant MAX_NFT_GATES = 5;
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");
    bytes32 public constant JAR_BLACKLISTED = keccak256("JAR_BLACKLISTED");
    bytes32 public constant JAR_WHITELISTED = keccak256("JAR_WHITELISTED");

    // --- Structs ---
    /// @notice Represents an NFT gate with a contract address and its NFT type.
    struct NFTGate {
        address nftAddress; // Address of the NFT contract.
        NFTType nftType; // NFT type: ERC721, ERC1155, or Soulbound.
    }

    struct WithdrawalData {
        uint256 amount; // Amount of tokens to be withdrawn.
        string purpose; // Reason for the withdrawal.
    }

    // --- Events ---
    /// @notice Emitted when a deposit is made.
    event Deposit(address indexed sender, uint256 amount, address token);
    /// @notice Emitted when a withdrawal occurs.
    event Withdrawal(
        address indexed recipient,
        uint256 amount,
        string purpose,
        address token
    );
    /// @notice Emitted when a whitelist entry is updated.
    event WhitelistUpdated(address[] users, bool statuses);
    /// @notice Emitted when a blacklist entry is updated.
    event BlacklistUpdated(address[] users, bool statuses);
    /// @notice Emitted when the fee collector address is updated.
    event FeeCollectorUpdated(
        address indexed oldFeeCollector,
        address indexed newFeeCollector
    );
    /// @notice Emitted when an NFT gate is added.
    event NFTGateAdded(address nftAddress, uint8 nftType);
    /// @notice Emitted when an emergency withdrawal is executed.
    event EmergencyWithdrawal(
        address indexed admin,
        address token,
        uint256 amount
    );
    /// @notice Emitted when an NFT gate is removed.
    event NFTGateRemoved(address nftAddress);
    /// @notice Emitted when admin rights are transferred.
    event AdminUpdated(address indexed newAdmin);

    // --- Custom Errors ---
    error NotAdmin();
    error NotAuthorized();
    error InvalidAccessType();
    error InvalidPurpose();
    error WithdrawalTooSoon(uint256 nextAllowed);
    error WithdrawalAmountNotAllowed(uint256 requested, uint256 allowed);
    error InsufficientBalance();
    error ZeroWithdrawal();
    error NotFeeCollector();
    error FeeTransferFailed();
    error Blacklisted();
    error MaxNFTGatesReached();
    error InvalidNFTGate();
    error NoNFTAddressesProvided();
    error NFTArrayLengthMismatch();
    error DuplicateNFTGate();
    error InvalidNFTType();
    error AdminCannotBeZeroAddress();
    error FeeCollectorAddressCannotBeZeroAddress();
    error EmergencyWithdrawalDisabled();
    error InvalidTokenAddress();
    error NFTGateNotFound();
    error LessThanMinimumDeposit();
    error MismatchedArrayLengths();
    error CookieJar__CurrencyNotApproved();
    error CookieJar__WithdrawalAlreadyDone();
}
