// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * @title CookieJar
 * @notice A decentralized smart contract for controlled fund withdrawals. Supports both whitelist and NFT‐gated access modes.
 * @dev Deposits accept ETH and ERC20 tokens (deducting a 1% fee) and withdrawals are subject to configurable rules.
 */
contract CookieJar {
    using SafeERC20 for IERC20;

    // --- Enums ---
    /// @notice The mode for access control.
    enum AccessType { Whitelist, NFTGated }
    /// @notice Specifies the withdrawal type.
    enum WithdrawalTypeOptions { Fixed, Variable }
    /// @notice Supported NFT types for gating.
    enum NFTType { ERC721, ERC1155, Soulbound }

    // --- Constants ---
    uint256 private constant MAX_NFT_GATES = 5;

    // --- Structs ---
    /// @notice Represents an NFT gate with a contract address and its NFT type.
    struct NFTGate {
        address nftAddress; // Address of the NFT contract.
        NFTType nftType;    // NFT type: ERC721, ERC1155, or Soulbound.
    }

    // --- Storage for NFT gates ---
    /// @notice Array of approved NFT gates (used in NFTGated mode).
    NFTGate[] public nftGates;
    /// @notice Mapping for optimized NFT gate lookup.
    mapping(address => NFTGate) private nftGateMapping;

    // --- Core Configuration Variables ---
    /// @notice The admin of the contract.
    address public admin;
    /// @notice Access control mode: Whitelist or NFTGated.
    AccessType public accessType;
    /// @notice Withdrawal option: Fixed or Variable.
    WithdrawalTypeOptions public withdrawalOption;
    /// @notice Fixed withdrawal amount (used if withdrawalOption is Fixed).
    uint256 public fixedAmount;
    /// @notice Maximum withdrawal amount (used if withdrawalOption is Variable).
    uint256 public maxWithdrawal;
    /// @notice Time (in seconds) required between withdrawals.
    uint256 public withdrawalInterval;
    /// @notice If true, each withdrawal must have a purpose string of at least 20 characters.
    bool public strictPurpose;
    /// @notice Fee collector address; note that admin is not the fee collector.
    address public feeCollector;
    /// @notice If true, emergency withdrawal is enabled.
    bool public emergencyWithdrawalEnabled;

    // --- Access Control Mappings ---
    /// @notice Mapping of addresses allowed to withdraw in Whitelist mode.
    mapping(address => bool) public whitelist;
    /// @notice Mapping of addresses that are blacklisted.
    mapping(address => bool) public blacklist;

    // --- Timelock Mappings ---
    /// @notice Stores the last withdrawal timestamp for each whitelisted address.
    mapping(address => uint256) public lastWithdrawalWhitelist;
    /// @notice Stores the last withdrawal timestamp for NFT-gated withdrawals using a composite key (nftAddress, tokenId).
    mapping(bytes32 => uint256) public lastWithdrawalNFT;

    // --- Events ---
    /// @notice Emitted when a deposit is made.
    event Deposit(address indexed sender, uint256 amount, address token);
    /// @notice Emitted when a withdrawal occurs.
    event Withdrawal(address indexed recipient, uint256 amount, string purpose, address token);
    /// @notice Emitted when a whitelist entry is updated.
    event WhitelistUpdated(address indexed user, bool status);
    /// @notice Emitted when a blacklist entry is updated.
    event BlacklistUpdated(address indexed user, bool status);
    /// @notice Emitted when the fee collector address is updated.
    event FeeCollectorUpdated(address indexed oldFeeCollector, address indexed newFeeCollector);
    /// @notice Emitted when an NFT gate is added.
    event NFTGateAdded(address nftAddress, uint8 nftType);
    /// @notice Emitted when an emergency withdrawal is executed.
    event EmergencyWithdrawal(address indexed admin, address token, uint256 amount);
    /// @notice Emitted when admin rights are transferred.
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);

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
    error EmergencyWithdrawalDisabled();
    error InvalidTokenAddress();

    // --- Constructor ---

    /**
     * @notice Initializes a new CookieJar contract.
     * @param _admin The admin address.
     * @param _accessType Access mode: Whitelist or NFTGated.
     * @param _nftAddresses Array of NFT contract addresses (only used if _accessType is NFTGated).
     * @param _nftTypes Array of NFT types corresponding to _nftAddresses.
     * @param _withdrawalOption Withdrawal type: Fixed or Variable.
     * @param _fixedAmount Fixed withdrawal amount (if _withdrawalOption is Fixed).
     * @param _maxWithdrawal Maximum allowed withdrawal (if _withdrawalOption is Variable).
     * @param _withdrawalInterval Time interval between withdrawals.
     * @param _strictPurpose If true, the withdrawal purpose must be at least 20 characters.
     * @param _defaultFeeCollector The fee collector address.
     * @param _emergencyWithdrawalEnabled If true, emergency withdrawal is enabled.
     */
    constructor(
        address _admin,
        AccessType _accessType,
        address[] memory _nftAddresses,
        uint8[] memory _nftTypes,
        WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        bool _strictPurpose,
        address _defaultFeeCollector,
        bool _emergencyWithdrawalEnabled
    ) {
        if (_admin == address(0)) revert AdminCannotBeZeroAddress();
        admin = _admin;
        accessType = _accessType;
        if (accessType == AccessType.NFTGated) {
            if (_nftAddresses.length == 0) revert NoNFTAddressesProvided();
            if (_nftAddresses.length != _nftTypes.length) revert NFTArrayLengthMismatch();
            if (_nftAddresses.length > MAX_NFT_GATES) revert MaxNFTGatesReached();
            // Add NFT gates using mapping for duplicate checks.
            for (uint256 i = 0; i < _nftAddresses.length; i++) {
                if (_nftTypes[i] > 2) revert InvalidNFTType();
                if (_nftAddresses[i] == address(0)) revert InvalidNFTGate();
                if (nftGateMapping[_nftAddresses[i]].nftAddress != address(0)) revert DuplicateNFTGate();
                NFTGate memory gate = NFTGate({
                    nftAddress: _nftAddresses[i],
                    nftType: NFTType(_nftTypes[i])
                });
                nftGates.push(gate);
                nftGateMapping[_nftAddresses[i]] = gate;
            }
        }
        withdrawalOption = _withdrawalOption;
        fixedAmount = _fixedAmount;
        maxWithdrawal = _maxWithdrawal;
        withdrawalInterval = _withdrawalInterval;
        strictPurpose = _strictPurpose;
        feeCollector = _defaultFeeCollector;
        emergencyWithdrawalEnabled = _emergencyWithdrawalEnabled;
    }

    // --- Modifiers ---

    /**
     * @notice Restricts access to functions to the admin.
     */
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the whitelist status of a user.
     * @param _user The address of the user.
     * @param _status The new whitelist status.
     */
    function updateWhitelist(address _user, bool _status) external onlyAdmin {
        if (accessType != AccessType.Whitelist) revert InvalidAccessType();
        whitelist[_user] = _status;
        emit WhitelistUpdated(_user, _status);
    }

    /**
     * @notice Updates the blacklist status of a user.
     * @param _user The address of the user.
     * @param _status The new blacklist status.
     */
    function updateBlacklist(address _user, bool _status) external onlyAdmin {
        blacklist[_user] = _status;
        emit BlacklistUpdated(_user, _status);
    }

    /**
     * @notice Updates the fee collector address.
     * @param _newFeeCollector The new fee collector address.
     */
    function updateFeeCollector(address _newFeeCollector) external {
        if (msg.sender != feeCollector) revert NotFeeCollector();
        address old = feeCollector;
        feeCollector = _newFeeCollector;
        emit FeeCollectorUpdated(old, _newFeeCollector);
    }

    /**
     * @notice Adds a new NFT gate if it is not already registered.
     * @param _nftAddress The NFT contract address.
     * @param _nftType The NFT type.
     */
    function addNFTGate(address _nftAddress, uint8 _nftType) external onlyAdmin {
        if (accessType != AccessType.NFTGated) revert InvalidAccessType();
        if (nftGates.length >= MAX_NFT_GATES) revert MaxNFTGatesReached();
        if (_nftAddress == address(0)) revert InvalidNFTGate();
        if (_nftType > 2) revert InvalidNFTType();
        if (nftGateMapping[_nftAddress].nftAddress != address(0)) revert DuplicateNFTGate();
        NFTGate memory gate = NFTGate({
            nftAddress: _nftAddress,
            nftType: NFTType(_nftType)
        });
        nftGates.push(gate);
        nftGateMapping[_nftAddress] = gate;
        emit NFTGateAdded(_nftAddress, _nftType);
    }

    /**
     * @notice Transfers admin rights to a new address.
     * @param newAdmin The new admin address.
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert AdminCannotBeZeroAddress();
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminUpdated(oldAdmin, newAdmin);
    }

    // --- Deposit Functions ---

    /**
     * @notice Deposits ETH into the contract; 1% fee is forwarded to the fee collector.
     */
    function deposit() external payable {
        if (msg.value == 0) return;
        uint256 fee = msg.value / 100;
        uint256 depositAmount = msg.value - fee;
        (bool sent, ) = feeCollector.call{value: fee}("");
        if (!sent) revert FeeTransferFailed();
        emit Deposit(msg.sender, depositAmount, address(0));
    }

    /**
     * @notice Deposits ERC20 tokens into the contract; 1% fee is forwarded to the fee collector.
     * @param token The ERC20 token address.
     * @param amount The amount of tokens to deposit.
     */
    function depositToken(address token, uint256 amount) external {
        if (amount == 0) return;
        if (token == address(0)) revert InvalidTokenAddress();
        uint256 fee = amount / 100;
        uint256 depositAmount = amount - fee;
        IERC20(token).safeTransferFrom(msg.sender, feeCollector, fee);
        IERC20(token).safeTransferFrom(msg.sender, address(this), depositAmount);
        emit Deposit(msg.sender, depositAmount, token);
    }

    // --- Internal Access Check Functions ---

    /**
     * @notice Checks whether an address is allowed to withdraw in Whitelist mode.
     * @param user The address to check.
     */
    function _checkAccessWhitelist(address user) internal view {
        if (blacklist[user]) revert Blacklisted();
        if (!whitelist[user]) revert NotAuthorized();
    }

    /**
     * @notice Checks if the caller has NFT-gated access via the specified gate.
     * @param gateAddress The NFT contract address used for gating.
     * @param tokenId The NFT token id.
     * @return gate The NFTGate struct corresponding to the provided gate.
     */
    function _checkAccessNFT(address gateAddress, uint256 tokenId) internal view returns (NFTGate memory gate) {
        if (blacklist[msg.sender]) revert Blacklisted();
        gate = nftGateMapping[gateAddress];
        if (gate.nftAddress == address(0)) revert InvalidNFTGate();
        if (gate.nftType == NFTType.ERC721 || gate.nftType == NFTType.Soulbound) {
            if (IERC721(gate.nftAddress).ownerOf(tokenId) != msg.sender) revert NotAuthorized();
        } else if (gate.nftType == NFTType.ERC1155) {
            if (IERC1155(gate.nftAddress).balanceOf(msg.sender, tokenId) == 0) revert NotAuthorized();
        }
    }

    // --- Withdrawal Functions ---

    /**
     * @notice Withdraws funds (ETH or ERC20) for whitelisted users.
     * @param token If zero address then ETH is withdrawn; otherwise, ERC20 token address.
     * @param amount The amount to withdraw.
     * @param purpose A description for the withdrawal.
     */
    function withdrawWhitelistMode(
        address token,
        uint256 amount,
        string calldata purpose
    ) external {
        if (amount == 0) revert ZeroWithdrawal();
        if (accessType != AccessType.Whitelist) revert InvalidAccessType();
        _checkAccessWhitelist(msg.sender);
        if (strictPurpose && bytes(purpose).length < 20) revert InvalidPurpose();

        uint256 nextAllowed = lastWithdrawalWhitelist[msg.sender] + withdrawalInterval;
        if (block.timestamp < nextAllowed) revert WithdrawalTooSoon(nextAllowed);
        lastWithdrawalWhitelist[msg.sender] = block.timestamp;

        if (withdrawalOption == WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) revert WithdrawalAmountNotAllowed(amount, fixedAmount);
        } else {
            if (amount > maxWithdrawal) revert WithdrawalAmountNotAllowed(amount, maxWithdrawal);
        }

        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert InsufficientBalance();
            emit Withdrawal(msg.sender, amount, purpose, address(0));
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance < amount) revert InsufficientBalance();
            IERC20(token).safeTransfer(msg.sender, amount);
            emit Withdrawal(msg.sender, amount, purpose, token);
        }
    }

    /**
     * @notice Withdraws funds (ETH or ERC20) for NFT-gated users.
     * @param token If zero address then ETH is withdrawn; otherwise, ERC20 token address.
     * @param amount The amount to withdraw.
     * @param purpose A description for the withdrawal.
     * @param gateAddress The NFT contract address used for gating.
     * @param tokenId The NFT token id used for gating.
     */
    function withdrawNFTMode(
        address token,
        uint256 amount,
        string calldata purpose,
        address gateAddress,
        uint256 tokenId
    ) external {
        if (amount == 0) revert ZeroWithdrawal();
        if (accessType != AccessType.NFTGated) revert InvalidAccessType();
        if (gateAddress == address(0)) revert InvalidNFTGate();
        _checkAccessNFT(gateAddress, tokenId);
        if (strictPurpose && bytes(purpose).length < 20) revert InvalidPurpose();

        bytes32 key = keccak256(abi.encodePacked(gateAddress, tokenId));
        uint256 nextAllowed = lastWithdrawalNFT[key] + withdrawalInterval;
        if (block.timestamp < nextAllowed) revert WithdrawalTooSoon(nextAllowed);
        lastWithdrawalNFT[key] = block.timestamp;

        if (withdrawalOption == WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) revert WithdrawalAmountNotAllowed(amount, fixedAmount);
        } else {
            if (amount > maxWithdrawal) revert WithdrawalAmountNotAllowed(amount, maxWithdrawal);
        }

        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert InsufficientBalance();
            emit Withdrawal(msg.sender, amount, purpose, address(0));
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance < amount) revert InsufficientBalance();
            IERC20(token).safeTransfer(msg.sender, amount);
            emit Withdrawal(msg.sender, amount, purpose, token);
        }
    }

    /**
     * @notice Allows the admin to perform an emergency withdrawal of funds (ETH or ERC20).
     * @param token If zero address then ETH is withdrawn; otherwise, ERC20 token address.
     * @param amount The amount to withdraw.
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyAdmin {
        if (!emergencyWithdrawalEnabled) revert EmergencyWithdrawalDisabled();
        if (amount == 0) revert ZeroWithdrawal();
        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
            (bool sent, ) = admin.call{value: amount}("");
            if (!sent) revert FeeTransferFailed();
            emit EmergencyWithdrawal(admin, token, amount);
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance < amount) revert InsufficientBalance();
            IERC20(token).safeTransfer(admin, amount);
            emit EmergencyWithdrawal(admin, token, amount);
        }
    }
}
