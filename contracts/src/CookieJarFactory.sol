// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CookieJar, CookieJarLib} from "./CookieJar.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy unified "cookie jars" with integrated streaming capabilities
/// @dev V2 factory with metadata functionality and integrated Superfluid support
contract CookieJarFactory {
    /// @notice Single admin role for access control
    address public immutable owner;
    mapping(address => bool) public admins;

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

    /// @notice Optimized jar information struct - packed for gas efficiency
    /// @dev Replaces 4 separate mappings: isFactoryJar, jarCreator, jarCreationTime
    struct JarInfo {
        address creator;    // 20 bytes
        uint64 createdAt;   // 8 bytes
        bool exists;        // 1 byte + 3 bytes padding = 32 bytes total
    }
    
    /// @notice Separate mapping for metadata to avoid dynamic array overhead in struct
    mapping(address => string) private jarMetadata;
    
    /// @notice Get default multi-token configuration (optimized inline)
    function _getDefaultMultiTokenConfig() private pure returns (CookieJarLib.MultiTokenConfig memory) {
        return CookieJarLib.MultiTokenConfig(false, 500, 0, 3000); // Positional args for smaller bytecode
    }

    error NotAuthorized();
    error JarNotFound();

    /// @notice Emitted when a new jar is created
    event JarCreated(address indexed jarAddress, address indexed creator);
    
    /// @notice Emitted when jar metadata is updated
    event MetadataUpdated(address indexed jarAddress, string metadata);
    
    /// @notice Emitted when admin access is granted/revoked
    event AdminUpdated(address indexed admin, bool granted);


    /// @notice Access control modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    modifier onlyAdmin() {
        if (msg.sender != owner && !admins[msg.sender]) revert NotAuthorized();
        _;
    }

    constructor(
        address _defaultFeeCollector,
        address _owner,
        uint256 _feePercentage,
        uint128 _minETHDeposit,
        uint128 _minERC20Deposit
    ) {
        if (_defaultFeeCollector == address(0)) revert CookieJarLib.ZeroAddress();
        if (_owner == address(0)) revert CookieJarLib.ZeroAddress();
        
        defaultFeeCollector = _defaultFeeCollector;
        defaultFeePercentage = _feePercentage;
        minETHDeposit = _minETHDeposit;
        minERC20Deposit = _minERC20Deposit;
        owner = _owner;
    }

    /// @notice Grant or revoke admin access (owner only)
    function setAdmin(address admin, bool granted) external onlyOwner {
        admins[admin] = granted;
        emit AdminUpdated(admin, granted);
    }

    /// @notice Get total number of jars (all jars now have integrated Superfluid support)
    function getJarCount() external view returns (uint256) {
        return cookieJars.length;
    }

    /// @notice Get all jar addresses (all have integrated capabilities)
    /// @return Array of jar addresses
    function getAllJars() external view returns (address[] memory) {
        return cookieJars;
    }

    /// @notice Get comprehensive jar information in single call
    /// @dev Gas-optimized: single storage read instead of multiple function calls
    /// @param jarAddress Address of the jar
    /// @return creator The address that created the jar
    /// @return createdAt The timestamp when the jar was created
    /// @return metadata The jar's metadata string
    function getJarInfo(address jarAddress) external view 
        returns (address creator, uint256 createdAt, string memory metadata) {
        JarInfo storage info = jarInfo[jarAddress];
        if (!info.exists) revert JarNotFound();
        return (info.creator, uint256(info.createdAt), jarMetadata[jarAddress]);
    }
    
    /// @notice Get jar metadata only (for backwards compatibility)
    function getMetadata(address jarAddress) external view returns (string memory) {
        if (!jarInfo[jarAddress].exists) revert JarNotFound();
        return jarMetadata[jarAddress];
    }


    /// @notice Update metadata for a specific jar (jar owner only)
    /// @dev Uses direct mapping lookup for gas optimization
    /// @param jarAddress Address of the jar to update
    /// @param newMetadata New metadata string
    function updateMetadata(address jarAddress, string calldata newMetadata) external {
        if (!jarInfo[jarAddress].exists) revert JarNotFound();
        if (!CookieJar(payable(jarAddress)).hasRole(CookieJarLib.JAR_OWNER, msg.sender)) {
            revert NotAuthorized();
        }

        jarMetadata[jarAddress] = newMetadata;
        emit MetadataUpdated(jarAddress, newMetadata);
    }

    /// @notice Creates a new CookieJar with optional enhanced features
    /// @dev Single function handles all creation scenarios - uses defaults for unspecified configs
    /// @param params Basic jar parameters
    /// @param accessConfig Access control configuration
    /// @param multiTokenConfig Multi-token configuration (optional - uses defaults if not enabled)
    /// @return jarAddress Address of the created jar
    function createCookieJar(
        CookieJarLib.JarConfig calldata params,
        CookieJarLib.AccessConfig calldata accessConfig,
        CookieJarLib.MultiTokenConfig calldata multiTokenConfig
    ) external returns (address jarAddress) {
        
        // Inline config building with validation
        uint256 minDep = params.supportedCurrency == CookieJarLib.ETH_ADDRESS 
            ? uint256(minETHDeposit) : uint256(minERC20Deposit);
            
        // Validate ERC20 if not ETH
        if (params.supportedCurrency != CookieJarLib.ETH_ADDRESS) {
            if (ERC20(params.supportedCurrency).decimals() == 0) revert CookieJarLib.InvalidTokenAddress();
        }
        
        uint256 feePerc = params.feePercentageOnDeposit == 0 ? defaultFeePercentage : params.feePercentageOnDeposit;
        if (feePerc > CookieJarLib.PERCENTAGE_BASE) feePerc = CookieJarLib.PERCENTAGE_BASE;
        
        // Validate multi-token config if enabled
        if (multiTokenConfig.enabled && multiTokenConfig.maxSlippagePercent == 0) {
            revert CookieJarLib.InvalidTokenAddress();
        }
        
        // Build final config inline
        CookieJarLib.JarConfig memory config = CookieJarLib.JarConfig({
            jarOwner: params.jarOwner,
            supportedCurrency: params.supportedCurrency,
            accessType: params.accessType,
            withdrawalOption: params.withdrawalOption,
            fixedAmount: params.fixedAmount,
            maxWithdrawal: params.maxWithdrawal,
            withdrawalInterval: params.withdrawalInterval,
            minDeposit: minDep,
            feePercentageOnDeposit: feePerc,
            strictPurpose: params.strictPurpose,
            feeCollector: defaultFeeCollector,
            emergencyWithdrawalEnabled: params.emergencyWithdrawalEnabled,
            oneTimeWithdrawal: params.oneTimeWithdrawal,
            maxWithdrawalPerPeriod: params.maxWithdrawalPerPeriod,
            metadata: params.metadata,
            multiTokenConfig: multiTokenConfig.enabled ? multiTokenConfig : _getDefaultMultiTokenConfig()
        });
        
        // Create the jar with Superfluid host address
        address superfluidHost = address(0x1234567890123456789012345678901234567890); // Placeholder for testing
        CookieJar newJar = new CookieJar(config, accessConfig, superfluidHost);
        jarAddress = address(newJar);
        
        // Store jar info using optimized struct
        cookieJars.push(jarAddress); // Keep array for compatibility
        jarInfo[jarAddress] = JarInfo({
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        jarMetadata[jarAddress] = params.metadata;
        
        emit JarCreated(jarAddress, msg.sender);
        return jarAddress;
    }

    // === OPTIMIZED: All helper functions eliminated and inlined for size reduction ===
}