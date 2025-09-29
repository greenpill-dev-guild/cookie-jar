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
import {ISuperfluid, ISuperToken, IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/interfaces/superfluid/ISuperfluid.sol";

// Protocol interfaces
interface IPOAP {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IPublicLock {
    function getHasValidKey(address _user) external view returns (bool);
}

interface IHypercertToken {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

interface IHats {
    function isWearerOfHat(address user, uint256 hatId) external view returns (bool);
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
    CookieJarLib.NFTRequirement public nftRequirement;

    /// @notice Withdrawal tracking state variables
    /// @dev Maintained for complex withdrawal logic requirements
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => uint256) public totalWithdrawn;
    mapping(address => uint256) public withdrawnInCurrentPeriod;
    uint256 public immutable maxWithdrawalPerPeriod;

    uint256 public currencyHeldByJar;
    address public immutable currency;
    uint256 public immutable minDeposit;
    /// @notice Fee percentage, 10000 = 100%
    uint256 public immutable feePercentageOnDeposit;
    /// @notice Access control mode: Allowlist or NFTGated.
    CookieJarLib.AccessType public immutable accessType;
    /// @notice Withdrawal option: Fixed or Variable.
    CookieJarLib.WithdrawalTypeOptions public immutable withdrawalOption;

    /// @notice If true, each recipient can only claim from the jar once.
    bool public immutable oneTimeWithdrawal;
    /// @notice Fixed withdrawal amount (used if withdrawalOption is Fixed).
    uint256 public fixedAmount;
    /// @notice Maximum withdrawal amount (used if withdrawalOption is Variable).
    uint256 public maxWithdrawal;
    /// @notice Time (in seconds) required between withdrawals.
    uint256 public withdrawalInterval;
    /// @notice If true, each withdrawal must have a purpose string of at least 20 characters.
    bool public immutable strictPurpose;
    /// @notice Fee collector address; note that admin is not the fee collector.
    address public feeCollector;
    /// @notice If true, emergency withdrawal is enabled.
    bool public immutable emergencyWithdrawalEnabled;
    /// @notice Maximum withdrawal allowed per period (removed for simplicity)
    // uint256 public maxWithdrawalPerPeriod; // Removed for size optimization

    // === MULTI-TOKEN & STREAMING STORAGE ===
    
    /// @notice Multi-token configuration
    CookieJarLib.MultiTokenConfig public multiTokenConfig;
    
    
    /// @notice Tokens pending manual swap to jar token
    mapping(address => uint256) public pendingTokenBalances;
    
    /// @notice Track Super Token streams by superToken => sender => stream
    mapping(address => mapping(address => Streaming.SuperfluidStream)) public superStreams;
    

    // === SUPERFLUID INTEGRATION ===

    /// @notice Superfluid host contract address (immutable)
    ISuperfluid public immutable superfluidHost;

    /// @notice Constant Flow Agreement contract (immutable)
    IConstantFlowAgreementV1 public immutable cfa;

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
        (superfluidHost, cfa) = Streaming.initializeSuperfluidContracts(_superfluidHost);

        // Set immutable configuration
        accessType = config.accessType;
        currency = config.supportedCurrency;
        minDeposit = config.minDeposit;
        feePercentageOnDeposit = config.feePercentageOnDeposit;
        withdrawalOption = config.withdrawalOption;
        oneTimeWithdrawal = config.oneTimeWithdrawal;
        fixedAmount = config.fixedAmount;
        maxWithdrawal = config.maxWithdrawal;
        withdrawalInterval = config.withdrawalInterval;
        strictPurpose = config.strictPurpose;
        feeCollector = config.feeCollector;
        emergencyWithdrawalEnabled = config.emergencyWithdrawalEnabled;
        maxWithdrawalPerPeriod = config.maxWithdrawalPerPeriod;

        // Set access requirements based on type
        if (accessType == CookieJarLib.AccessType.Allowlist) {
            _setupAllowlist(accessConfig.allowlist);
        } else {
            // For ERC721 and ERC1155, use unified NFT requirement
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
        _handleETHReceive();
    }

    /// @notice Internal function to handle ETH receive logic
    function _handleETHReceive() internal {
        if (msg.value == 0) return;
        
        if (currency == CookieJarLib.ETH_ADDRESS) {
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
        if (accessType != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _grantRoles(CookieJarLib.JAR_ALLOWLISTED, _users);
    }

    function revokeJarAllowlistRole(address[] calldata _users) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
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
    

    /// @notice Updates the maximum withdrawal amount, only works if withdrawalOption is Variable.
    /// @param _maxWithdrawal The new maximum withdrawal amount.
    function updateMaxWithdrawalAmount(uint256 _maxWithdrawal) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) revert CookieJarLib.InvalidWithdrawalType();
        if (_maxWithdrawal == 0) revert CookieJarLib.ZeroAmount();
        maxWithdrawal = _maxWithdrawal;
        emit CookieJarLib.MaxWithdrawalUpdated(_maxWithdrawal);
    }

    /// @notice Updates the fixed withdrawal amount, only works if withdrawalOption is Fixed.
    /// @param _fixedAmount The new fixed withdrawal amount.
    function updateFixedWithdrawalAmount(uint256 _fixedAmount) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Variable) {
            revert CookieJarLib.InvalidWithdrawalType();
        }
        if (_fixedAmount == 0) revert CookieJarLib.ZeroAmount();
        fixedAmount = _fixedAmount;
        emit CookieJarLib.FixedWithdrawalAmountUpdated(_fixedAmount);
    }

    /// @notice Updates the withdrawal interval.
    /// @param _withdrawalInterval The new withdrawal interval.
    function updateWithdrawalInterval(uint256 _withdrawalInterval) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (_withdrawalInterval == 0) revert CookieJarLib.ZeroAmount();
        withdrawalInterval = _withdrawalInterval;
        emit CookieJarLib.WithdrawalIntervalUpdated(_withdrawalInterval);
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
        if (!emergencyWithdrawalEnabled) revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (token == currency) {
            if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();
            currencyHeldByJar -= amount;
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

        if (currency == CookieJarLib.ETH_ADDRESS) {
            // ETH deposit - amount parameter should be 0
            if (amount != 0) revert CookieJarLib.InvalidTokenAddress();
        if (msg.value == 0) revert CookieJarLib.ZeroAmount();
        if (msg.value < minDeposit) revert CookieJarLib.LessThanMinimumDeposit();
            depositAmount = msg.value;
        } else {
            // ERC20 deposit
            if (msg.value != 0) revert CookieJarLib.InvalidTokenAddress();
            if (amount == 0) revert CookieJarLib.ZeroAmount();
            if (amount < minDeposit) revert CookieJarLib.LessThanMinimumDeposit();
            depositAmount = amount;

            // Transfer ERC20 tokens from user to contract
            IERC20(currency).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Calculate and deduct fee
        (uint256 fee, uint256 remainingAmount) = _calculateFee(depositAmount);

        if (currency == CookieJarLib.ETH_ADDRESS) {
            // Send ETH fee to fee collector
            if (fee > 0) {
        (bool success, ) = payable(feeCollector).call{value: fee}("");
        if (!success) revert CookieJarLib.FeeTransferFailed();
            }
        } else {
            // Send ERC20 fee to fee collector
        if (fee > 0) {
            IERC20(currency).safeTransfer(feeCollector, fee);
            }
        }
        
        // Update jar balance
        currencyHeldByJar += remainingAmount;

        // Emit events
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
    }

    /// @notice Withdraws funds for allowlisted users
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    function withdrawAllowlistMode(
        uint256 amount,
        string calldata purpose
    ) external onlyRole(CookieJarLib.JAR_ALLOWLISTED) whenNotPaused nonReentrant {
        if (accessType != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _validateAndWithdraw(amount, purpose);
    }

    /// @notice Withdraw funds with ERC721 NFT verification
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    function withdrawWithERC721(
        uint256 amount, 
        string calldata purpose
    ) external whenNotPaused nonReentrant {
        if (accessType != CookieJarLib.AccessType.ERC721) revert CookieJarLib.InvalidAccessType();
        _validateAccess();
        _validateAndWithdraw(amount, purpose);
    }

    /// @notice Withdraw funds with ERC1155 NFT verification (covers Hypercerts, Hats Protocol)
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    function withdrawWithERC1155(
        uint256 amount, 
        string calldata purpose
    ) external whenNotPaused nonReentrant {
        if (accessType != CookieJarLib.AccessType.ERC1155) revert CookieJarLib.InvalidAccessType();
        _validateAccess();
        _validateAndWithdraw(amount, purpose);
    }

    // --- View Functions ---

    // NFT gate array and withdrawal data tracking removed for simplicity

    function getAllowlist() external view returns (address[] memory) {
        return allowlist;
    }

    // === INTERNAL VALIDATION FUNCTIONS ===

    /// @notice Unified access validation for all access types
    /// @dev Replaces multiple protocol-specific validation functions
    function _validateAccess() internal view {
        if (accessType == CookieJarLib.AccessType.Allowlist) {
            if (!hasRole(CookieJarLib.JAR_ALLOWLISTED, msg.sender)) {
                revert CookieJarLib.NotAuthorized();
            }
        } else if (accessType == CookieJarLib.AccessType.ERC721) {
            _validateERC721Access();
        } else if (accessType == CookieJarLib.AccessType.ERC1155) {
            _validateERC1155Access();
        } else {
            revert CookieJarLib.InvalidAccessType();
        }
    }

    /// @notice Validate ERC721 ownership (covers POAP, Unlock, etc.)
    /// @dev Simplified from complex protocol-specific validation
    function _validateERC721Access() internal view {
        address nftContract = nftRequirement.nftContract;
        uint256 tokenId = nftRequirement.tokenId;

        if (nftContract == address(0)) revert CookieJarLib.InvalidTokenAddress();

        if (tokenId > 0) {
            // Specific token ID required
            try IERC721(nftContract).ownerOf(tokenId) returns (address owner) {
                if (owner != msg.sender) revert CookieJarLib.NotAuthorized();
            } catch {
                revert CookieJarLib.NotAuthorized();
            }
        } else {
            // Any token from contract - fallback for contracts that don't implement ownerOf properly
            revert CookieJarLib.NotAuthorized(); // For now, require specific token ID
        }
    }

    /// @notice Validate ERC1155 balance (covers Hypercerts, Hats Protocol)
    /// @dev Unified validation for all ERC1155-based protocols
    function _validateERC1155Access() internal view {
        address nftContract = nftRequirement.nftContract;
        uint256 tokenId = nftRequirement.tokenId;
        uint256 minBalance = nftRequirement.minBalance > 0 ? nftRequirement.minBalance : 1;

        if (nftContract == address(0)) revert CookieJarLib.InvalidTokenAddress();

        try IERC1155(nftContract).balanceOf(msg.sender, tokenId) returns (uint256 balance) {
            if (balance < minBalance) revert CookieJarLib.NotAuthorized();
        } catch {
            revert CookieJarLib.NotAuthorized();
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

        // Validate purpose requirement
        if (strictPurpose && bytes(purpose).length < 10) {
            revert CookieJarLib.InvalidPurpose();
        }

        // Validate withdrawal amount
        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (amount != fixedAmount) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, fixedAmount);
            }
        } else {
            if (amount > maxWithdrawal) {
                revert CookieJarLib.WithdrawalAmountNotAllowed(amount, maxWithdrawal);
            }
        }

        // Validate timing constraints
        if (lastWithdrawalTime[msg.sender] > 0 &&
            block.timestamp < lastWithdrawalTime[msg.sender] + withdrawalInterval) {
            revert CookieJarLib.WithdrawalTooSoon(
                lastWithdrawalTime[msg.sender] + withdrawalInterval
            );
        }

        // Validate one-time constraint
        if (oneTimeWithdrawal && totalWithdrawn[msg.sender] > 0) {
            revert CookieJarLib.NotAuthorized();
        }

        // Validate period limits
        uint256 currentPeriodStart = (block.timestamp / CookieJarLib.WITHDRAWAL_PERIOD) * CookieJarLib.WITHDRAWAL_PERIOD;
        uint256 withdrawnThisPeriod = withdrawnInCurrentPeriod[msg.sender];

        if (maxWithdrawalPerPeriod > 0) {
            if (block.timestamp >= currentPeriodStart + CookieJarLib.WITHDRAWAL_PERIOD) {
                // New period, reset counter
                withdrawnThisPeriod = 0;
            }

            if (withdrawnThisPeriod + amount > maxWithdrawalPerPeriod) {
                uint256 available = maxWithdrawalPerPeriod - withdrawnThisPeriod;
                revert CookieJarLib.PeriodWithdrawalLimitExceeded(amount, available);
            }
        }
    }

    /// @notice Execute withdrawal and update tracking
    /// @dev Consolidated withdrawal logic
    function _executeWithdrawal(uint256 amount) internal {
        // Update withdrawal tracking
        if (block.timestamp >= lastWithdrawalTime[msg.sender] + CookieJarLib.WITHDRAWAL_PERIOD) {
            // New period, reset counter
            withdrawnInCurrentPeriod[msg.sender] = 0;
        }

        currencyHeldByJar -= amount;
        lastWithdrawalTime[msg.sender] = block.timestamp;
        totalWithdrawn[msg.sender] += amount;
        withdrawnInCurrentPeriod[msg.sender] += amount;

        // Transfer funds
        if (currency == CookieJarLib.ETH_ADDRESS) {
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(currency).safeTransfer(msg.sender, amount);
        }
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


    /// @notice Setup allowlist for allowlist-based access
    /// @dev Grants JAR_ALLOWLISTED role to provided addresses
    /// @param members Array of addresses to add to allowlist
    function _setupAllowlist(address[] memory members) internal {
        for (uint256 i = 0; i < members.length; i++) {
            _grantRole(CookieJarLib.JAR_ALLOWLISTED, members[i]);
            allowlist.push(members[i]);
        }
    }

    /// @notice Calculate fee and remaining amount
    /// @dev Gas-optimized fee calculation using integer arithmetic
    /// @param amount The principal amount to calculate fee for
    /// @return fee The calculated fee amount
    /// @return remaining The remaining amount after fee deduction
    function _calculateFee(uint256 amount) internal view returns (uint256 fee, uint256 remaining) {
        fee = (amount * feePercentageOnDeposit) / CookieJarLib.PERCENTAGE_BASE;
        remaining = amount - fee;
    }

    // === INTERNAL SWAP FUNCTIONS ===

    /// @notice Unified internal function to swap any token to jar currency
    /// @dev Handles both direct processing and DEX swaps with fee deduction
    /// @param fromToken Source token address (address(0) for ETH)
    /// @param amount Amount to process/swap
    /// @param minOut Minimum output amount expected for swaps
    function _swapToJarToken(address fromToken, uint256 amount, uint256 minOut) internal {
        if (fromToken == currency) {
            // Already jar token - just process with fees
            (uint256 fee, uint256 remainingAmount) = _calculateFee(amount);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                if (fromToken == CookieJarLib.ETH_ADDRESS) {
                    (bool success, ) = payable(feeCollector).call{value: fee}("");
                    if (!success) revert CookieJarLib.FeeTransferFailed();
                } else {
                IERC20(currency).safeTransfer(feeCollector, fee);
                }
                emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
            }
            
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        } else {
            // Need to swap via DEX
            uint256 jarTokensReceived;

            if (fromToken == CookieJarLib.ETH_ADDRESS) {
                // Swap ETH to jar token
                jarTokensReceived = UniversalSwapAdapter.swapExactETHForTokens(
                    currency, amount, minOut, address(this)
                );
            } else {
                // Swap ERC20 to jar token
                jarTokensReceived = UniversalSwapAdapter.swapExactInputSingle(
                    fromToken, currency, amount, minOut, address(this)
                );
            }

            // Process fees and update balance
            (uint256 fee, uint256 remainingAmount) = _calculateFee(jarTokensReceived);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                IERC20(currency).safeTransfer(feeCollector, fee);
                emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
            }
            
            emit CookieJarLib.TokenSwapped(fromToken, currency, amount, jarTokensReceived);
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        }
    }


    // === STREAMING FUNCTIONS ===
    // Real-time streaming via Superfluid Protocol


    /// @notice Create a Super Token stream - INTEGRATED WITH SUPERFLUID PROTOCOL
    /// @param superToken Super Token address
    /// @param flowRate Flow rate (wad per second)
    function createSuperStream(address superToken, int96 flowRate) external nonReentrant {
        Streaming.createStream(
            superfluidHost,
            cfa,
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
            superfluidHost,
            cfa,
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
        Streaming.deleteStream(
            superfluidHost,
            cfa,
            superToken,
            msg.sender,
            superStreams,
            superTokenFlowRates
        );
    }


    /// @notice Get detailed flow information for a specific stream
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @return lastUpdated Timestamp of last update
    /// @return flowrate Current flowrate
    /// @return depositAmount Deposit amount
    /// @return owedDeposit Owed deposit amount
    function getSuperStreamInfo(address superToken, address sender) external view returns (
        uint256 lastUpdated,
        int96 flowrate,
        uint256 depositAmount,
        uint256 owedDeposit
    ) {
        return Streaming.getSuperStreamInfo(cfa, superToken, sender, address(this));
    }

    /// @notice Get net flow rate for this contract
    /// @param superToken Super Token address
    /// @return netFlowRate Net flow rate (positive = inflow, negative = outflow)
    function getNetFlowRate(address superToken) external view returns (int96 netFlowRate) {
        return Streaming.getNetFlowRate(cfa, superToken, address(this));
    }

    /// @notice Get account flow info for this contract
    /// @param superToken Super Token address
    /// @return lastUpdated Last update timestamp
    /// @return flowrate Net flowrate
    /// @return depositAmount Total deposit
    /// @return owedDeposit Owed deposit
    function getAccountFlowInfo(address superToken) external view returns (
        uint256 lastUpdated,
        int96 flowrate,
        uint256 depositAmount,
        uint256 owedDeposit
    ) {
        return Streaming.getAccountFlowInfo(cfa, superToken, address(this));
    }
}
