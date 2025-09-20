// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import {CookieJarLib} from "./libraries/CookieJarLib.sol";
import {CookieJarValidation} from "./libraries/CookieJarValidation.sol";
import {NFTValidation} from "./libraries/NFTValidation.sol";

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
contract CookieJar is AccessControl, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Array of approved NFT gates (used in NFTGated mode).
    CookieJarLib.NFTGate[] public nftGates;

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

    CookieJarLib.WithdrawalData[] public withdrawalData;

    /// @notice Mapping for optimized NFT gate lookup.
    mapping(address => CookieJarLib.NFTType) private _nftGateMapping;
    /// @notice Mapping for O(1) NFT gate index lookup (gas optimization)
    mapping(address => uint256) private _nftGateIndex;

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
    /// @notice Maximum withdrawal allowed per period (0 = unlimited)
    uint256 public maxWithdrawalPerPeriod;
    /// @notice Tracking withdrawals per user per period
    mapping(address => uint256) public currentPeriodStart;
    mapping(address => uint256) public withdrawnInCurrentPeriod;

    // --- Timelock Mappings ---
    /// @notice Stores the last withdrawal timestamp for each allowlisted address for allowlist mode.
    mapping(address user => uint256 lastWithdrawalTimestamp) public lastWithdrawalAllowlist;
    /// @notice Stores the last withdrawal timestamp for each NFT token for NFT-gated mode.
    mapping(address nftGate => mapping(uint256 tokenId => uint256 lastWithdrawlTimestamp)) public lastWithdrawalNFT;
    /// @notice Stores the last withdrawal timestamp for each POAP token for POAP mode.
    mapping(uint256 tokenId => uint256 lastWithdrawalTimestamp) public lastWithdrawalPOAP;
    /// @notice Stores the last withdrawal timestamp for each user for Unlock/Hypercert/Hats modes.
    mapping(address user => uint256 lastWithdrawalTimestamp) public lastWithdrawalProtocol;

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
        } else if (accessType == CookieJarLib.AccessType.NFTGated) {
            if (accessConfig.nftAddresses.length == 0) revert CookieJarLib.NoNFTAddressesProvided();
            if (accessConfig.nftAddresses.length != accessConfig.nftTypes.length)
                revert CookieJarLib.NFTArrayLengthMismatch();
            if (accessConfig.allowlist.length > 0) revert CookieJarLib.AllowlistNotAllowedForNFTGated();
            for (uint256 i = 0; i < accessConfig.nftAddresses.length; i++) {
                _addNFTGate(accessConfig.nftAddresses[i], accessConfig.nftTypes[i]);
            }
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
            if (accessConfig.hypercertReq.tokenContract == address(0)) revert CookieJarLib.InvalidAccessType();
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
        maxWithdrawalPerPeriod = config.maxWithdrawalPerPeriod;

        _setRoleAdmin(CookieJarLib.JAR_ALLOWLISTED, CookieJarLib.JAR_OWNER);
        _grantRole(CookieJarLib.JAR_OWNER, config.jarOwner);
        _grantRoles(CookieJarLib.JAR_ALLOWLISTED, accessConfig.allowlist);
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

    /// @notice Updates the maximum withdrawal limit per period
    /// @param _newLimit The new maximum withdrawal limit per period (0 = unlimited)
    function updatePeriodWithdrawalLimit(uint256 _newLimit) external onlyRole(CookieJarLib.JAR_OWNER) {
        maxWithdrawalPerPeriod = _newLimit;
        emit CookieJarLib.PeriodWithdrawalLimitUpdated(_newLimit);
    }

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

    /// @notice Adds a new NFT gate if it is not already registered.
    /// @param _nftAddress The NFT contract address.
    /// @param _nftType The NFT type.
    function addNFTGate(address _nftAddress, CookieJarLib.NFTType _nftType) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (nftGates.length >= CookieJarLib.MAX_NFT_GATES) revert CookieJarLib.TooManyNFTGates();
        _addNFTGate(_nftAddress, _nftType);
    }

    /// @notice Removes an NFT gate.
    /// @param _nftAddress The NFT contract address.
    function removeNFTGate(address _nftAddress) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (_nftGateMapping[_nftAddress] == CookieJarLib.NFTType.None) revert CookieJarLib.NFTGateNotFound();

        // Use the index mapping for O(1) lookup instead of loop
        uint256 gateIndex = _nftGateIndex[_nftAddress];
        uint256 lastIndex = nftGates.length - 1;
        
        // If not the last element, swap with last and update its index
        if (gateIndex != lastIndex) {
            address lastGateAddress = nftGates[lastIndex].nftAddress;
            nftGates[gateIndex] = nftGates[lastIndex];
            _nftGateIndex[lastGateAddress] = gateIndex;
        }
        
        // Remove the last element and clean up mappings
        nftGates.pop();
        delete _nftGateMapping[_nftAddress];
        delete _nftGateIndex[_nftAddress];

        emit CookieJarLib.NFTGateRemoved(_nftAddress);
    }

    // TEMPORARILY REMOVED: Advanced batch operations to reduce contract size
    // Will be re-enabled in future version via proxy upgrades
    /*
    // TEMPORARILY REMOVED: Batch operations to reduce contract size under 24KB
    function addNFTGatesBatch(
        address[] calldata nftAddresses,
        CookieJarLib.NFTType[] calldata nftTypes
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (nftAddresses.length != nftTypes.length) revert CookieJarLib.ArrayLengthMismatch();
        if (nftAddresses.length == 0) revert CookieJarLib.ArrayLengthMismatch();
        
        // Enhanced batch size limits for gas safety
        if (nftAddresses.length > CookieJarLib.MAX_BATCH_SIZE) revert CookieJarLib.ArrayLengthMismatch();
        if (nftGates.length + nftAddresses.length > CookieJarLib.MAX_NFT_GATES) revert CookieJarLib.TooManyNFTGates();
        
        // Pre-validate all inputs before making any changes (atomic operation)
        for (uint256 i = 0; i < nftAddresses.length; i++) {
            address nftAddress = nftAddresses[i];
            CookieJarLib.NFTType nftType = nftTypes[i];
            
            // Input validation
            if (nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
            if (nftType == CookieJarLib.NFTType.None) revert CookieJarLib.InvalidNFTType();
            if (_nftGateMapping[nftAddress] != CookieJarLib.NFTType.None) revert CookieJarLib.DuplicateNFTGate();
            
            // Check for duplicates within the batch
            for (uint256 j = i + 1; j < nftAddresses.length; j++) {
                if (nftAddresses[i] == nftAddresses[j]) revert CookieJarLib.DuplicateNFTGate();
            }
        }
        
        // Add all gates in batch (all validations passed)
        for (uint256 i = 0; i < nftAddresses.length; i++) {
            address nftAddress = nftAddresses[i];
            CookieJarLib.NFTType nftType = nftTypes[i];
            
            // Create gate struct
            CookieJarLib.NFTGate memory gate = CookieJarLib.NFTGate({
                nftAddress: nftAddress, 
                nftType: nftType
            });
            
            // Add to storage
            uint256 newIndex = nftGates.length;
            nftGates.push(gate);
            _nftGateMapping[nftAddress] = nftType;
            _nftGateIndex[nftAddress] = newIndex;
            
            emit CookieJarLib.NFTGateAdded(nftAddress, nftType);
        }
        
        // Convert NFTType[] to uint8[] for batch event emission
        uint8[] memory nftTypesUint8 = new uint8[](nftTypes.length);
        for (uint256 i = 0; i < nftTypes.length; i++) {
            nftTypesUint8[i] = uint8(nftTypes[i]);
        }
        
        emit CookieJarLib.NFTGatesBatchAdded(nftAddresses, nftTypesUint8);
    }
    */
    
    /*
    // TEMPORARILY REMOVED: Complex batch removal function with quicksort
    function removeNFTGatesBatch(
        address[] calldata nftAddresses
    ) external onlyRole(CookieJarLib.JAR_OWNER) {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (nftAddresses.length == 0) revert CookieJarLib.ArrayLengthMismatch();
        
        // Enhanced batch size limits for gas safety
        if (nftAddresses.length > CookieJarLib.MAX_BATCH_SIZE) revert CookieJarLib.ArrayLengthMismatch();
        
        // Pre-validate all gates exist and collect indices (atomic operation)
        uint256[] memory indicesToRemove = new uint256[](nftAddresses.length);
        
        for (uint256 i = 0; i < nftAddresses.length; i++) {
            address nftAddress = nftAddresses[i];
            
            // Input validation
            if (nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
            
            // Check if gate exists
            if (_nftGateMapping[nftAddress] == CookieJarLib.NFTType.None) {
                revert CookieJarLib.NFTGateNotFound();
            }
            
            // Check for duplicates within the batch
            for (uint256 j = i + 1; j < nftAddresses.length; j++) {
                if (nftAddresses[i] == nftAddresses[j]) revert CookieJarLib.DuplicateNFTGate();
            }
            
            indicesToRemove[i] = _nftGateIndex[nftAddress];
        }
        
        // Sort indices in descending order to remove from highest index first
        // This prevents index corruption during batch removal
        _quickSortDescending(indicesToRemove, 0, int256(indicesToRemove.length - 1));
        
        // Remove gates in descending index order (critical for correctness)
        for (uint256 i = 0; i < indicesToRemove.length; i++) {
            uint256 gateIndex = indicesToRemove[i];
            uint256 lastIndex = nftGates.length - 1;
            
            // Get the address at this index
            address nftAddress = nftGates[gateIndex].nftAddress;
            
            // If not the last element, swap with last and update its index
            if (gateIndex != lastIndex) {
                address lastGateAddress = nftGates[lastIndex].nftAddress;
                nftGates[gateIndex] = nftGates[lastIndex];
                _nftGateIndex[lastGateAddress] = gateIndex;
            }
            
            // Remove the last element and clean up mappings
            nftGates.pop();
            delete _nftGateMapping[nftAddress];
            delete _nftGateIndex[nftAddress];
            
            emit CookieJarLib.NFTGateRemoved(nftAddress);
        }
        
        emit CookieJarLib.NFTGatesBatchRemoved(nftAddresses);
    }
    
    /// @notice Internal function to sort array in descending order using quicksort
    /// @param arr Array to sort
    /// @param left Left boundary
    /// @param right Right boundary
    function _quickSortDescending(uint256[] memory arr, int256 left, int256 right) internal pure {
        if (left < right) {
            int256 pi = _partition(arr, left, right);
            _quickSortDescending(arr, left, pi - 1);
            _quickSortDescending(arr, pi + 1, right);
        }
    }
    
    /// @notice Internal partition function for quicksort (descending order)
    /// @param arr Array to partition
    /// @param left Left boundary
    /// @param right Right boundary
    /// @return Partition index
    function _partition(uint256[] memory arr, int256 left, int256 right) internal pure returns (int256) {
        uint256 pivot = arr[uint256(right)];
        int256 i = left - 1;
        
        for (int256 j = left; j < right; j++) {
            if (arr[uint256(j)] > pivot) { // Greater than for descending order
                i++;
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
            }
        }
        
        (arr[uint256(i + 1)], arr[uint256(right)]) = (arr[uint256(right)], arr[uint256(i + 1)]);
        return i + 1;
    }
    */

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

    /// @notice Allows the admin to perform an emergency withdrawal of funds from the jar.
    /// @param token If address(3) then ETH is withdrawn; otherwise, ERC20 token address.
    /// @param amount The amount to withdraw.
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(CookieJarLib.JAR_OWNER) {
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
    function depositETH() public payable whenNotPaused {
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
    function depositCurrency(uint256 amount) public whenNotPaused {
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        if (currency == CookieJarLib.ETH_ADDRESS) revert CookieJarLib.InvalidTokenAddress();
        if (amount < minDeposit) revert CookieJarLib.LessThanMinimumDeposit();

        IERC20(currency).safeTransferFrom(msg.sender, address(this), amount);
        (uint256 fee, uint256 remainingAmount) = _calculateFee(amount);
        currencyHeldByJar += remainingAmount;
        bool success = IERC20(currency).transfer(feeCollector, fee);
        if (!success) revert CookieJarLib.FeeTransferFailed();
        
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
    ) external onlyRole(CookieJarLib.JAR_ALLOWLISTED) whenNotPaused {
        if (accessType != CookieJarLib.AccessType.Allowlist) revert CookieJarLib.InvalidAccessType();
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalAllowlist[msg.sender]);
        lastWithdrawalAllowlist[msg.sender] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for NFT-gated users.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param gateAddress The NFT contract address used for gating.
    /// @param tokenId The NFT token id used for gating.
    function withdrawNFTMode(uint256 amount, string calldata purpose, address gateAddress, uint256 tokenId) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (gateAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        _checkAccessNFT(gateAddress, tokenId);
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalNFT[gateAddress][tokenId]);
        lastWithdrawalNFT[gateAddress][tokenId] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice Enhanced NFT withdrawal with ERC1155 balance proof protection
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    /// @param gateAddress The NFT contract address used for gating
    /// @param tokenId The NFT token ID used for gating
    /*
    // TEMPORARILY REMOVED: Advanced withdrawal functions to reduce contract size  
    function withdrawNFTModeWithBalanceProof(
        uint256 amount,
        string calldata purpose, 
        address gateAddress, 
        uint256 tokenId,
        uint256 expectedMinBalance,
        uint256 blockNumberSnapshot
    ) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (gateAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        
        // Enhanced validation with balance proof protection
        _checkAccessNFTWithBalanceProof(gateAddress, tokenId, expectedMinBalance, blockNumberSnapshot);
        
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalNFT[gateAddress][tokenId]);
        lastWithdrawalNFT[gateAddress][tokenId] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice NFT withdrawal with quantity-based requirements for ERC1155 tokens
    /// @param amount The amount to withdraw
    /// @param purpose A description for the withdrawal
    /// @param gateAddress The NFT contract address used for gating
    /// @param tokenId The NFT token ID used for gating
    /// @param requiredNFTQuantity The minimum NFT quantity required for this withdrawal
    function withdrawNFTModeWithQuantity(
        uint256 amount,
        string calldata purpose,
        address gateAddress,
        uint256 tokenId,
        uint256 requiredNFTQuantity
    ) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.NFTGated) revert CookieJarLib.InvalidAccessType();
        if (gateAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        
        // Standard NFT access check with gas protection
        _checkAccessNFT(gateAddress, tokenId);
        
        // Additional quantity validation for ERC1155 tokens
        CookieJarLib.NFTType nftType = _nftGateMapping[gateAddress];
        if (nftType == CookieJarLib.NFTType.ERC1155 && requiredNFTQuantity > 0) {
            uint256 userBalance = IERC1155(gateAddress).balanceOf(msg.sender, tokenId);
            if (userBalance < requiredNFTQuantity) {
                revert CookieJarLib.InsufficientNFTBalance();
            }
        } else if (nftType == CookieJarLib.NFTType.ERC721 && requiredNFTQuantity > 1) {
            // ERC721 tokens can only have quantity of 1
            revert CookieJarLib.QuantityValidationNotSupported();
        }
        
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalNFT[gateAddress][tokenId]);
        lastWithdrawalNFT[gateAddress][tokenId] = block.timestamp;
        _withdraw(amount, purpose);
    }
    */

    /// @notice Withdraws funds (ETH or ERC20) for POAP holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param tokenId The POAP token ID to use for access.
    function withdrawPOAPMode(uint256 amount, string calldata purpose, uint256 tokenId) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.POAP) revert CookieJarLib.InvalidAccessType();
        _checkAccessPOAP(tokenId);
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalPOAP[tokenId]);
        lastWithdrawalPOAP[tokenId] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Unlock Protocol key holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    function withdrawUnlockMode(uint256 amount, string calldata purpose) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.Unlock) revert CookieJarLib.InvalidAccessType();
        _checkAccessUnlock();
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalProtocol[msg.sender]);
        lastWithdrawalProtocol[msg.sender] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Hypercert holders.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    /// @param tokenId The hypercert token ID to use for access.
    function withdrawHypercertMode(uint256 amount, string calldata purpose, uint256 tokenId) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.Hypercert) revert CookieJarLib.InvalidAccessType();
        _checkAccessHypercert(tokenId);
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalProtocol[msg.sender]);
        lastWithdrawalProtocol[msg.sender] = block.timestamp;
        _withdraw(amount, purpose);
    }

    /// @notice Withdraws funds (ETH or ERC20) for Hats Protocol hat wearers.
    /// @param amount The amount to withdraw.
    /// @param purpose A description for the withdrawal.
    function withdrawHatsMode(uint256 amount, string calldata purpose) external whenNotPaused {
        if (accessType != CookieJarLib.AccessType.Hats) revert CookieJarLib.InvalidAccessType();
        _checkAccessHats();
        _checkAndUpdateWithdraw(amount, purpose, lastWithdrawalProtocol[msg.sender]);
        lastWithdrawalProtocol[msg.sender] = block.timestamp;
        _withdraw(amount, purpose);
    }

    // --- View Functions ---

    /// @notice Returns the NFT gates array.
    /// @return CookieJarLib.NFTGate[] The array of approvedNFT gates.
    function getNFTGatesArray() external view returns (CookieJarLib.NFTGate[] memory) {
        return nftGates;
    }

    function getWithdrawalDataArray() external view returns (CookieJarLib.WithdrawalData[] memory) {
        return withdrawalData;
    }

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

    /// @notice Adds a new NFT gate if it is not already registered.
    /// @param _nftAddress The NFT contract address.
    /// @param _nftType The NFT type.
    function _addNFTGate(address _nftAddress, CookieJarLib.NFTType _nftType) internal {
        if (_nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        if (_nftType == CookieJarLib.NFTType.None) revert CookieJarLib.InvalidNFTType();
        if (_nftGateMapping[_nftAddress] != CookieJarLib.NFTType.None) revert CookieJarLib.DuplicateNFTGate();
        if (nftGates.length >= CookieJarLib.MAX_NFT_GATES) revert CookieJarLib.TooManyNFTGates();
        
        CookieJarLib.NFTGate memory gate = CookieJarLib.NFTGate({nftAddress: _nftAddress, nftType: _nftType});
        uint256 newIndex = nftGates.length;
        nftGates.push(gate);
        _nftGateMapping[_nftAddress] = _nftType;
        _nftGateIndex[_nftAddress] = newIndex; // Store index for O(1) removal
        emit CookieJarLib.NFTGateAdded(_nftAddress, _nftType);
    }

    function _calculateFee(uint256 _principalAmount) internal view returns (uint256 fee, uint256 amountRemaining) {
        fee = (_principalAmount * feePercentageOnDeposit) / CookieJarLib.PERCENTAGE_BASE;
        amountRemaining = _principalAmount - fee;
    }

    function _checkAccessNFT(address gateAddress, uint256 tokenId) internal {
        // Lookup NFT type from registered gates
        CookieJarLib.NFTType nftType = _nftGateMapping[gateAddress];
        
        // Ensure the gate is registered and valid
        if (nftType == CookieJarLib.NFTType.None) revert CookieJarLib.InvalidNFTGate();
        
        // Use enhanced validation with gas limits and malicious contract protection
        NFTValidation.validateNFTOwnershipWithGasLimit(gateAddress, tokenId, msg.sender, nftType);
        
        // Emit event for successful NFT access validation
        emit CookieJarLib.NFTAccessValidated(msg.sender, gateAddress, tokenId);
    }
    
    /*
    // TEMPORARILY REMOVED: Advanced balance proof validation function
    function _checkAccessNFTWithBalanceProof(
        address gateAddress, 
        uint256 tokenId, 
        uint256 expectedMinBalance,
        uint256 blockNumberSnapshot
    ) internal returns (uint256 actualBalance) {
        // Lookup NFT type from registered gates
        CookieJarLib.NFTType nftType = _nftGateMapping[gateAddress];
        
        // Ensure the gate is registered and valid
        if (nftType == CookieJarLib.NFTType.None) revert CookieJarLib.InvalidNFTGate();
        
        if (nftType == CookieJarLib.NFTType.ERC721) {
            // ERC721: Use standard validation (no balance proof needed)
            NFTValidation.validateNFTOwnershipWithGasLimit(gateAddress, tokenId, msg.sender, nftType);
            actualBalance = 1; // ERC721 balance is always 1 if owned
        } else if (nftType == CookieJarLib.NFTType.ERC1155) {
            // ERC1155: Use balance proof validation for race condition protection
            actualBalance = NFTValidation.validateERC1155BalanceWithProof(
                gateAddress,
                tokenId,
                msg.sender,
                expectedMinBalance,
                blockNumberSnapshot
            );
        }
        
        // Emit enhanced event with balance information
        emit CookieJarLib.NFTBalanceProofWithdrawal(
            msg.sender, 
            gateAddress, 
            tokenId, 
            expectedMinBalance, 
            actualBalance
        );
        
        // Standard validation event
        emit CookieJarLib.NFTAccessValidated(msg.sender, gateAddress, tokenId);
    }
    */

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
        
        // TODO: Add on-chain event ID validation via oracle or merkle proof
        // Currently relies on off-chain filtering of valid token IDs per event
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
            revert CookieJarLib.InvalidAccessType();
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

    /// @notice Validates withdrawal conditions and updates internal state
    /// @dev Performs comprehensive checks before allowing withdrawal:
    ///      - Amount validation (non-zero, within limits)
    ///      - Purpose validation (if strict purpose enabled)
    ///      - One-time withdrawal enforcement
    ///      - Time-lock validation (withdrawal interval)
    ///      - Balance sufficiency check
    /// @param amount The withdrawal amount to validate
    /// @param purpose The withdrawal purpose string
    /// @param lastWithdrawal Timestamp of last withdrawal for this user/NFT
    function _checkAndUpdateWithdraw(uint256 amount, string calldata purpose, uint256 lastWithdrawal) internal {
        // Basic amount validation
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        
        // Use library for validations to reduce contract size
        CookieJarValidation.validatePurpose(strictPurpose, purpose);
        CookieJarValidation.validateOneTimeWithdrawal(oneTimeWithdrawal, lastWithdrawal);
        CookieJarValidation.validateWithdrawalInterval(lastWithdrawal, withdrawalInterval, block.timestamp);
        
        // Period withdrawal limit check
        if (maxWithdrawalPerPeriod > 0) {
            (bool needsReset, uint256 newTotal) = CookieJarValidation.validatePeriodLimit(
                maxWithdrawalPerPeriod,
                currentPeriodStart[msg.sender],
                withdrawnInCurrentPeriod[msg.sender],
                amount,
                block.timestamp
            );
            
            if (needsReset) {
                currentPeriodStart[msg.sender] = block.timestamp;
                withdrawnInCurrentPeriod[msg.sender] = newTotal;
            } else {
                withdrawnInCurrentPeriod[msg.sender] = newTotal;
            }
        }
        
        // Amount limit validation
        CookieJarValidation.validateWithdrawalAmount(withdrawalOption, amount, fixedAmount, maxWithdrawal);
        
        // Balance sufficiency check
        if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();

        // Update internal state
        currencyHeldByJar -= amount;
        
        // Check withdrawal history limit
        if (withdrawalData.length >= CookieJarLib.MAX_WITHDRAWAL_HISTORY) {
            revert CookieJarLib.WithdrawalHistoryLimitReached();
        }
        
        // Record withdrawal data
        withdrawalData.push(CookieJarLib.WithdrawalData({
            amount: amount,
            purpose: purpose,
            recipient: msg.sender
        }));
    }

    function _withdraw(uint256 amount, string calldata purpose) internal {
        emit CookieJarLib.Withdrawal(msg.sender, amount, purpose);
        if (currency == CookieJarLib.ETH_ADDRESS) {
            (bool sent, ) = msg.sender.call{value: amount}("");
            if (!sent) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(currency).safeTransfer(msg.sender, amount);
        }
    }
}
