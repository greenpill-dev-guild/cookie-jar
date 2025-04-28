// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import {CookieJarLib} from "./libraries/CookieJarLib.sol";

/**
 * @title CookieJar
 * @notice A decentralized smart contract for controlled fund withdrawals. Supports both whitelist and NFT‐gated access modes.
 * @dev Deposits accept ETH and ERC20 tokens (deducting a 1% fee) and withdrawals are subject to configurable rules.
 */
contract CookieJar is AccessControl {
    using SafeERC20 for IERC20;

    // --- Storage for NFT gates ---
    /// @notice Array of approved NFT gates (used in NFTGated mode).
    CookieJarLib.NFTGate[] public nftGates;

    CookieJarLib.WithdrawalData[] public withdrawalData;

    /// @notice Mapping for optimized NFT gate lookup.
    mapping(address => CookieJarLib.NFTGate) private nftGateMapping;

    // --- Core Configuration Variables ---
    uint256 public currencyHeldByJar;
    address public currency;
    uint256 public minDeposit;
    uint256 public feePercentageOnDeposit;
    address public jarOwner;
    /// @notice The admin of the contract.
    /// @notice Access control mode: Whitelist or NFTGated.
    CookieJarLib.AccessType public accessType;
    /// @notice Withdrawal option: Fixed or Variable.
    CookieJarLib.WithdrawalTypeOptions public withdrawalOption;

    /// @notice If true, each recipient can only claim from the jar once.
    bool public oneTimeWithdrawal;
    /// @notice Array of approved NFT gates (used in NFTGated mode).
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

    // --- Timelock Mappings ---
    /// @notice Stores the last withdrawal timestamp for each whitelisted address.
    mapping(address => uint256) public lastWithdrawalWhitelist;
    /// @notice Stores the last withdrawal timestamp for NFT-gated withdrawals using a composite key (nftAddress, tokenId).
    mapping(bytes32 => uint256) public lastWithdrawalNFT;

    /// @notice Only in the case of one time withdrawals.
    mapping(address => bool) public isWithdrawnByUser;

    // --- Constructor ---

    /**
     * @notice Initializes a new CookieJar contract.
     * @param _jarOwner The admin address.
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
        address _jarOwner,
        address _supportedCurrency,
        CookieJarLib.AccessType _accessType,
        address[] memory _nftAddresses,
        uint8[] memory _nftTypes,
        CookieJarLib.WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        uint256 _minDeposit,
        uint256 _feePercentageOnDeposit,
        bool _strictPurpose,
        address _defaultFeeCollector,
        bool _emergencyWithdrawalEnabled,
        bool _oneTimeWithdrawal
    ) {
        if (_jarOwner == address(0))
            revert CookieJarLib.AdminCannotBeZeroAddress();
        if (_defaultFeeCollector == address(0))
            revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        accessType = _accessType;
        if (accessType == CookieJarLib.AccessType.NFTGated) {
            if (_nftAddresses.length == 0)
                revert CookieJarLib.NoNFTAddressesProvided();
            if (_nftAddresses.length != _nftTypes.length) {
                revert CookieJarLib.NFTArrayLengthMismatch();
            }
            if (_nftAddresses.length > CookieJarLib.MAX_NFT_GATES) {
                revert CookieJarLib.MaxNFTGatesReached();
            }
            // Add NFT gates using mapping for duplicate checks.
            for (uint256 i = 0; i < _nftAddresses.length; i++) {
                if (_nftTypes[i] > 2) revert CookieJarLib.InvalidNFTType();
                if (_nftAddresses[i] == address(0))
                    revert CookieJarLib.InvalidNFTGate();
                if (nftGateMapping[_nftAddresses[i]].nftAddress != address(0)) {
                    revert CookieJarLib.DuplicateNFTGate();
                }
                CookieJarLib.NFTGate memory gate = CookieJarLib.NFTGate({
                    nftAddress: _nftAddresses[i],
                    nftType: CookieJarLib.NFTType(_nftTypes[i])
                });
                nftGates.push(gate);
                nftGateMapping[_nftAddresses[i]] = gate;
            }
        }
        jarOwner = _jarOwner;
        withdrawalOption = _withdrawalOption;
        minDeposit = _minDeposit;
        fixedAmount = _fixedAmount;
        maxWithdrawal = _maxWithdrawal;
        currency = _supportedCurrency;
        withdrawalInterval = _withdrawalInterval;
        strictPurpose = _strictPurpose;
        feeCollector = _defaultFeeCollector;
        feePercentageOnDeposit = _feePercentageOnDeposit;
        emergencyWithdrawalEnabled = _emergencyWithdrawalEnabled;
        oneTimeWithdrawal = _oneTimeWithdrawal;
        _setRoleAdmin(CookieJarLib.JAR_WHITELISTED, CookieJarLib.JAR_OWNER);
        _setRoleAdmin(CookieJarLib.JAR_BLACKLISTED, CookieJarLib.JAR_OWNER);
        _grantRole(CookieJarLib.JAR_OWNER, _jarOwner);
    }

    // --- Modifiers ---


    modifier onlySupportedCurrency(address _token) {
        if (currency != _token) {
            revert CookieJarLib.InvalidTokenAddress();
        }
        _;
    }

    modifier onlyNotJarBlacklisted() {
        if (hasRole(CookieJarLib.JAR_BLACKLISTED, msg.sender))
            revert CookieJarLib.Blacklisted();
        _;
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the jar whitelist status of a user.
     * @param _users The address of the user.
     */
    function grantJarWhitelistRole(
        address[] calldata _users
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.Whitelist)
            revert CookieJarLib.InvalidAccessType();
        _grantRoles(CookieJarLib.JAR_WHITELISTED, _users);
        // Emit the event after updating all addresses
        emit CookieJarLib.WhitelistUpdated(_users, true);
    }

    function revokeJarWhitelistRole(
        address[] calldata _users
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.Whitelist)
            revert CookieJarLib.InvalidAccessType();
        _revokeRoles(CookieJarLib.JAR_WHITELISTED, _users);
        // Emit the event after updating all addresses
        emit CookieJarLib.WhitelistUpdated(_users, false);
    }

    /**
     * @notice Updates the blacklist status of a user.
     * @param _users The address of the user.
     */
    function grantJarBlacklistRole(
        address[] calldata _users
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        _grantRoles(CookieJarLib.JAR_BLACKLISTED, _users);
        // Emit the event after updating all addresses
        emit CookieJarLib.BlacklistUpdated(_users, true);
    }

    function revokeJarBlacklistRole(
        address[] calldata _users
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        _revokeRoles(CookieJarLib.JAR_BLACKLISTED, _users);
        // Emit the event after updating all addresses
        emit CookieJarLib.BlacklistUpdated(_users, false);
    }

    /**
     * @notice Updates the fee collector address.
     * @param _newFeeCollector The new fee collector address.
     */
    function updateFeeCollector(address _newFeeCollector) external {
        if (msg.sender != feeCollector) revert CookieJarLib.NotFeeCollector();
        if (_newFeeCollector == address(0))
            revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        address old = feeCollector;
        feeCollector = _newFeeCollector;
        emit CookieJarLib.FeeCollectorUpdated(old, _newFeeCollector);
    }

    /**
     * @notice Adds a new NFT gate if it is not already registered.
     * @param _nftAddress The NFT contract address.
     * @param _nftType The NFT type.
     */
    function addNFTGate(
        address _nftAddress,
        uint8 _nftType
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated)
            revert CookieJarLib.InvalidAccessType();
        if (nftGates.length >= CookieJarLib.MAX_NFT_GATES)
            revert CookieJarLib.MaxNFTGatesReached();
        if (_nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        if (_nftType > 2) revert CookieJarLib.InvalidNFTType();
        if (nftGateMapping[_nftAddress].nftAddress != address(0)) {
            revert CookieJarLib.DuplicateNFTGate();
        }
        CookieJarLib.NFTGate memory gate = CookieJarLib.NFTGate({
            nftAddress: _nftAddress,
            nftType: CookieJarLib.NFTType(_nftType)
        });
        nftGates.push(gate);
        nftGateMapping[_nftAddress] = gate;
        emit CookieJarLib.NFTGateAdded(_nftAddress, _nftType);
    }

    /**
     * @notice Removes an NFT gate.
     * @param _nftAddress The NFT contract address.
     */
    function removeNFTGate(
        address _nftAddress
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated)
            revert CookieJarLib.InvalidAccessType();
        if (nftGateMapping[_nftAddress].nftAddress == address(0))
            revert CookieJarLib.NFTGateNotFound();

        delete nftGateMapping[_nftAddress];

        uint256 gateIndex;
        for (uint256 i = 0; i < nftGates.length; i++) {
            if (nftGates[i].nftAddress == _nftAddress) {
                gateIndex = i;
                break;
            }
        }
        nftGates[gateIndex] = nftGates[nftGates.length - 1];
        nftGates.pop();

        emit CookieJarLib.NFTGateRemoved(_nftAddress);
    }

    /**
     * @notice Transfers admin rights to a new address.
     * @param _newAdmin The new admin address.
     */
    function transferJarOwnership(
        address _newAdmin
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (_newAdmin == address(0))
            revert CookieJarLib.AdminCannotBeZeroAddress();
        _revokeRole(CookieJarLib.JAR_OWNER, jarOwner);
        _grantRole(CookieJarLib.JAR_OWNER, _newAdmin);
        jarOwner = _newAdmin;
        emit CookieJarLib.AdminUpdated(_newAdmin);
    }

    // --- Deposit Functions ---

    /**
     * @notice Deposits ETH into the contract, deducting depositFee.
     * @notice Only works if the currency is ETH, which is address(3).
     */
    function depositETH() public payable onlySupportedCurrency(address(3)) {
        if (msg.value < minDeposit)
            revert CookieJarLib.LessThanMinimumDeposit();

        // Send fee to fee collector
        uint256 remainingAmount = _calculateAndTransferFeeToCollector(msg.value);
        currencyHeldByJar += remainingAmount;
        // Emit deposit event
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
    }

    /**
     * @notice Deposits Currency tokens into the contract; 1% fee is forwarded to the fee collector.
     * @param amount The amount of tokens to deposit.
     */
    function depositCurrency(uint256 amount) public {
        if (amount < minDeposit)
            revert CookieJarLib.LessThanMinimumDeposit();

        IERC20(currency).safeTransferFrom(msg.sender, address(this), amount);
        uint256 remainingAmount = _calculateAndTransferFeeToCollector(amount);
        currencyHeldByJar += remainingAmount;
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
    }

    function _calculateAndTransferFeeToCollector(
        uint256 _principalAmount
    ) internal returns (uint256 amountRemaining) {
        uint256 fee = (_principalAmount * feePercentageOnDeposit) / 100;

        if (currency == address(3)) {
            (bool success, ) = payable(feeCollector).call{value: fee}("");
            if (!success) revert CookieJarLib.FeeTransferFailed();
        } else {
            bool success = IERC20(currency).transfer(feeCollector, fee);
            if (!success) revert CookieJarLib.FeeTransferFailed();
        }
        amountRemaining = _principalAmount - fee;
    }

    // --- Internal Access Check Functions ---

    /**
     * @notice Checks if the caller has NFT-gated access via the specified gate.
     * @param gateAddress The NFT contract address used for gating.
     * @param tokenId The NFT token id.
     * @return gate The NFTGate struct corresponding to the provided gate.
     */
    function _checkAccessNFT(
        address gateAddress,
        uint256 tokenId
    )
        internal
        view
        returns (CookieJarLib.NFTGate memory gate)
    {
        gate = nftGateMapping[gateAddress];
        if (gate.nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        if (
            gate.nftType == CookieJarLib.NFTType.ERC721 ||
            gate.nftType == CookieJarLib.NFTType.Soulbound
        ) {
            if (IERC721(gate.nftAddress).ownerOf(tokenId) != msg.sender) {
                revert CookieJarLib.NotAuthorized();
            }
        } else if (gate.nftType == CookieJarLib.NFTType.ERC1155) {
            if (IERC1155(gate.nftAddress).balanceOf(msg.sender, tokenId) == 0) {
                revert CookieJarLib.NotAuthorized();
            }
        }
    }

    // --- Withdrawal Functions ---

    /**
     * @notice Withdraws funds (ETH or ERC20) for whitelisted users.
     * @param amount The amount to withdraw.
     * @param purpose A description for the withdrawal.
     */
    function withdrawWhitelistMode(
        uint256 amount,
        string calldata purpose
    )
        external
        onlyRole(CookieJarLib.JAR_WHITELISTED)
        onlyNotJarBlacklisted()
    {
        if (amount == 0) revert CookieJarLib.ZeroWithdrawal();
        if (accessType != CookieJarLib.AccessType.Whitelist)
            revert CookieJarLib.InvalidAccessType();
        if (strictPurpose && bytes(purpose).length < 20) {
            revert CookieJarLib.InvalidPurpose();
        }
        if (
            oneTimeWithdrawal == true && isWithdrawnByUser[msg.sender] == true
        ) {
            revert CookieJarLib.CookieJar__WithdrawalAlreadyDone();
        }

        uint256 nextAllowed = lastWithdrawalWhitelist[msg.sender] +
            withdrawalInterval;
        if (block.timestamp < nextAllowed) {
            revert CookieJarLib.WithdrawalTooSoon(nextAllowed);
        }
        lastWithdrawalWhitelist[msg.sender] = block.timestamp;

        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(
                    amount,
                    fixedAmount
                );
            }
        } else {
            if (amount > maxWithdrawal) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(
                    amount,
                    maxWithdrawal
                );
            }
        }

        if (currency == address(3)) {
            if (currencyHeldByJar < amount)
                revert CookieJarLib.InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.InsufficientBalance();
            emit CookieJarLib.Withdrawal(
                msg.sender,
                amount,
                purpose,
                address(0)
            );
        } else {
            if (currencyHeldByJar < amount)
                revert CookieJarLib.InsufficientBalance();
            IERC20(currency).safeTransfer(msg.sender, amount);
            emit CookieJarLib.Withdrawal(msg.sender, amount, purpose, currency);
        }
        currencyHeldByJar -= amount;
        CookieJarLib.WithdrawalData memory temp = CookieJarLib.WithdrawalData({
            amount: amount,
            purpose: purpose
        });
        withdrawalData.push(temp); // push the data
        if (oneTimeWithdrawal == true) {
            isWithdrawnByUser[msg.sender] = true;
        }
    }

    /**
     * @notice Withdraws funds (ETH or ERC20) for NFT-gated users.
     * @param amount The amount to withdraw.
     * @param purpose A description for the withdrawal.
     * @param gateAddress The NFT contract address used for gating.
     * @param tokenId The NFT token id used for gating.
     */
    function withdrawNFTMode(
        uint256 amount,
        string calldata purpose,
        address gateAddress,
        uint256 tokenId
    ) external onlyNotJarBlacklisted() {
        if (amount == 0) revert CookieJarLib.ZeroWithdrawal();
        if (accessType != CookieJarLib.AccessType.NFTGated)
            revert CookieJarLib.InvalidAccessType();
        if (gateAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        _checkAccessNFT(gateAddress, tokenId);
        if (strictPurpose && bytes(purpose).length < 20) {
            revert CookieJarLib.InvalidPurpose();
        }
        if (
            oneTimeWithdrawal == true && isWithdrawnByUser[msg.sender] == true
        ) {
            revert CookieJarLib.CookieJar__WithdrawalAlreadyDone();
        }

        bytes32 key = keccak256(abi.encodePacked(gateAddress, tokenId));
        uint256 nextAllowed = lastWithdrawalNFT[key] + withdrawalInterval;
        if (block.timestamp < nextAllowed) {
            revert CookieJarLib.WithdrawalTooSoon(nextAllowed);
        }
        lastWithdrawalNFT[key] = block.timestamp;

        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(
                    amount,
                    fixedAmount
                );
            }
        } else {
            if (amount > maxWithdrawal) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(
                    amount,
                    maxWithdrawal
                );
            }
        }

        if (currency == address(3)) {
            if (currencyHeldByJar < amount)
                revert CookieJarLib.InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.InsufficientBalance();
            emit CookieJarLib.Withdrawal(
                msg.sender,
                amount,
                purpose,
                address(0)
            );
        } else {
            if (currencyHeldByJar < amount)
                revert CookieJarLib.InsufficientBalance();
            IERC20(currency).safeTransfer(msg.sender, amount);
            emit CookieJarLib.Withdrawal(msg.sender, amount, purpose, currency);
        }
        currencyHeldByJar -= amount;
        CookieJarLib.WithdrawalData memory temp = CookieJarLib.WithdrawalData({
            amount: amount,
            purpose: purpose
        });
        withdrawalData.push(temp); // push the data
        if (oneTimeWithdrawal == true) {
            isWithdrawnByUser[msg.sender] = true;
        }
    }

    /**
     * SECURITY CONCERN, UPDATE STATE OR NOT?
     * @notice Allows the admin to perform an emergency withdrawal of funds (ETH or ERC20).
     * @param token If zero address then ETH is withdrawn; otherwise, ERC20 token address.
     * @param amount The amount to withdraw.
     */
    function emergencyWithdrawWithoutState(
        address token,
        uint256 amount
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (!emergencyWithdrawalEnabled)
            revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroWithdrawal();
        if (token == address(3)) {
            if (address(this).balance < amount)
                revert CookieJarLib.InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.FeeTransferFailed();
            emit CookieJarLib.EmergencyWithdrawal(msg.sender, token, amount);
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance < amount)
                revert CookieJarLib.InsufficientBalance();
            IERC20(token).safeTransfer(msg.sender, amount);
            emit CookieJarLib.EmergencyWithdrawal(msg.sender, token, amount);
        }
    }

    function emergencyWithdrawCurrencyWithState(
        uint256 amount
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (!emergencyWithdrawalEnabled)
            revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroWithdrawal();
        if (currency == address(3)) {
            if (address(this).balance < amount)
                revert CookieJarLib.InsufficientBalance();
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.FeeTransferFailed();
            emit CookieJarLib.EmergencyWithdrawal(msg.sender, currency, amount);
        } else {
            uint256 tokenBalance = IERC20(currency).balanceOf(address(this));
            if (tokenBalance < amount)
                revert CookieJarLib.InsufficientBalance();
            IERC20(currency).safeTransfer(msg.sender, amount);
            emit CookieJarLib.EmergencyWithdrawal(msg.sender, currency, amount);
        }
        currencyHeldByJar -= amount;
    }

    function getNFTGatesArray()
        external
        view
        returns (CookieJarLib.NFTGate[] memory)
    {
        return nftGates;
    }

    function getWithdrawalDataArray()
        external
        view
        returns (CookieJarLib.WithdrawalData[] memory)
    {
        return withdrawalData;
    }

    function _grantRoles(bytes32 role, address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            _grantRole(role, users[i]);
        }
    }

    function _revokeRoles(bytes32 role, address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            _revokeRole(role, users[i]);
        }
    }
    
    fallback() external payable {}

    receive() external payable {}
}
