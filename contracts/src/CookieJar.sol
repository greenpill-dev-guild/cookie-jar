// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {CookieJarLib} from "./libraries/CookieJarLib.sol";
import {CookieJarValidation} from "./libraries/CookieJarValidation.sol";
import {UniversalSwapAdapter} from "./libraries/UniversalSwapAdapter.sol";
import {Streaming} from "./libraries/Streaming.sol";
import {ISuperfluid, IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/interfaces/superfluid/ISuperfluid.sol";

/// @dev Minimal POAP interface for event-level token ownership checks.
interface IPOAP {
    function tokenDetailsOfOwnerByEvent(address owner, uint256 eventId) external view returns (uint256[] memory);
}

/// @title CookieJar - Optimized Version
/// @notice Decentralized funding pools with simplified access control
/// @dev Supports Allowlist, ERC721, and ERC1155 access types with optimized storage and validation
/// @custom:security-contact security@greenpill.network
contract CookieJar is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Allowlist for allowlist-based access
    /// @dev Kept for compatibility with existing integrations
    address[] public allowlist;

    /// @notice Access requirements - unified for all access types
    CookieJarLib.NftRequirement public nftRequirement;

    /// @notice Withdrawal tracking state variables
    /// @dev Maintained for complex withdrawal logic requirements
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => uint256) public totalWithdrawn;
    mapping(address => uint256) public withdrawnInCurrentPeriod;
    uint256 public immutable MAX_WITHDRAWAL_PER_PERIOD;

    uint256 public currencyHeldByJar;
    address public immutable CURRENCY;
    uint256 public immutable MIN_DEPOSIT;
    /// @notice Fee percentage, 10000 = 100%
    uint256 public immutable FEE_PERCENTAGE_ON_DEPOSIT;
    /// @notice Access control mode: Allowlist or NFTGated.
    CookieJarLib.AccessType public immutable ACCESS_TYPE;
    /// @notice Withdrawal option: Fixed or Variable.
    CookieJarLib.WithdrawalTypeOptions public immutable WITHDRAWAL_OPTION;

    /// @notice If true, each recipient can only claim from the jar once.
    bool public immutable ONE_TIME_WITHDRAWAL;
    /// @notice Fixed withdrawal amount (used if WITHDRAWAL_OPTION is Fixed).
    uint256 public fixedAmount;
    /// @notice Maximum withdrawal amount (used if WITHDRAWAL_OPTION is Variable).
    uint256 public maxWithdrawal;
    /// @notice Time (in seconds) required between withdrawals.
    uint256 public withdrawalInterval;
    /// @notice If true, each withdrawal must have a purpose string of at least 27 characters.
    bool public immutable STRICT_PURPOSE;
    /// @notice Fee collector address; note that admin is not the fee collector.
    address public feeCollector;
    /// @notice If true, emergency withdrawal is enabled.
    bool public immutable EMERGENCY_WITHDRAWAL_ENABLED;
    /// @notice Maximum withdrawal allowed per period (removed for simplicity)
    // uint256 public MAX_WITHDRAWAL_PER_PERIOD; // Removed for size optimization

    // === MULTI-TOKEN & STREAMING STORAGE ===

    /// @notice Multi-token configuration
    CookieJarLib.MultiTokenConfig public multiTokenConfig;

    /// @notice Tokens pending manual swap to jar token
    mapping(address => uint256) public pendingTokenBalances;

    /// @notice Track Super Token streams by superToken => sender => stream
    mapping(address => mapping(address => Streaming.SuperfluidStream)) public superStreams;

    // === SUPERFLUID INTEGRATION ===

    /// @notice Superfluid host contract address (immutable)
    ISuperfluid public immutable SUPERFLUID_HOST;

    /// @notice Constant Flow Agreement contract (immutable)
    IConstantFlowAgreementV1 public immutable CFA;

    /// @notice Real-time balance tracking for Super Tokens
    /// @dev Maps superToken => real-time balance (including ongoing streams)
    mapping(address => int96) public superTokenFlowRates;

    // Complex withdrawal tracking removed for simplicity

    /// @notice Initializes a new CookieJar contract
    /// @dev Simplified constructor with unified access configuration
    /// @param config The main configuration struct for the jar
    /// @param accessConfig The access control configuration (allowlist or NFT requirement)
    /// @param _superfluidHost Address of the Superfluid host contract
    constructor(
        CookieJarLib.JarConfig memory config,
        CookieJarLib.AccessConfig memory accessConfig,
        address _superfluidHost
    ) {
        if (config.jarOwner == address(0)) revert CookieJarLib.AdminCannotBeZeroAddress();
        if (config.feeCollector == address(0)) revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();

        // Initialize Superfluid host and CFA using Streaming library
        if (_superfluidHost != address(0)) {
            (SUPERFLUID_HOST, CFA) = Streaming.initializeSuperfluidContracts(_superfluidHost);
        } else {
            // For testing - use placeholder addresses
            SUPERFLUID_HOST = ISuperfluid(address(0));
            CFA = IConstantFlowAgreementV1(address(0));
        }

        // Set immutable configuration
        ACCESS_TYPE = config.accessType;
        CURRENCY = config.supportedCurrency;
        MIN_DEPOSIT = config.minDeposit;
        FEE_PERCENTAGE_ON_DEPOSIT = config.feePercentageOnDeposit;
        WITHDRAWAL_OPTION = config.withdrawalOption;
        ONE_TIME_WITHDRAWAL = config.oneTimeWithdrawal;
        fixedAmount = config.fixedAmount;
        maxWithdrawal = config.maxWithdrawal;
        withdrawalInterval = config.withdrawalInterval;
        STRICT_PURPOSE = config.strictPurpose;
        feeCollector = config.feeCollector;
        EMERGENCY_WITHDRAWAL_ENABLED = config.emergencyWithdrawalEnabled;
        MAX_WITHDRAWAL_PER_PERIOD = config.maxWithdrawalPerPeriod;

        // Set access requirements based on type
        if (ACCESS_TYPE == CookieJarLib.AccessType.Allowlist) {
            _setupAllowlist(accessConfig.allowlist);
        } else {
            // For ERC721 and ERC1155, validate NFT requirement
            if (accessConfig.nftRequirement.nftContract == address(0)) {
                revert CookieJarLib.NoNFTAddressesProvided();
            }

            // Validate that the contract actually implements the required interface
            _validateNftContract(accessConfig.nftRequirement.nftContract, config.accessType);

            nftRequirement = accessConfig.nftRequirement;
        }

        // Set multi-token configuration
        multiTokenConfig = config.multiTokenConfig;

        // Setup roles
        _grantRole(CookieJarLib.JAR_OWNER, config.jarOwner);
        _setRoleAdmin(CookieJarLib.JAR_ALLOWLISTED, CookieJarLib.JAR_OWNER);
    }

    // === ETH RECEIVE FUNCTION ===

    /// @notice Receive ETH and handle direct deposits or pending storage
    receive() external payable {
        _handleEthReceive();
    }

    /// @notice Internal function to handle ETH receive logic
    function _handleEthReceive() internal {
        if (msg.value == 0) return;

        if (CURRENCY == CookieJarLib.ETH_ADDRESS) {
            // Direct ETH jar - process with fees
            (uint256 fee, uint256 remainingAmount) = _calculateFee(msg.value);
            currencyHeldByJar += remainingAmount;

            if (fee > 0) {
                (bool success, ) = payable(feeCollector).call{value: fee}("");
                if (!success) revert CookieJarLib.FeeTransferFailed();
                emit CookieJarLib.FeeCollected(feeCollector, fee, CookieJarLib.ETH_ADDRESS);
            }

            emit CookieJarLib.Deposit(msg.sender, remainingAmount, CookieJarLib.ETH_ADDRESS);
        } else {
            // Store ETH as pending for manual processing
            pendingTokenBalances[address(0)] += msg.value;
            emit CookieJarLib.Deposit(msg.sender, msg.value, address(0));
        }
    }

    // --- Admin Functions ---

    /// @notice Pauses all jar operations (deposits and withdrawals)
    function pause() external onlyRole(CookieJarLib.JAR_OWNER) {
        _pause();
        emit CookieJarLib.PausedStateChanged(true);
    }

    /// @notice Unpauses jar operations
    function unpause() external onlyRole(CookieJarLib.JAR_OWNER) {
        _unpause();
        emit CookieJarLib.PausedStateChanged(false);
    }

    // Period withdrawal limit removed for simplicity

    /// @notice Updates the jar allowlist status of a user.
    /// @param _users The address of the user.
    function grantJarAllowlistRole(address[] calldata _users) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (ACCESS_TYPE != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _grantRoles(CookieJarLib.JAR_ALLOWLISTED, _users);
    }

    function revokeJarAllowlistRole(address[] calldata _users) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (ACCESS_TYPE != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _revokeRoles(CookieJarLib.JAR_ALLOWLISTED, _users);
    }

    /// @notice Updates the fee collector address. Only the fee collector can call this function.
    /// @param _newFeeCollector The new fee collector address.
    function updateFeeCollector(address _newFeeCollector) external {
        if (msg.sender != feeCollector) revert CookieJarLib.NotFeeCollector();
        if (_newFeeCollector == address(0)) revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        address old = feeCollector;
        feeCollector = _newFeeCollector;
        emit CookieJarLib.FeeCollectorUpdated(old, _newFeeCollector);
    }

    // NFT gate management removed for simplicity - direct ownership verification used instead

    /// @notice Updates the maximum withdrawal amount, only works if WITHDRAWAL_OPTION is Variable.
    /// @param _maxWithdrawal The new maximum withdrawal amount.
    function updateMaxWithdrawalAmount(uint256 _maxWithdrawal) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (WITHDRAWAL_OPTION == CookieJarLib.WithdrawalTypeOptions.Fixed) revert CookieJarLib.InvalidWithdrawalType();
        if (_maxWithdrawal == 0) revert CookieJarLib.ZeroAmount();
        maxWithdrawal = _maxWithdrawal;
        emit CookieJarLib.ParameterUpdated(CookieJarLib.PARAM_MAX_WITHDRAWAL, _maxWithdrawal);
    }

    /// @notice Updates the fixed withdrawal amount, only works if WITHDRAWAL_OPTION is Fixed.
    /// @param _fixedAmount The new fixed withdrawal amount.
    function updateFixedWithdrawalAmount(uint256 _fixedAmount) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (WITHDRAWAL_OPTION == CookieJarLib.WithdrawalTypeOptions.Variable) {
            revert CookieJarLib.InvalidWithdrawalType();
        }
        if (_fixedAmount == 0) revert CookieJarLib.ZeroAmount();
        fixedAmount = _fixedAmount;
        emit CookieJarLib.ParameterUpdated(CookieJarLib.PARAM_FIXED_AMOUNT, _fixedAmount);
    }

    /// @notice Updates the withdrawal interval.
    /// @param _withdrawalInterval The new withdrawal interval.
    function updateWithdrawalInterval(uint256 _withdrawalInterval) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (_withdrawalInterval == 0) revert CookieJarLib.ZeroAmount();
        withdrawalInterval = _withdrawalInterval;
        emit CookieJarLib.ParameterUpdated(CookieJarLib.PARAM_WITHDRAWAL_INTERVAL, _withdrawalInterval);
    }

    // === MULTI-TOKEN & STREAMING ADMIN FUNCTIONS ===

    /// @notice Admin function to swap pending tokens to jar token
    /// @param token Token address (address(0) for ETH)
    /// @param amount Amount to swap (0 = all pending)
    /// @param minJarTokensOut Minimum jar tokens expected
    function swapPendingTokens(
        address token,
        uint256 amount,
        uint256 minJarTokensOut
    ) external onlyRole(CookieJarLib.JAR_OWNER) nonReentrant {
        uint256 pending = pendingTokenBalances[token];
        if (pending == 0) revert CookieJarLib.InsufficientBalance();

        if (amount == 0) amount = pending;
        if (amount > pending) revert CookieJarLib.InsufficientBalance();

        pendingTokenBalances[token] -= amount;

        // Swap any token to jar token using unified function
        _swapToJarToken(token, amount, minJarTokensOut);

        emit CookieJarLib.PendingTokensRecovered(token, amount);
    }

    /// @notice Allows the admin to perform an emergency withdrawal of funds from the jar.
    /// @param token If address(3) then ETH is withdrawn; otherwise, ERC20 token address.
    /// @param amount The amount to withdraw.
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(CookieJarLib.JAR_OWNER) nonReentrant {
        if (!EMERGENCY_WITHDRAWAL_ENABLED) revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (token == CURRENCY) {
            if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();
            currencyHeldByJar -= amount;
        }
        // Clear pending token accounting to prevent stale swapPendingTokens() calls
        address pendingKey = token == CookieJarLib.ETH_ADDRESS ? address(0) : token;
        if (pendingTokenBalances[pendingKey] > 0) {
            uint256 pending = pendingTokenBalances[pendingKey];
            pendingTokenBalances[pendingKey] = amount >= pending ? 0 : pending - amount;
        }
        emit CookieJarLib.EmergencyWithdrawal(msg.sender, token, amount);
        if (token == CookieJarLib.ETH_ADDRESS) {
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }

    // --- User Functions ---

    /// @notice Unified deposit function for both ETH and ERC20 tokens
    /// @dev Handles both native ETH and ERC20 token deposits with fee deduction
    /// @param amount Amount to deposit (ignored for ETH, must be 0 for ETH deposits)
    function deposit(uint256 amount) public payable whenNotPaused nonReentrant {
        uint256 depositAmount;

        if (CURRENCY == CookieJarLib.ETH_ADDRESS) {
            // ETH deposit - amount parameter should be 0
            if (amount != 0) revert CookieJarLib.InvalidTokenAddress();
            if (msg.value == 0) revert CookieJarLib.ZeroAmount();
            if (msg.value < MIN_DEPOSIT) revert CookieJarLib.LessThanMinimumDeposit();
            depositAmount = msg.value;
        } else {
            // ERC20 deposit
            if (msg.value != 0) revert CookieJarLib.InvalidTokenAddress();
            if (amount == 0) revert CookieJarLib.ZeroAmount();
            if (amount < MIN_DEPOSIT) revert CookieJarLib.LessThanMinimumDeposit();
            depositAmount = amount;

            // Transfer ERC20 tokens from user to contract
            IERC20(CURRENCY).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Calculate and deduct fee
        (uint256 fee, uint256 remainingAmount) = _calculateFee(depositAmount);

        if (CURRENCY == CookieJarLib.ETH_ADDRESS) {
            // Send ETH fee to fee collector
            if (fee > 0) {
                (bool success, ) = payable(feeCollector).call{value: fee}("");
                if (!success) revert CookieJarLib.FeeTransferFailed();
            }
        } else {
            // Send ERC20 fee to fee collector
            if (fee > 0) {
                IERC20(CURRENCY).safeTransfer(feeCollector, fee);
            }
        }

        // Update jar balance
        currencyHeldByJar += remainingAmount;

        // Emit events
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, CURRENCY);
        if (fee > 0) emit CookieJarLib.FeeCollected(feeCollector, fee, CURRENCY);
    }

    /// @notice Unified withdrawal function for all access types
    /// @dev Consolidated function reduces bytecode by eliminating duplicate logic
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    function withdraw(uint256 amount, string calldata purpose) public whenNotPaused nonReentrant {
        // Validate access based on jar type
        _checkAccess();

        // Validate and execute withdrawal
        _validateAndWithdraw(amount, purpose);
    }

    /// @notice Legacy function for allowlist mode (backwards compatibility)
    function withdrawAllowlistMode(uint256 amount, string calldata purpose) external {
        if (ACCESS_TYPE != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        withdraw(amount, purpose);
    }

    /// @notice Legacy function for ERC721 mode (backwards compatibility)
    function withdrawWithErc721(uint256 amount, string calldata purpose) external {
        if (ACCESS_TYPE != CookieJarLib.AccessType.ERC721) revert CookieJarLib.InvalidAccessType();
        withdraw(amount, purpose);
    }

    /// @notice Legacy function for ERC1155 mode (backwards compatibility)
    function withdrawWithErc1155(uint256 amount, string calldata purpose) external {
        if (ACCESS_TYPE != CookieJarLib.AccessType.ERC1155) revert CookieJarLib.InvalidAccessType();
        withdraw(amount, purpose);
    }

    // --- View Functions ---

    // NFT gate array and withdrawal data tracking removed for simplicity

    function getAllowlist() external view returns (address[] memory) {
        return allowlist;
    }

    /// @notice Get all pending token addresses (tokens that aren't jar currency)
    /// @return tokens Array of token addresses that are pending swaps
    /// @dev PLACEHOLDER: In production, maintain a dynamic list of pending tokens
    ///      This simplified version only checks ETH for demonstration purposes
    function getPendingTokenAddresses() external view returns (address[] memory tokens) {
        // Simple approach: return ETH if it has a pending balance and isn't the jar currency
        // In a production implementation, you should maintain a separate array of pending
        // token addresses for gas efficiency and to track all tokens

        uint256 count = 0;

        // Check ETH if jar doesn't use ETH
        if (CURRENCY != CookieJarLib.ETH_ADDRESS && pendingTokenBalances[address(0)] > 0) {
            count = 1;
        }

        tokens = new address[](count);
        if (count > 0) {
            tokens[0] = address(0);
        }
    }

    // === INTERNAL VALIDATION FUNCTIONS ===

    /// @notice Optimized inline access validation for all access types
    /// @dev Consolidated validation logic to reduce bytecode size
    function _checkAccess() internal view {
        if (ACCESS_TYPE == CookieJarLib.AccessType.Allowlist) {
            if (!hasRole(CookieJarLib.JAR_ALLOWLISTED, msg.sender)) revert CookieJarLib.NotAuthorized();
        } else if (ACCESS_TYPE == CookieJarLib.AccessType.ERC721) {
            // Inline ERC721 validation
            if (nftRequirement.nftContract == address(0)) revert CookieJarLib.InvalidTokenAddress();

            // tokenId == 0 means "any token from contract" (generic ERC-721 gate)
            if (nftRequirement.tokenId == 0) {
                _requireAnyErc721Balance(nftRequirement.nftContract, msg.sender);
                return;
            }

            // POAP event gate marker: tokenId=eventId and minBalance>0.
            // This preserves ABI shape while enabling strict event-level enforcement.
            if (nftRequirement.minBalance > 0) {
                _requirePoapEventOwnership(nftRequirement.nftContract, msg.sender, nftRequirement.tokenId);
                return;
            }

            // Otherwise require ownership of one specific ERC-721 token ID.
            _requireErc721TokenOwnership(nftRequirement.nftContract, msg.sender, nftRequirement.tokenId);
        } else if (ACCESS_TYPE == CookieJarLib.AccessType.ERC1155) {
            // Inline ERC1155 validation
            if (nftRequirement.nftContract == address(0)) revert CookieJarLib.InvalidTokenAddress();
            uint256 minBal = nftRequirement.minBalance > 0 ? nftRequirement.minBalance : 1;
            try IERC1155(nftRequirement.nftContract).balanceOf(msg.sender, nftRequirement.tokenId) returns (
                uint256 bal
            ) {
                if (bal < minBal) revert CookieJarLib.InsufficientNFTBalance();
            } catch {
                revert CookieJarLib.NFTValidationFailed();
            }
        } else {
            revert CookieJarLib.InvalidAccessType();
        }
    }

    function _requireAnyErc721Balance(address nftContract, address account) internal view {
        try IERC721(nftContract).balanceOf(account) returns (uint256 balance) {
            if (balance == 0) revert CookieJarLib.InsufficientNFTBalance();
        } catch {
            revert CookieJarLib.NFTValidationFailed();
        }
    }

    function _requireErc721TokenOwnership(address nftContract, address account, uint256 tokenId) internal view {
        try IERC721(nftContract).ownerOf(tokenId) returns (address owner) {
            if (owner != account) revert CookieJarLib.NFTNotOwned();
        } catch {
            revert CookieJarLib.NFTValidationFailed();
        }
    }

    function _requirePoapEventOwnership(address nftContract, address account, uint256 eventId) internal view {
        try IPOAP(nftContract).tokenDetailsOfOwnerByEvent(account, eventId) returns (uint256[] memory tokens) {
            if (tokens.length == 0) revert CookieJarLib.InsufficientNFTBalance();
        } catch {
            revert CookieJarLib.NFTValidationFailed();
        }
    }

    /// @notice Validate withdrawal constraints and execute withdrawal
    /// @dev Unified validation replacing multiple protocol-specific functions
    function _validateAndWithdraw(uint256 amount, string calldata purpose) internal {
        _validateWithdrawalConstraints(amount, purpose);
        _executeWithdrawal(amount);
    }

    /// @notice Validate all withdrawal constraints
    /// @dev Consolidated validation logic from multiple functions
    function _validateWithdrawalConstraints(uint256 amount, string calldata purpose) internal view {
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();

        // Validate purpose requirement (uses Unicode code-point counting)
        CookieJarValidation.validatePurpose(STRICT_PURPOSE, purpose);

        // Validate withdrawal amount
        if (WITHDRAWAL_OPTION == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, fixedAmount);
            }
        } else {
            if (amount > maxWithdrawal) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, maxWithdrawal);
            }
        }

        // Validate timing constraints
        if (
            lastWithdrawalTime[msg.sender] > 0 && block.timestamp < lastWithdrawalTime[msg.sender] + withdrawalInterval
        ) {
            revert CookieJarLib.WithdrawalTooSoon(lastWithdrawalTime[msg.sender] + withdrawalInterval);
        }

        // Validate one-time constraint
        if (ONE_TIME_WITHDRAWAL && totalWithdrawn[msg.sender] > 0) {
            revert CookieJarLib.WithdrawalAlreadyDone();
        }

        // Validate period limits using user-specific rolling period
        if (MAX_WITHDRAWAL_PER_PERIOD > 0) {
            uint256 withdrawnThisPeriod = _effectiveWithdrawnInPeriod(msg.sender);

            if (withdrawnThisPeriod + amount > MAX_WITHDRAWAL_PER_PERIOD) {
                uint256 available = MAX_WITHDRAWAL_PER_PERIOD - withdrawnThisPeriod;
                revert CookieJarLib.PeriodWithdrawalLimitExceeded(amount, available);
            }
        }
    }

    /// @notice Execute withdrawal and update tracking
    /// @dev Consolidated withdrawal logic
    function _executeWithdrawal(uint256 amount) internal {
        // Reset period counter if new period started
        if (_isNewPeriod(msg.sender)) {
            withdrawnInCurrentPeriod[msg.sender] = 0;
        }

        currencyHeldByJar -= amount;
        lastWithdrawalTime[msg.sender] = block.timestamp;
        totalWithdrawn[msg.sender] += amount;
        withdrawnInCurrentPeriod[msg.sender] += amount;

        // Transfer funds
        if (CURRENCY == CookieJarLib.ETH_ADDRESS) {
            (bool success, ) = msg.sender.call{value: amount}("");
            if (!success) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(CURRENCY).safeTransfer(msg.sender, amount);
        }
    }

    /// @notice Check if the user's withdrawal period has rolled over
    function _isNewPeriod(address user) internal view returns (bool) {
        return block.timestamp >= lastWithdrawalTime[user] + CookieJarLib.WITHDRAWAL_PERIOD;
    }

    /// @notice Get the effective withdrawn amount in the current period (resets if new period)
    function _effectiveWithdrawnInPeriod(address user) internal view returns (uint256) {
        return _isNewPeriod(user) ? 0 : withdrawnInCurrentPeriod[user];
    }

    function _grantRoles(bytes32 role, address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            // Only add to allowlist if role wasn't previously granted
            bool hadRole = hasRole(role, users[i]);
            _grantRole(role, users[i]);
            // Update allowlist array for JAR_ALLOWLISTED role (only if newly granted)
            if (role == CookieJarLib.JAR_ALLOWLISTED && !hadRole) {
                allowlist.push(users[i]);
            }
        }
    }

    function _revokeRoles(bytes32 role, address[] memory users) internal {
        for (uint256 i = 0; i < users.length; i++) {
            _revokeRole(role, users[i]);
            // Update allowlist array for JAR_ALLOWLISTED role
            if (role == CookieJarLib.JAR_ALLOWLISTED) {
                _removeFromAllowlist(users[i]);
            }
        }
    }

    /// @notice Remove address from allowlist array
    /// @dev Helper function to maintain allowlist array consistency
    function _removeFromAllowlist(address user) internal {
        for (uint256 i = 0; i < allowlist.length; i++) {
            if (allowlist[i] == user) {
                // Move last element to the position of removed element
                allowlist[i] = allowlist[allowlist.length - 1];
                // Remove last element
                allowlist.pop();
                break;
            }
        }
    }

    /// @notice Setup allowlist for allowlist-based access
    /// @dev Grants JAR_ALLOWLISTED role to provided addresses
    /// @param members Array of addresses to add to allowlist
    function _setupAllowlist(address[] memory members) internal {
        for (uint256 i = 0; i < members.length; i++) {
            _grantRole(CookieJarLib.JAR_ALLOWLISTED, members[i]);
            allowlist.push(members[i]);
        }
    }

    /// @notice Validate that a contract implements the required NFT interface
    /// @dev Checks for critical functions to ensure contract compliance
    /// @param nftContract The NFT contract address to validate
    /// @param _accessType The access type (ERC721 or ERC1155)
    function _validateNftContract(address nftContract, CookieJarLib.AccessType _accessType) internal view {
        if (_accessType == CookieJarLib.AccessType.ERC721) {
            // Try calling ERC721 functions to verify interface
            try IERC721(nftContract).balanceOf(address(this)) returns (uint256) {
                // Success - contract implements balanceOf
            } catch {
                revert CookieJarLib.InvalidNFTGate();
            }

            // Additional check: verify it's actually an ERC721 by trying to call ownerOf(0)
            // This will revert if token doesn't exist, which is fine - we just want to verify the function exists
            try IERC721(nftContract).ownerOf(0) returns (address) {
                // Function exists and returned successfully
            } catch {
                // Function exists but reverted (expected for non-existent token) - this is fine
                // The important part is that the function signature is correct
            }
        } else if (_accessType == CookieJarLib.AccessType.ERC1155) {
            // Try calling ERC1155 function to verify interface
            try IERC1155(nftContract).balanceOf(address(this), 0) returns (uint256) {
                // Success - contract implements balanceOf
            } catch {
                revert CookieJarLib.InvalidNFTGate();
            }
        }
    }

    /// @notice Calculate fee and remaining amount
    /// @dev Gas-optimized fee calculation using integer arithmetic
    /// @param amount The principal amount to calculate fee for
    /// @return fee The calculated fee amount
    /// @return remaining The remaining amount after fee deduction
    function _calculateFee(uint256 amount) internal view returns (uint256 fee, uint256 remaining) {
        fee = (amount * FEE_PERCENTAGE_ON_DEPOSIT) / CookieJarLib.PERCENTAGE_BASE;
        remaining = amount - fee;
    }

    // === INTERNAL SWAP FUNCTIONS ===

    /// @notice Unified internal function to swap any token to jar CURRENCY
    /// @dev Handles both direct processing and DEX swaps with fee deduction
    /// @param fromToken Source token address (address(0) for ETH)
    /// @param amount Amount to process/swap
    /// @param minOut Minimum output amount expected for swaps
    function _swapToJarToken(address fromToken, uint256 amount, uint256 minOut) internal {
        if (fromToken == CURRENCY) {
            // Already jar token - just process with fees
            (uint256 fee, uint256 remainingAmount) = _calculateFee(amount);
            currencyHeldByJar += remainingAmount;

            if (fee > 0) {
                if (fromToken == CookieJarLib.ETH_ADDRESS) {
                    (bool success, ) = payable(feeCollector).call{value: fee}("");
                    if (!success) revert CookieJarLib.FeeTransferFailed();
                } else {
                    IERC20(CURRENCY).safeTransfer(feeCollector, fee);
                }
                emit CookieJarLib.FeeCollected(feeCollector, fee, CURRENCY);
            }

            emit CookieJarLib.Deposit(msg.sender, remainingAmount, CURRENCY);
        } else {
            // Need to swap via DEX
            uint256 jarTokensReceived;

            if (fromToken == CookieJarLib.ETH_ADDRESS) {
                // Swap ETH to jar token
                jarTokensReceived = UniversalSwapAdapter.swapExactEthForTokens(CURRENCY, amount, minOut, address(this));
            } else {
                // Swap ERC20 to jar token
                jarTokensReceived = UniversalSwapAdapter.swapExactInputSingle(
                    fromToken,
                    CURRENCY,
                    amount,
                    minOut,
                    address(this)
                );
            }

            // Process fees and update balance
            (uint256 fee, uint256 remainingAmount) = _calculateFee(jarTokensReceived);
            currencyHeldByJar += remainingAmount;

            if (fee > 0) {
                IERC20(CURRENCY).safeTransfer(feeCollector, fee);
                emit CookieJarLib.FeeCollected(feeCollector, fee, CURRENCY);
            }

            emit CookieJarLib.TokenSwapped(fromToken, CURRENCY, amount, jarTokensReceived);
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, CURRENCY);
        }
    }

    // === STREAMING FUNCTIONS ===
    // Real-time streaming via Superfluid Protocol

    /// @notice Create a Super Token stream - INTEGRATED WITH SUPERFLUID PROTOCOL
    /// @param superToken Super Token address
    /// @param flowRate Flow rate (wad per second)
    function createSuperStream(address superToken, int96 flowRate) external nonReentrant {
        Streaming.createStream(
            SUPERFLUID_HOST,
            CFA,
            superToken,
            msg.sender,
            flowRate,
            superStreams,
            superTokenFlowRates
        );
    }

    /// @notice Update a Super Token stream - INTEGRATED WITH SUPERFLUID PROTOCOL
    /// @param superToken Super Token address
    /// @param newFlowRate New flow rate
    function updateSuperStream(address superToken, int96 newFlowRate) external nonReentrant {
        Streaming.updateStream(
            SUPERFLUID_HOST,
            CFA,
            superToken,
            msg.sender,
            newFlowRate,
            superStreams,
            superTokenFlowRates
        );
    }

    /// @notice Delete a Super Token stream - INTEGRATED WITH SUPERFLUID PROTOCOL
    /// @param superToken Super Token address
    function deleteSuperStream(address superToken) external nonReentrant {
        Streaming.deleteStream(SUPERFLUID_HOST, CFA, superToken, msg.sender, superStreams, superTokenFlowRates);
    }

    /// @notice Get detailed flow information for a specific stream
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @return lastUpdated Timestamp of last update
    /// @return flowrate Current flowrate
    /// @return depositAmount Deposit amount
    /// @return owedDeposit Owed deposit amount
    function getSuperStreamInfo(
        address superToken,
        address sender
    ) external view returns (uint256 lastUpdated, int96 flowrate, uint256 depositAmount, uint256 owedDeposit) {
        return Streaming.getSuperStreamInfo(CFA, superToken, sender, address(this));
    }

    /// @notice Get net flow rate for this contract
    /// @param superToken Super Token address
    /// @return netFlowRate Net flow rate (positive = inflow, negative = outflow)
    function getNetFlowRate(address superToken) external view returns (int96 netFlowRate) {
        return Streaming.getNetFlowRate(CFA, superToken, address(this));
    }

    /// @notice Get account flow info for this contract
    /// @param superToken Super Token address
    /// @return lastUpdated Last update timestamp
    /// @return flowrate Net flowrate
    /// @return depositAmount Total deposit
    /// @return owedDeposit Owed deposit
    function getAccountFlowInfo(
        address superToken
    ) external view returns (uint256 lastUpdated, int96 flowrate, uint256 depositAmount, uint256 owedDeposit) {
        return Streaming.getAccountFlowInfo(CFA, superToken, address(this));
    }
}
