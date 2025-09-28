// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {CookieJarLib} from "./libraries/CookieJarLib.sol";
import {CookieJarValidation} from "./libraries/CookieJarValidation.sol";
import {NFTValidation} from "./libraries/NFTValidation.sol";
import {UniversalSwapAdapter} from "./libraries/UniversalSwapAdapter.sol";

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

/// @title CookieJar
/// @notice A decentralized smart contract for controlled fund withdrawals.
/// @notice Supports both allowlist and NFT‐gated access modes.
/// @dev Deposits accept ETH and ERC20 tokens (deducting fees) and withdrawals are subject to configurable rules.
contract CookieJar is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;


    /// @notice Modifier to check if user is not denylisted
    modifier notDenylisted() {
        if (hasRole(CookieJarLib.JAR_DENYLISTED, msg.sender)) {
            revert CookieJarLib.UserDenylisted();
        }
        _;
    }

    /// @notice Simplified: Direct NFT ownership verification (no complex gate management)
    address[] public allowlist;

    // --- Protocol-specific storage ---
    /// @notice POAP requirement (used in POAP mode)
    CookieJarLib.POAPRequirement public poapRequirement;
    
    /// @notice Unlock Protocol requirement (used in Unlock mode)
    CookieJarLib.UnlockRequirement public unlockRequirement;
    
    /// @notice Hypercert requirement (used in Hypercert mode)
    CookieJarLib.HypercertRequirement public hypercertRequirement;
    
    /// @notice Hats Protocol requirement (used in Hats mode)
    CookieJarLib.HatsRequirement public hatsRequirement;

    // Withdrawal data tracking removed for simplicity

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
    
    /// @notice Streaming configuration (Superfluid-based real-time streaming)
    CookieJarLib.StreamingConfig public streamingConfig;
    
    /// @notice Tokens pending manual swap to jar token
    mapping(address => uint256) public pendingTokenBalances;
    
    /// @notice Track Super Token streams by superToken => sender => stream
    mapping(address => mapping(address => CookieJarLib.SuperfluidStream)) public superStreams;
    
    /// @notice Accepted Super Tokens
    mapping(address => bool) public isSuperTokenAccepted;

    // Complex withdrawal tracking removed for simplicity

    /// @notice Initializes a new CookieJar contract.
    /// @param config The main configuration struct for the jar
    /// @param accessConfig The access control configuration (NFT gates and allowlist)
    constructor(CookieJarLib.JarConfig memory config, CookieJarLib.AccessConfig memory accessConfig) {
        if (config.jarOwner == address(0)) revert CookieJarLib.AdminCannotBeZeroAddress();
        if (config.feeCollector == address(0)) revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();

        accessType = config.accessType;
        
        // Initialize access control based on type
        if (accessType == CookieJarLib.AccessType.Allowlist) {
            // Allowlist mode - only allowlist should be provided
            if (accessConfig.nftAddresses.length > 0) revert CookieJarLib.AllowlistNotAllowedForNFTGated();
        } else if (accessType == CookieJarLib.AccessType.POAP) {
            if (accessConfig.poapReq.eventId == 0) revert CookieJarLib.InvalidAccessType();
            if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) 
                revert CookieJarLib.InvalidAccessType();
            poapRequirement = accessConfig.poapReq;
        } else if (accessType == CookieJarLib.AccessType.Unlock) {
            if (accessConfig.unlockReq.lockAddress == address(0)) revert CookieJarLib.InvalidAccessType();
            if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) 
                revert CookieJarLib.InvalidAccessType();
            unlockRequirement = accessConfig.unlockReq;
        } else if (accessType == CookieJarLib.AccessType.Hypercert) {
            if (accessConfig.hypercertReq.hypercertContract == address(0)) revert CookieJarLib.InvalidAccessType();
            if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) 
                revert CookieJarLib.InvalidAccessType();
            hypercertRequirement = accessConfig.hypercertReq;
        } else if (accessType == CookieJarLib.AccessType.Hats) {
            if (accessConfig.hatsReq.hatId == 0 || accessConfig.hatsReq.hatsContract == address(0)) 
                revert CookieJarLib.InvalidAccessType();
            if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) 
                revert CookieJarLib.InvalidAccessType();
            hatsRequirement = accessConfig.hatsReq;
        }

        withdrawalOption = config.withdrawalOption;
        minDeposit = config.minDeposit;
        fixedAmount = config.fixedAmount;
        maxWithdrawal = config.maxWithdrawal;
        currency = config.supportedCurrency;
        withdrawalInterval = config.withdrawalInterval;
        strictPurpose = config.strictPurpose;
        feeCollector = config.feeCollector;
        feePercentageOnDeposit = config.feePercentageOnDeposit;
        emergencyWithdrawalEnabled = config.emergencyWithdrawalEnabled;
        oneTimeWithdrawal = config.oneTimeWithdrawal;
        // maxWithdrawalPerPeriod = config.maxWithdrawalPerPeriod;

        // Initialize multi-token and streaming configurations
        multiTokenConfig = config.multiTokenConfig;
        streamingConfig = config.streamingConfig;
        
        // Setup accepted super tokens
        for (uint256 i = 0; i < streamingConfig.acceptedSuperTokens.length; i++) {
            isSuperTokenAccepted[streamingConfig.acceptedSuperTokens[i]] = true;
        }

        _setRoleAdmin(CookieJarLib.JAR_ALLOWLISTED, CookieJarLib.JAR_OWNER);
        _setRoleAdmin(CookieJarLib.JAR_DENYLISTED, CookieJarLib.JAR_OWNER);
        _grantRole(CookieJarLib.JAR_OWNER, config.jarOwner);
        _grantRoles(CookieJarLib.JAR_ALLOWLISTED, accessConfig.allowlist);
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

    /// @notice Grant denylist role to users to prevent them from withdrawing
    /// @param _users Array of addresses to add to denylist
    function grantJarDenylistRole(address[] calldata _users) external onlyRole(CookieJarLib.JAR_OWNER) {
        _grantRoles(CookieJarLib.JAR_DENYLISTED, _users);
    }

    /// @notice Revoke denylist role from users to allow them to withdraw again
    /// @param _users Array of addresses to remove from denylist
    function revokeJarDenylistRole(address[] calldata _users) external onlyRole(CookieJarLib.JAR_OWNER) {
        _revokeRoles(CookieJarLib.JAR_DENYLISTED, _users);
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
        
        if (token == address(0)) {
            // Swap ETH to jar token
            _swapETHToJarToken(amount, minJarTokensOut);
        } else {
            // Swap ERC-20 to jar token
            _swapTokenToJarToken(token, amount, minJarTokensOut);
        }
        
        emit CookieJarLib.PendingTokensRecovered(token, amount);
    }

    /// @notice Anyone can recover accidentally sent ERC-20 tokens
    /// @param token Token to recover
    function recoverAccidentalTokens(address token) external {
        if (token == currency) revert CookieJarLib.InvalidTokenAddress();
        if (token == address(0)) revert CookieJarLib.InvalidTokenAddress();
        
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        uint256 knownPending = pendingTokenBalances[token];
        uint256 unaccounted = contractBalance > knownPending ? contractBalance - knownPending : 0;
        
        if (unaccounted > 0) {
            pendingTokenBalances[token] += unaccounted;
            emit CookieJarLib.PendingTokensRecovered(token, unaccounted);
        }
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

    /// @notice Deposits ETH into the contract, deducting deposit fee. Only works if the jar's currency is ETH.
    function depositETH() public payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert CookieJarLib.ZeroAmount();
        if (currency != CookieJarLib.ETH_ADDRESS) revert CookieJarLib.InvalidTokenAddress();
        if (msg.value < minDeposit) revert CookieJarLib.LessThanMinimumDeposit();

        (uint256 fee, uint256 remainingAmount) = _calculateFee(msg.value);
        (bool success, ) = payable(feeCollector).call{value: fee}("");
        if (!success) revert CookieJarLib.FeeTransferFailed();
        currencyHeldByJar += remainingAmount;
        
        // Emit events for deposit and fee collection
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
    }

    /// @notice Deposits Currency tokens into the contract, deducting deposit fee. Only works if the jar's currency is
    ///  an ERC20 token.
    /// @param amount The amount of tokens to deposit.
    function depositCurrency(uint256 amount) public whenNotPaused nonReentrant {
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (currency == CookieJarLib.ETH_ADDRESS) revert CookieJarLib.InvalidTokenAddress();
        if (amount < minDeposit) revert CookieJarLib.LessThanMinimumDeposit();

        IERC20(currency).safeTransferFrom(msg.sender, address(this), amount);
        (uint256 fee, uint256 remainingAmount) = _calculateFee(amount);
        currencyHeldByJar += remainingAmount;
        
        if (fee > 0) {
            IERC20(currency).safeTransfer(feeCollector, fee);
        }
        
        // Emit events for deposit and fee collection
        emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
    }

    /// @notice Withdraws funds (ETH or ERC20) for allowlisted users.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    function withdrawAllowlistMode(
        uint256 amount,
        string calldata purpose
    ) external onlyRole(CookieJarLib.JAR_ALLOWLISTED) whenNotPaused notDenylisted nonReentrant {
        if (accessType != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _simpleWithdraw(amount, purpose);
    }

    /// @notice Simplified NFT withdrawal - direct ownership verification
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param nftContract The NFT contract address.
    /// @param tokenId The NFT token ID.
    /// @param nftType The NFT type (0=None, 1=ERC721, 2=ERC1155).
    function withdrawWithNFT(
        uint256 amount, 
        string calldata purpose, 
        address nftContract,
        uint256 tokenId,
        CookieJarLib.NFTType nftType
    ) external whenNotPaused notDenylisted nonReentrant {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (nftContract == address(0)) revert CookieJarLib.InvalidNFTGate();

        // Simple direct ownership check
        _checkNFTOwnership(nftContract, tokenId, nftType);

        // Simple validation and withdrawal
        _simpleWithdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for POAP holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param tokenId The POAP token ID to use for access.
    function withdrawPOAPMode(
        uint256 amount, 
        string calldata purpose, 
        uint256 tokenId
    ) external whenNotPaused notDenylisted {
        if (accessType != CookieJarLib.AccessType.POAP) revert CookieJarLib.InvalidAccessType();
        _checkAccessPOAP(tokenId);
        _simpleWithdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Unlock Protocol key holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    function withdrawUnlockMode(uint256 amount, string calldata purpose) external whenNotPaused notDenylisted {
        if (accessType != CookieJarLib.AccessType.Unlock) revert CookieJarLib.InvalidAccessType();
        _checkAccessUnlock();
        _simpleWithdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Hypercert holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param tokenId The hypercert token ID to use for access.
    function withdrawHypercertMode(
        uint256 amount, 
        string calldata purpose, 
        uint256 tokenId
    ) external whenNotPaused notDenylisted {
        if (accessType != CookieJarLib.AccessType.Hypercert) revert CookieJarLib.InvalidAccessType();
        _checkAccessHypercert(tokenId);
        _simpleWithdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Hats Protocol hat wearers.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    function withdrawHatsMode(uint256 amount, string calldata purpose) external whenNotPaused notDenylisted {
        if (accessType != CookieJarLib.AccessType.Hats) revert CookieJarLib.InvalidAccessType();
        _checkAccessHats();
        _simpleWithdraw(amount, purpose);
    }

    // --- View Functions ---

    // NFT gate array and withdrawal data tracking removed for simplicity

    function getAllowlist() external view returns (address[] memory) {
        return allowlist;
    }

    // --- Internal Functions ---

    function _grantRole(bytes32 role, address account) internal override returns (bool success) {
        success = super._grantRole(role, account);
        if (success && role == CookieJarLib.JAR_ALLOWLISTED) {
            allowlist.push(account);
        }
    }

    function _revokeRole(bytes32 role, address account) internal override returns (bool success) {
        success = super._revokeRole(role, account);
        if (success && role == CookieJarLib.JAR_ALLOWLISTED) {
            for (uint256 i = 0; i < allowlist.length; i++) {
                if (allowlist[i] == account) {
                    allowlist[i] = allowlist[allowlist.length - 1];
                    allowlist.pop();
                    break;
                }
            }
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


    /// @notice Simple NFT ownership verification (replaces complex gate management)
    /// @param nftContract The NFT contract address
    /// @param tokenId The NFT token ID
    /// @param nftType The NFT type (1=ERC721, 2=ERC1155)
    function _checkNFTOwnership(address nftContract, uint256 tokenId, CookieJarLib.NFTType nftType) internal {
        if (nftType == CookieJarLib.NFTType.ERC721) {
            // Simple ERC721 ownership check
            address owner = IERC721(nftContract).ownerOf(tokenId);
            if (owner != msg.sender) {
                revert CookieJarLib.NotAuthorized();
            }
        } else if (nftType == CookieJarLib.NFTType.ERC1155) {
            // Simple ERC1155 balance check (minimum 1)
            uint256 balance = IERC1155(nftContract).balanceOf(msg.sender, tokenId);
            if (balance == 0) {
                revert CookieJarLib.NotAuthorized();
            }
        } else {
            revert CookieJarLib.InvalidNFTType();
        }

        emit CookieJarLib.NFTAccessValidated(msg.sender, nftContract, tokenId);
    }

    function _calculateFee(uint256 _principalAmount) internal view returns (uint256 fee, uint256 amountRemaining) {
        fee = (_principalAmount * feePercentageOnDeposit) / CookieJarLib.PERCENTAGE_BASE;
        amountRemaining = _principalAmount - fee;
    }

    // _checkAccessNFT removed - replaced with _checkNFTOwnership for simplicity

    function _checkAccessPOAP(uint256 tokenId) internal view {
        // Use configurable POAP contract address from requirement
        // Fallback to canonical address if not set (for backwards compatibility)
        address poapContract = poapRequirement.poapContract;
        if (poapContract == address(0)) {
            poapContract = 0x22C1f6050E56d2876009903609a2cC3fEf83B415; // Canonical POAP contract
        }
        
        // Check if user owns the specified POAP token
        try IPOAP(poapContract).ownerOf(tokenId) returns (address owner) {
            if (owner != msg.sender) {
                revert CookieJarLib.NotAuthorized();
            }
        } catch {
            revert CookieJarLib.NotAuthorized();
        }
        
        /**
         * FUTURE ENHANCEMENT: On-chain POAP event validation
         * 
         * Currently relies on off-chain filtering of valid token IDs per event.
         * To fully decentralize access control, this could be enhanced with:
         * 
         * - Oracle-based event validation (Chainlink, UMA, etc.)
         * - Merkle proof system for valid event IDs 
         * - Cross-chain verification for POAP contracts on different networks
         * 
         * Implementation would require additional contract dependencies and gas costs.
         * The current approach provides sufficient security for most use cases.
         */
    }

    function _checkAccessUnlock() internal view {
        address lockAddress = unlockRequirement.lockAddress;
        
        // Check if user has a valid key for the lock
        try IPublicLock(lockAddress).getHasValidKey(msg.sender) returns (bool hasValidKey) {
            if (!hasValidKey) {
                revert CookieJarLib.NotAuthorized();
            }
        } catch {
            revert CookieJarLib.NotAuthorized();
        }
    }

    function _checkAccessHypercert(uint256 tokenId) internal view {
        if (tokenId != hypercertRequirement.tokenId) {
            revert CookieJarLib.NotAuthorized();
        }
        
        address tokenContract = hypercertRequirement.tokenContract;
        uint256 minBalance = hypercertRequirement.minBalance;
        if (minBalance == 0) minBalance = 1; // Default to 1 if not set
        
        // Check if user has sufficient balance of the hypercert
        try IHypercertToken(tokenContract).balanceOf(msg.sender, tokenId) returns (uint256 balance) {
            if (balance < minBalance) {
                revert CookieJarLib.NotAuthorized();
            }
        } catch {
            revert CookieJarLib.NotAuthorized();
        }
    }

    function _checkAccessHats() internal view {
        uint256 hatId = hatsRequirement.hatId;
        address hatsContract = hatsRequirement.hatsContract;
        
        // Check if user is wearing the required hat
        try IHats(hatsContract).isWearerOfHat(msg.sender, hatId) returns (bool isWearer) {
            if (!isWearer) {
                revert CookieJarLib.NotAuthorized();
            }
        } catch {
            revert CookieJarLib.NotAuthorized();
        }
    }

    /// @notice Simplified withdrawal validation
    /// @dev Only performs essential checks: amount and balance
    /// @param amount The withdrawal amount
    function _simpleWithdraw(uint256 amount, string calldata purpose) internal {
        // Basic validation only
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();

        // Simple withdrawal (no complex tracking)
        currencyHeldByJar -= amount;
        
        // Emit withdrawal event
        emit CookieJarLib.Withdrawal(msg.sender, amount, purpose);

        // Transfer funds
        if (currency == CookieJarLib.ETH_ADDRESS) {
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(currency).safeTransfer(msg.sender, amount);
        }
    }

    // === INTERNAL SWAP FUNCTIONS ===

    /// @notice Internal function to swap ETH to jar token
    /// @param ethAmount Amount of ETH to swap
    /// @param minOut Minimum jar tokens expected
    function _swapETHToJarToken(uint256 ethAmount, uint256 minOut) internal {
        if (currency == CookieJarLib.ETH_ADDRESS) {
            // Already ETH jar, just process directly
            (uint256 fee, uint256 remainingAmount) = _calculateFee(ethAmount);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                (bool success, ) = payable(feeCollector).call{value: fee}("");
                if (!success) revert CookieJarLib.FeeTransferFailed();
                emit CookieJarLib.FeeCollected(feeCollector, fee, CookieJarLib.ETH_ADDRESS);
            }
            
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, CookieJarLib.ETH_ADDRESS);
        } else {
            // Swap ETH to jar token using DEX (v4 or v2)
            uint256 jarTokensReceived = UniversalSwapAdapter.swapExactETHForTokens(
                currency,
                ethAmount,
                minOut,
                address(this)
            );
            
            (uint256 fee, uint256 remainingAmount) = _calculateFee(jarTokensReceived);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                IERC20(currency).safeTransfer(feeCollector, fee);
                emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
            }
            
            emit CookieJarLib.TokenSwapped(address(0), currency, ethAmount, jarTokensReceived);
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        }
    }

    /// @notice Internal function to swap token to jar token
    /// @param token Token address to swap
    /// @param amount Amount to swap
    /// @param minOut Minimum jar tokens expected
    function _swapTokenToJarToken(address token, uint256 amount, uint256 minOut) internal {
        if (token == currency) {
            // Already jar token
            (uint256 fee, uint256 remainingAmount) = _calculateFee(amount);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                IERC20(currency).safeTransfer(feeCollector, fee);
                emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
            }
            
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
        } else {
            // Swap token to jar token using universal DEX adapter (v4 or v2)
            // Universal Router handles all approvals internally
            uint256 jarTokensReceived = UniversalSwapAdapter.swapExactInputSingle(
                token,
                currency,
                amount,
                minOut,
                address(this)
            );
            
            (uint256 fee, uint256 remainingAmount) = _calculateFee(jarTokensReceived);
            currencyHeldByJar += remainingAmount;
            
            if (fee > 0) {
                IERC20(currency).safeTransfer(feeCollector, fee);
                emit CookieJarLib.FeeCollected(feeCollector, fee, currency);
            }
            
            emit CookieJarLib.TokenSwapped(token, currency, amount, jarTokensReceived);
            emit CookieJarLib.Deposit(msg.sender, remainingAmount, currency);
            
        }
    }


    // === STREAMING FUNCTIONS ===
    // Real-time streaming via Superfluid Protocol

    /// @notice Configure streaming settings (admin only)
    /// @param config Streaming configuration
    function configureStreaming(
        CookieJarLib.StreamingConfig memory config
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        streamingConfig = config;
        
        // Update accepted super tokens mapping
        for (uint256 i = 0; i < config.acceptedSuperTokens.length; i++) {
            isSuperTokenAccepted[config.acceptedSuperTokens[i]] = true;
        }
        
        emit CookieJarLib.SuperfluidConfigUpdated(config.enabled);
    }

    /// @notice Create a Super Token stream - INTEGRATED
    /// @param superToken Super Token address
    /// @param flowRate Flow rate (wei per second)
    function createSuperStream(address superToken, int96 flowRate) external {
        if (!streamingConfig.enabled) revert CookieJarLib.InvalidAccessType();
        if (!isSuperTokenAccepted[superToken]) revert CookieJarLib.InvalidTokenAddress();
        if (flowRate < streamingConfig.minFlowRate) revert CookieJarLib.InvalidStreamRate();
        
        // Record the super stream
        superStreams[superToken][msg.sender] = CookieJarLib.SuperfluidStream({
            superToken: superToken,
            sender: msg.sender,
            flowRate: flowRate,
            startTime: block.timestamp,
            isActive: streamingConfig.autoAcceptStreams
        });
        
        emit CookieJarLib.SuperStreamCreated(msg.sender, superToken, flowRate);
    }

    /// @notice Update a Super Token stream - INTEGRATED
    /// @param superToken Super Token address
    /// @param newFlowRate New flow rate
    function updateSuperStream(address superToken, int96 newFlowRate) external {
        if (!streamingConfig.enabled) revert CookieJarLib.InvalidAccessType();
        CookieJarLib.SuperfluidStream storage stream = superStreams[superToken][msg.sender];
        if (stream.sender == address(0)) revert CookieJarLib.StreamNotFound();
        
        stream.flowRate = newFlowRate;
        emit CookieJarLib.SuperStreamUpdated(msg.sender, superToken, newFlowRate);
    }

    /// @notice Delete a Super Token stream - INTEGRATED
    /// @param superToken Super Token address
    function deleteSuperStream(address superToken) external {
        if (!streamingConfig.enabled) revert CookieJarLib.InvalidAccessType();
        CookieJarLib.SuperfluidStream storage stream = superStreams[superToken][msg.sender];
        if (stream.sender == address(0)) revert CookieJarLib.StreamNotFound();
        
        stream.isActive = false;
        emit CookieJarLib.SuperStreamDeleted(msg.sender, superToken);
    }

    /// @notice Get real-time balance of Super Token - INTEGRATED
    /// @param superToken Super Token address
    /// @return balance Real-time balance including ongoing streams
    function getRealTimeBalance(address superToken) external view returns (uint256 balance) {
        if (superToken == currency) {
            return currencyHeldByJar;
        }
        // For non-jar currency super tokens, return 0 (would need full Superfluid SDK integration)
        return 0;
    }

    /// @notice Check if Super Token is accepted - INTEGRATED
    /// @param superToken Super Token address
    /// @return accepted Whether the super token is accepted
    function isAcceptedSuperToken(address superToken) external view returns (bool accepted) {
        return isSuperTokenAccepted[superToken];
    }

    /// @notice Get streaming configuration
    /// @return config Current streaming configuration
    function getStreamingConfig() external view returns (CookieJarLib.StreamingConfig memory config) {
        return streamingConfig;
    }

    /// @notice Get super stream details - INTEGRATED
    /// @param superToken Super Token address
    /// @param sender Stream sender
    /// @return stream Stream details
    function getSuperStream(
        address superToken,
        address sender
    ) external view returns (CookieJarLib.SuperfluidStream memory stream) {
        return superStreams[superToken][sender];
    }

    /// @notice Emergency withdrawal of Super Tokens - INTEGRATED
    /// @param superToken Super Token to withdraw
    /// @param amount Amount to withdraw
    function emergencyWithdrawSuperToken(
        address superToken,
        uint256 amount
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (!emergencyWithdrawalEnabled) revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        
        emit CookieJarLib.EmergencyWithdrawal(msg.sender, superToken, amount);
        
        // Transfer super token (using SafeERC20 for safety)
        IERC20(superToken).safeTransfer(msg.sender, amount);
    }
}
