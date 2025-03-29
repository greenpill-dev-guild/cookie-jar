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
    uint256 private constant MAX_NFT_GATES = 5;

    // --- Structs ---
    /// @notice Represents an NFT gate with a contract address and its NFT type.
    struct NFTGate {
        address nftAddress; // Address of the NFT contract.
        NFTType nftType; // NFT type: ERC721, ERC1155, or Soulbound.
    }

    // --- Storage for NFT gates ---
    /// @notice Array of approved NFT gates (used in NFTGated mode).
    NFTGate[] public nftGates;
    /// @notice Mapping for optimized NFT gate lookup.
    mapping(address => NFTGate) private nftGateMapping;

    // --- Core Configuration Variables ---
    uint256 public feePercentageOnWithdrawal;
    uint256 public feeOnDeposit;
    address public currency;
    address public cookieJarFactory;
    uint256 public minETHDeposit;
    uint256 public minERC20Deposit;
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
    event WhitelistUpdated(address[] users, bool[] statuses);
    /// @notice Emitted when a blacklist entry is updated.
    event BlacklistUpdated(address[] users, bool[] statuses);
    /// @notice Emitted when the fee collector address is updated.
    event FeeCollectorUpdated(address indexed oldFeeCollector, address indexed newFeeCollector);
    /// @notice Emitted when an NFT gate is added.
    event NFTGateAdded(address nftAddress, uint8 nftType);
    /// @notice Emitted when an emergency withdrawal is executed.
    event EmergencyWithdrawal(address indexed admin, address token, uint256 amount);
    /// @notice Emitted when an NFT gate is removed.
    event NFTGateRemoved(address nftAddress);
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
    error NFTGateNotFound();
    error LessThanMinimumDeposit();
    error MismatchedArrayLengths();
    error CookieJar__CurrencyNotApproved();

    receive() external payable {
        if (msg.sender != cookieJarFactory) {
            _processETHDeposit(msg.sender, msg.value);
        }
    }

    /**
     * @notice Fallback function to handle unexpected function calls
     * @dev Ensures that any ETH sent without data is processed as a deposit
     */
    fallback() external payable {
        if (msg.sender != cookieJarFactory) {
            _processETHDeposit(msg.sender, msg.value);
        }
    }

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
        address _cookieJarFactory,
        address _admin,
        address _supportedCurrency,
        AccessType _accessType,
        address[] memory _nftAddresses,
        uint8[] memory _nftTypes,
        WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        uint256 _minETHDeposit,
        uint256 _minERC20Deposit,
        uint256 _feePercentageOnDeposit,
        bool _strictPurpose,
        address _defaultFeeCollector,
        bool _emergencyWithdrawalEnabled
    ) {
        if (_admin == address(0)) revert AdminCannotBeZeroAddress();
        admin = _admin;
        accessType = _accessType;
        if (accessType == AccessType.NFTGated) {
            if (_nftAddresses.length == 0) revert NoNFTAddressesProvided();
            if (_nftAddresses.length != _nftTypes.length) {
                revert NFTArrayLengthMismatch();
            }
            if (_nftAddresses.length > MAX_NFT_GATES) {
                revert MaxNFTGatesReached();
            }
            // Add NFT gates using mapping for duplicate checks.
            for (uint256 i = 0; i < _nftAddresses.length; i++) {
                if (_nftTypes[i] > 2) revert InvalidNFTType();
                if (_nftAddresses[i] == address(0)) revert InvalidNFTGate();
                if (nftGateMapping[_nftAddresses[i]].nftAddress != address(0)) {
                    revert DuplicateNFTGate();
                }
                NFTGate memory gate = NFTGate({nftAddress: _nftAddresses[i], nftType: NFTType(_nftTypes[i])});
                nftGates.push(gate);
                nftGateMapping[_nftAddresses[i]] = gate;
            }
        }
        withdrawalOption = _withdrawalOption;
        cookieJarFactory = _cookieJarFactory;
        feePercentageOnWithdrawal = _feePercentageOnDeposit;
        minETHDeposit = _minETHDeposit;
        minERC20Deposit = _minERC20Deposit;
        fixedAmount = _fixedAmount;
        maxWithdrawal = _maxWithdrawal;
        currency = _supportedCurrency;
        withdrawalInterval = _withdrawalInterval;
        strictPurpose = _strictPurpose;
        feeCollector = _defaultFeeCollector;
        emergencyWithdrawalEnabled = _emergencyWithdrawalEnabled;
    }

    function _processETHDeposit(address depositor, uint256 amount) internal {
        if (amount < 100) revert LessThanMinimumDeposit();

        uint256 fee = amount / 100; // 1% fee
        uint256 depositAmount = amount - fee;

        // Send fee to fee collector
        (bool feeSent,) = feeCollector.call{value: fee}("");
        if (!feeSent) revert FeeTransferFailed();

        // Emit deposit event
        emit Deposit(depositor, depositAmount, address(0));
    }

    // --- Modifiers ---

    /**
     * @notice Restricts access to functions to the admin.
     */
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlySupportedCurrency(address _token) {
        if (currency != _token) {
            revert InvalidTokenAddress();
        }
        _;
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the whitelist status of a user.
     * @param _users The address of the user.
     * @param _statuses The new whitelist status.
     */
    function updateWhitelist(address[] calldata _users, bool[] calldata _statuses) external onlyAdmin {
        if (accessType != AccessType.Whitelist) revert InvalidAccessType();
        if (_users.length != _statuses.length) revert MismatchedArrayLengths();

        for (uint256 i = 0; i < _users.length; i++) {
            whitelist[_users[i]] = _statuses[i];
        }

        // Emit the event after updating all addresses
        emit WhitelistUpdated(_users, _statuses);
    }

    /**
     * @notice Updates the blacklist status of a user.
     * @param _users The address of the user.
     * @param _statuses The new blacklist status.
     */
    function updateBlacklist(address[] calldata _users, bool[] calldata _statuses) external onlyAdmin {
        if (_users.length != _statuses.length) revert MismatchedArrayLengths();

        for (uint256 i = 0; i < _users.length; i++) {
            blacklist[_users[i]] = _statuses[i];
        }

        // Emit the event after updating all addresses
        emit BlacklistUpdated(_users, _statuses);
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
        if (nftGateMapping[_nftAddress].nftAddress != address(0)) {
            revert DuplicateNFTGate();
        }
        NFTGate memory gate = NFTGate({nftAddress: _nftAddress, nftType: NFTType(_nftType)});
        nftGates.push(gate);
        nftGateMapping[_nftAddress] = gate;
        emit NFTGateAdded(_nftAddress, _nftType);
    }

    /**
     * @notice Removes an NFT gate.
     * @param _nftAddress The NFT contract address.
     */
    function removeNFTGate(address _nftAddress) external onlyAdmin {
        // Check if the access type is NFT gated
        if (accessType != AccessType.NFTGated) revert InvalidAccessType();

        // Find the index of the NFT gate to remove
        uint256 gateIndex = type(uint256).max;
        for (uint256 i = 0; i < nftGates.length; i++) {
            if (nftGates[i].nftAddress == _nftAddress) {
                gateIndex = i;
                break;
            }
        }

        // Revert if the NFT gate was not found
        if (gateIndex == type(uint256).max) revert NFTGateNotFound();

        // Remove the NFT gate from the mapping
        delete nftGateMapping[_nftAddress];

        // If the gate to remove is not the last element,
        // replace it with the last element and then pop
        if (gateIndex < nftGates.length - 1) {
            nftGates[gateIndex] = nftGates[nftGates.length - 1];
        }
        nftGates.pop();

        // Emit an event for the removal
        emit NFTGateRemoved(_nftAddress);
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
     * @notice Deposits ETH into the contract, deducting depositFee.
     * @notice Only works if the currency is ETH, which is address(3).
     */
    function depositETH() external payable onlySupportedCurrency(address(3)) {
        _processETHDeposit(msg.sender, msg.value);
    }

    /**
     * @notice Deposits Currency tokens into the contract; 1% fee is forwarded to the fee collector.
     * @param amount The amount of tokens to deposit.
     */
    function depositERC20(uint256 amount) public {
        if (amount < 100) revert LessThanMinimumDeposit();
        uint256 fee = amount / 100;
        uint256 depositAmount = amount - fee;
        if (IERC20(currency).allowance(msg.sender, address(this)) < amount) {
            revert CookieJar__CurrencyNotApproved();
        }
        IERC20(currency).safeTransferFrom(msg.sender, feeCollector, fee);
        IERC20(currency).safeTransferFrom(msg.sender, address(this), depositAmount);
        emit Deposit(msg.sender, depositAmount, currency);
    }

    function onERC20Receive(uint256 amount) external {
        depositERC20(amount);
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
            if (IERC721(gate.nftAddress).ownerOf(tokenId) != msg.sender) {
                revert NotAuthorized();
            }
        } else if (gate.nftType == NFTType.ERC1155) {
            if (IERC1155(gate.nftAddress).balanceOf(msg.sender, tokenId) == 0) {
                revert NotAuthorized();
            }
        }
    }

    // --- Withdrawal Functions ---

    /**
     * @notice Withdraws funds (ETH or ERC20) for whitelisted users.
     * @param token If zero address then ETH is withdrawn; otherwise, ERC20 token address.
     * @param amount The amount to withdraw.
     * @param purpose A description for the withdrawal.
     */
    function withdrawWhitelistMode(address token, uint256 amount, string calldata purpose) external {
        if (amount == 0) revert ZeroWithdrawal();
        if (accessType != AccessType.Whitelist) revert InvalidAccessType();
        _checkAccessWhitelist(msg.sender);
        if (strictPurpose && bytes(purpose).length < 20) {
            revert InvalidPurpose();
        }

        uint256 nextAllowed = lastWithdrawalWhitelist[msg.sender] + withdrawalInterval;
        if (block.timestamp < nextAllowed) {
            revert WithdrawalTooSoon(nextAllowed);
        }
        lastWithdrawalWhitelist[msg.sender] = block.timestamp;

        if (withdrawalOption == WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert WithdrawalAmountNotAllowed(amount, fixedAmount);
            }
        } else {
            if (amount > maxWithdrawal) {
                revert WithdrawalAmountNotAllowed(amount, maxWithdrawal);
            }
        }

        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
            (bool sent,) = msg.sender.call{value: amount}("");
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
        if (strictPurpose && bytes(purpose).length < 20) {
            revert InvalidPurpose();
        }

        bytes32 key = keccak256(abi.encodePacked(gateAddress, tokenId));
        uint256 nextAllowed = lastWithdrawalNFT[key] + withdrawalInterval;
        if (block.timestamp < nextAllowed) {
            revert WithdrawalTooSoon(nextAllowed);
        }
        lastWithdrawalNFT[key] = block.timestamp;

        if (withdrawalOption == WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert WithdrawalAmountNotAllowed(amount, fixedAmount);
            }
        } else {
            if (amount > maxWithdrawal) {
                revert WithdrawalAmountNotAllowed(amount, maxWithdrawal);
            }
        }

        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
            (bool sent,) = msg.sender.call{value: amount}("");
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
            (bool sent,) = admin.call{value: amount}("");
            if (!sent) revert FeeTransferFailed();
            emit EmergencyWithdrawal(admin, token, amount);
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance < amount) revert InsufficientBalance();
            IERC20(token).safeTransfer(admin, amount);
            emit EmergencyWithdrawal(admin, token, amount);
        }
    }

    function getNFTGatesArray() external view returns (NFTGate[] memory) {
        return nftGates;
    }
}
