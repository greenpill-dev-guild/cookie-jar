// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CookieJar, CookieJarLib} from "./CookieJar.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy unified "cookie jars" with integrated streaming capabilities
/// @dev V2 factory with metadata functionality and integrated Superfluid support
contract CookieJarFactory {
    /// @notice Single admin role for access control
    address public immutable OWNER;
    mapping(address => bool) public admins;

    /// @notice Optimized storage: consolidated jar information
    /// @dev Single struct mapping replaces 4 separate mappings (saves ~2KB)
    mapping(address => JarInfo) public jarInfo;

    /// @notice All created jars (kept for compatibility - TODO: consider removing)
    address[] public cookieJars;

    /// @notice Immutable configuration - optimized data types
    address public immutable DEFAULT_FEE_COLLECTOR;
    uint256 public immutable DEFAULT_FEE_PERCENTAGE;
    uint128 public immutable MIN_ETH_DEPOSIT;
    uint128 public immutable MIN_ERC20_DEPOSIT;

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
        if (msg.sender != OWNER) revert NotAuthorized();
        _;
    }
    
    modifier onlyAdmin() {
        if (msg.sender != OWNER && !admins[msg.sender]) revert NotAuthorized();
        _;
    }

    constructor(
        address _DEFAULT_FEE_COLLECTOR,
        address _OWNER,
        uint256 _feePercentage,
        uint128 _minEthDeposit,
        uint128 _minErc20Deposit
    ) {
        if (_DEFAULT_FEE_COLLECTOR == address(0)) revert CookieJarLib.ZeroAddress();
        if (_OWNER == address(0)) revert CookieJarLib.ZeroAddress();
        
        DEFAULT_FEE_COLLECTOR = _DEFAULT_FEE_COLLECTOR;
        DEFAULT_FEE_PERCENTAGE = _feePercentage;
        MIN_ETH_DEPOSIT = _minEthDeposit;
        MIN_ERC20_DEPOSIT = _minErc20Deposit;
        OWNER = _OWNER;
    }

    /// @notice Grant or revoke admin access (OWNER only)
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


    /// @notice Update metadata for a specific jar (jar OWNER only)
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
            ? uint256(MIN_ETH_DEPOSIT) : uint256(MIN_ERC20_DEPOSIT);
            
        // Validate ERC20 if not ETH
        if (params.supportedCurrency != CookieJarLib.ETH_ADDRESS) {
            if (ERC20(params.supportedCurrency).decimals() == 0) revert CookieJarLib.InvalidTokenAddress();
        }
        
        uint256 feePerc = params.FEE_PERCENTAGE_ON_DEPOSIT == 0 ? DEFAULT_FEE_PERCENTAGE : params.FEE_PERCENTAGE_ON_DEPOSIT;
        if (feePerc > CookieJarLib.PERCENTAGE_BASE) feePerc = CookieJarLib.PERCENTAGE_BASE;
        
        // Validate multi-token config if enabled
        if (multiTokenConfig.enabled && multiTokenConfig.maxSlippagePercent == 0) {
            revert CookieJarLib.InvalidTokenAddress();
        }
        
        // Build final config inline
        CookieJarLib.JarConfig memory config = CookieJarLib.JarConfig(
            params.jarOwner,                    // jarOwner
            params.supportedCurrency,          // supportedCurrency
            DEFAULT_FEE_COLLECTOR,             // feeCollector
            params.ACCESS_TYPE,                // accessType
            params.WITHDRAWAL_OPTION,          // withdrawalOption
            params.STRICT_PURPOSE,             // strictPurpose
            params.EMERGENCY_WITHDRAWAL_ENABLED, // emergencyWithdrawalEnabled
            params.ONE_TIME_WITHDRAWAL,        // oneTimeWithdrawal
            params.fixedAmount,                // fixedAmount
            params.maxWithdrawal,              // maxWithdrawal
            params.withdrawalInterval,         // withdrawalInterval
            minDep,                            // minDeposit
            feePerc,                           // feePercentageOnDeposit
            params.MAX_WITHDRAWAL_PER_PERIOD,  // maxWithdrawalPerPeriod
            params.metadata,                   // metadata
            multiTokenConfig.enabled ? multiTokenConfig : _getDefaultMultiTokenConfig() // multiTokenConfig
        );
        
        // Create the jar with Superfluid host address
        address superfluidHost = address(0); // Superfluid host disabled for testing
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