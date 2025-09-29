// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CookieJar, CookieJarLib} from "./CookieJar.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy unified "cookie jars" with integrated streaming capabilities
/// @dev V2 factory with metadata functionality and integrated Superfluid support
contract CookieJarFactory is AccessControl {
    bytes32 public constant OWNER = keccak256("OWNER");
    bytes32 public constant PROTOCOL_ADMIN = keccak256("PROTOCOL_ADMIN");
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");

    /// @notice Optimized storage: consolidated jar information
    /// @dev Single struct mapping replaces 4 separate mappings (saves ~2KB)
    mapping(address => JarInfo) public jarInfo;

    /// @notice All created jars (kept for compatibility - TODO: consider removing)
    address[] public cookieJars;

    /// @notice Immutable configuration - optimized data types
    address public immutable defaultFeeCollector;
    uint256 public immutable defaultFeePercentage;
    uint128 public immutable minETHDeposit;
    uint128 public immutable minERC20Deposit;

    /// @notice Consolidated jar information struct
    /// @dev Replaces 4 separate mappings: isFactoryJar, jarMetadata, jarCreator, jarCreationTime
    struct JarInfo {
        bool exists;        // was isFactoryJar
        address creator;    // was jarCreator
        uint64 createdAt;   // was jarCreationTime (uint64 saves 16 bytes)
        string metadata;    // was jarMetadata
    }

    error CookieJarFactory__Denylisted();
    error CookieJarFactory__NotValidERC20();
    error CookieJarFactory__JarNotFound();
    error CookieJarFactory__NotJarOwner();
    error CookieJarFactory__IndexOutOfBounds();

    /// @notice Unified event for jar operations
    /// @dev Combines creation and metadata update events to reduce bytecode size
    /// @param jarAddress Address of the jar
    /// @param creator Creator address (for creation events)
    /// @param eventType 0 = created, 1 = metadata updated
    /// @param metadata Metadata string (only used for updates)
    event JarEvent(
        address indexed jarAddress,
        address indexed creator,
        uint8 eventType,
        string metadata
    );


    constructor(
        address _defaultFeeCollector,
        address _owner,
        uint256 _feePercentage,
        uint128 _minETHDeposit,
        uint128 _minERC20Deposit
    ) {
        if (_defaultFeeCollector == address(0)) revert CookieJarLib.ZeroAddress();
        
        defaultFeeCollector = _defaultFeeCollector;
        defaultFeePercentage = _feePercentage;
        minETHDeposit = _minETHDeposit;
        minERC20Deposit = _minERC20Deposit;

        _grantRole(OWNER, _owner);
        _grantRole(PROTOCOL_ADMIN, _owner);
        _setRoleAdmin(OWNER, OWNER);
        _setRoleAdmin(PROTOCOL_ADMIN, OWNER);
    }

    /// @notice Get total number of jars (all jars now have integrated Superfluid support)
    function getJarCount() external view returns (uint256) {
        return cookieJars.length;
    }

    /// @notice Get metadata for jar by direct address lookup
    /// @dev Gas-optimized: O(1) lookup instead of O(n) array iteration
    /// @param jarAddress Address of the jar
    /// @return metadata The jar's metadata string
    function getMetadata(address jarAddress) external view returns (string memory metadata) {
        JarInfo storage info = jarInfo[jarAddress];
        if (!info.exists) revert CookieJarFactory__JarNotFound();
        return info.metadata;
    }

    /// @notice Get jar creator by direct address lookup
    /// @dev Gas-optimized: O(1) lookup instead of O(n) array iteration
    /// @param jarAddress Address of the jar
    /// @return creator The address that created the jar
    function getJarCreator(address jarAddress) external view returns (address creator) {
        JarInfo storage info = jarInfo[jarAddress];
        if (!info.exists) revert CookieJarFactory__JarNotFound();
        return info.creator;
    }

    /// @notice Get jar creation time by direct address lookup
    /// @dev Gas-optimized: O(1) lookup instead of O(n) array iteration
    /// @param jarAddress Address of the jar
    /// @return creationTime The timestamp when the jar was created
    function getJarCreationTime(address jarAddress) external view returns (uint256 creationTime) {
        JarInfo storage info = jarInfo[jarAddress];
        if (!info.exists) revert CookieJarFactory__JarNotFound();
        return uint256(info.createdAt);
    }


    /// @notice Update metadata for a specific jar (jar owner only)
    /// @dev Uses direct mapping lookup for gas optimization
    /// @param jarAddress Address of the jar to update
    /// @param newMetadata New metadata string
    function updateMetadata(address jarAddress, string calldata newMetadata) external {
        JarInfo storage info = jarInfo[jarAddress];
        if (!info.exists) revert CookieJarFactory__JarNotFound();
        if (!CookieJar(payable(jarAddress)).hasRole(JAR_OWNER, msg.sender)) {
            revert CookieJarFactory__NotJarOwner();
        }

        info.metadata = newMetadata;
        emit JarEvent(jarAddress, address(0), 1, newMetadata);
    }

    /// @notice Creates a new CookieJar with optional enhanced features
    /// @dev Single function handles all creation scenarios - uses defaults for unspecified configs
    /// @param params Basic jar parameters
    /// @param accessConfig Access control configuration
    /// @param multiTokenConfig Multi-token configuration (optional - uses defaults if not enabled)
    /// @param streamingConfig Streaming configuration (optional - uses defaults if not enabled)
    /// @return jarAddress Address of the created jar
    function createCookieJar(
        CookieJarLib.JarConfig calldata params,
        CookieJarLib.AccessConfig calldata accessConfig,
        CookieJarLib.MultiTokenConfig calldata multiTokenConfig,
        CookieJarLib.StreamingConfig calldata streamingConfig
    ) external returns (address jarAddress) {
        
        // Build the complete jar configuration
        CookieJarLib.JarConfig memory config = _buildJarConfig(
            params,
            multiTokenConfig,
            streamingConfig
        );
        
        // Create the jar
        CookieJar newJar = new CookieJar(config, accessConfig);
        jarAddress = address(newJar);
        
        // Store jar info using optimized consolidated struct
        cookieJars.push(jarAddress); // Keep array for compatibility
        jarInfo[jarAddress] = JarInfo({
            exists: true,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            metadata: params.metadata
        });
        
        emit JarEvent(jarAddress, msg.sender, 0, params.metadata);
        return jarAddress;
    }

    // === INTERNAL HELPER FUNCTIONS ===

    /// @notice Internal helper to build jar config with proper defaults and validation
    /// @param params Basic jar parameters from user
    /// @param multiTokenConfig Multi-token configuration (uses defaults if not enabled)
    /// @param streamingConfig Streaming configuration (uses defaults if not enabled)
    /// @return Complete jar configuration ready for deployment
    function _buildJarConfig(
        CookieJarLib.JarConfig calldata params,
        CookieJarLib.MultiTokenConfig calldata multiTokenConfig,
        CookieJarLib.StreamingConfig calldata streamingConfig
    ) private view returns (CookieJarLib.JarConfig memory) {
        
        // Determine minimum deposit based on currency type
        uint256 minDeposit = _getMinDeposit(params.supportedCurrency);
        
        // Calculate fee percentage with proper defaults
        uint256 feePerc = _getFeePercentage(params.feePercentageOnDeposit);
        
        // Validate multi-token config if enabled
        if (multiTokenConfig.enabled && multiTokenConfig.maxSlippagePercent == 0) {
            revert CookieJarLib.InvalidTokenAddress();
        }

        // Use provided configs or defaults
        CookieJarLib.MultiTokenConfig memory finalMultiTokenConfig = 
            multiTokenConfig.enabled ? multiTokenConfig : _getDefaultMultiTokenConfig();
            
        CookieJarLib.StreamingConfig memory finalStreamingConfig = 
            streamingConfig.enabled ? streamingConfig : _getDefaultStreamingConfig();
        
        return CookieJarLib.JarConfig({
            jarOwner: params.jarOwner,
            supportedCurrency: params.supportedCurrency,
            accessType: params.accessType,
            withdrawalOption: params.withdrawalOption,
            fixedAmount: params.fixedAmount,
            maxWithdrawal: params.maxWithdrawal,
            withdrawalInterval: params.withdrawalInterval,
            minDeposit: minDeposit,
            feePercentageOnDeposit: feePerc,
            strictPurpose: params.strictPurpose,
            feeCollector: defaultFeeCollector,
            emergencyWithdrawalEnabled: params.emergencyWithdrawalEnabled,
            oneTimeWithdrawal: params.oneTimeWithdrawal,
            maxWithdrawalPerPeriod: params.maxWithdrawalPerPeriod,
            metadata: params.metadata,
            multiTokenConfig: finalMultiTokenConfig,
            streamingConfig: finalStreamingConfig
        });
    }
    
    /// @notice Get minimum deposit amount based on currency type
    /// @param currency The currency address (ETH_ADDRESS for ETH)
    /// @return minDeposit Minimum deposit amount
    function _getMinDeposit(address currency) private view returns (uint256 minDeposit) {
        if (currency == CookieJarLib.ETH_ADDRESS) {
            return uint256(minETHDeposit);
        } else {
            if (ERC20(currency).decimals() == 0) revert CookieJarFactory__NotValidERC20();
            return uint256(minERC20Deposit);
        }
    }

    /// @notice Calculate fee percentage with proper bounds checking
    /// @param providedFee User-provided fee percentage
    /// @return Validated fee percentage
    function _getFeePercentage(uint256 providedFee) private view returns (uint256) {
        uint256 feePerc = providedFee == 0 ? defaultFeePercentage : providedFee;
        return feePerc > CookieJarLib.PERCENTAGE_BASE ? CookieJarLib.PERCENTAGE_BASE : feePerc;
    }

    /// @notice Get default multi-token configuration (disabled)
    /// @return Default multi-token configuration
    function _getDefaultMultiTokenConfig() private pure returns (CookieJarLib.MultiTokenConfig memory) {
        return CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,      // 5% default slippage
            minSwapAmount: 0,             // No minimum swap amount
            defaultFee: 3000              // 0.3% default fee
        });
    }

    /// @notice Get default streaming configuration (disabled)
    /// @return Default streaming configuration
    function _getDefaultStreamingConfig() private pure returns (CookieJarLib.StreamingConfig memory) {
        address[] memory emptyTokens = new address[](0);
        return CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens,
            minFlowRate: 1e18             // 1 token per second minimum
        });
    }

    // === ADMIN FUNCTIONS ===

    // Denylist functionality removed - simplified access control

    /// @notice Get all jar addresses (all have integrated capabilities)
    /// @return Array of jar addresses
    function getAllJars() external view returns (address[] memory) {
        return cookieJars;
    }

    /// @notice Check if address is a jar created by this factory
    /// @dev Uses direct mapping lookup for gas optimization
    /// @param jarAddress Address to check
    /// @return isJar Whether it's a jar created by this factory
    function isJarCreatedByFactory(address jarAddress) external view returns (bool isJar) {
        return jarInfo[jarAddress].exists;
    }
}