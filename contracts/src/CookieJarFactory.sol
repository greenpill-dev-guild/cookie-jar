// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {UniversalSwapAdapter} from "./libraries/UniversalSwapAdapter.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy unified "cookie jars" with integrated streaming capabilities
/// @dev V2 factory with metadata functionality and integrated Superfluid support
contract CookieJarFactory is AccessControl {
    bytes32 public constant OWNER = keccak256("OWNER");
    bytes32 public constant PROTOCOL_ADMIN = keccak256("PROTOCOL_ADMIN");
    bytes32 public constant DENYLISTED_JAR_CREATORS = keccak256("DENYLISTED_JAR_CREATORS");
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");

    address[] public cookieJars;
    
    /// @notice Storage for jar metadata (size-optimized)
    mapping(uint256 => string) private _jarMetadata;

    address public immutable defaultFeeCollector;
    uint256 public immutable defaultFeePercentage;
    uint256 public immutable minETHDeposit;
    uint256 public immutable minERC20Deposit;

    error CookieJarFactory__Denylisted();
    error CookieJarFactory__NotValidERC20();
    error CookieJarFactory__JarNotFound();
    error CookieJarFactory__NotJarOwner();
    error CookieJarFactory__IndexOutOfBounds();

    event CookieJarCreated(address indexed creator, address cookieJarAddress);
    event MetadataUpdated(address indexed jarAddress, string metadata);

    modifier onlyNotDenylisted(address _user) {
        if (hasRole(DENYLISTED_JAR_CREATORS, _user)) revert CookieJarFactory__Denylisted();
        _;
    }

    constructor(
        address _defaultFeeCollector,
        address _owner,
        uint256 _feePercentage,
        uint256 _minETHDeposit,
        uint256 _minERC20Deposit
    ) {
        if (_defaultFeeCollector == address(0)) revert CookieJarLib.ZeroAddress();
        
        defaultFeeCollector = _defaultFeeCollector;
        defaultFeePercentage = _feePercentage;
        minETHDeposit = _minETHDeposit;
        minERC20Deposit = _minERC20Deposit;

        _grantRole(OWNER, _owner);
        _grantRole(PROTOCOL_ADMIN, _owner);
        _setRoleAdmin(DENYLISTED_JAR_CREATORS, PROTOCOL_ADMIN);
        _setRoleAdmin(OWNER, OWNER);
        _setRoleAdmin(PROTOCOL_ADMIN, OWNER);
    }

    /// @notice Get total number of jars (all jars now have integrated Superfluid support)
    function getJarCount() external view returns (uint256) {
        return cookieJars.length;
    }

    /// @notice Get metadata for a specific jar by index
    /// @param index Index of the jar
    /// @return metadata string
    function getMetadataByIndex(uint256 index) external view returns (string memory) {
        if (index >= cookieJars.length) revert CookieJarFactory__IndexOutOfBounds();
        return _jarMetadata[index];
    }

    /// @notice Get metadata for a specific jar by address
    /// @param jarAddress Address of the jar
    /// @return metadata string
    function getMetadata(address jarAddress) external view returns (string memory) {
        // Check all jars (unified - all have Superfluid capabilities)
        for (uint256 i = 0; i < cookieJars.length; i++) {
            if (cookieJars[i] == jarAddress) {
                return _jarMetadata[i];
            }
        }
        revert CookieJarFactory__JarNotFound();
    }

    /// @notice Update metadata for a specific jar (jar owner only)
    /// @param jarAddress Address of the jar to update
    /// @param newMetadata New metadata string
    function updateMetadata(address jarAddress, string calldata newMetadata) external {
        // Check all jars (unified - all have integrated Superfluid capabilities)
        for (uint256 i = 0; i < cookieJars.length; i++) {
            if (cookieJars[i] == jarAddress) {
                if (!CookieJar(payable(jarAddress)).hasRole(JAR_OWNER, msg.sender)) {
                    revert CookieJarFactory__NotJarOwner();
                }
                _jarMetadata[i] = newMetadata;
                emit MetadataUpdated(jarAddress, newMetadata);
                return;
            }
        }
        
        revert CookieJarFactory__JarNotFound();
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
    ) external onlyNotDenylisted(msg.sender) returns (address jarAddress) {
        
        // Build the complete jar configuration
        CookieJarLib.JarConfig memory config = _buildJarConfig(
            params,
            multiTokenConfig,
            streamingConfig
        );
        
        // Create the jar
        CookieJar newJar = new CookieJar(config, accessConfig);
        jarAddress = address(newJar);
        
        // Store jar address and metadata
        cookieJars.push(jarAddress);
        _jarMetadata[cookieJars.length - 1] = params.metadata;
        
        emit CookieJarCreated(msg.sender, jarAddress);
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
    ) internal view returns (CookieJarLib.JarConfig memory) {
        
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
    function _getMinDeposit(address currency) internal view returns (uint256 minDeposit) {
        if (currency == CookieJarLib.ETH_ADDRESS) {
            return minETHDeposit;
        } else {
            if (ERC20(currency).decimals() == 0) revert CookieJarFactory__NotValidERC20();
            return minERC20Deposit;
        }
    }
    
    /// @notice Calculate fee percentage with proper bounds checking
    /// @param providedFee User-provided fee percentage
    /// @return Validated fee percentage
    function _getFeePercentage(uint256 providedFee) internal view returns (uint256) {
        uint256 feePerc = providedFee == 0 ? defaultFeePercentage : providedFee;
        return feePerc > CookieJarLib.PERCENTAGE_BASE ? CookieJarLib.PERCENTAGE_BASE : feePerc;
    }
    
    /// @notice Get default multi-token configuration (disabled)
    /// @return Default multi-token configuration
    function _getDefaultMultiTokenConfig() internal pure returns (CookieJarLib.MultiTokenConfig memory) {
        return CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,      // 5% default slippage
            minSwapAmount: 0,             // No minimum swap amount
            defaultFee: 3000              // 0.3% default fee
        });
    }
    
    /// @notice Get default streaming configuration (disabled)
    /// @return Default streaming configuration
    function _getDefaultStreamingConfig() internal pure returns (CookieJarLib.StreamingConfig memory) {
        address[] memory emptyTokens = new address[](0);
        return CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens,
            minFlowRate: 1e18             // 1 token per second minimum
        });
    }

    // === ADMIN FUNCTIONS ===

    // Admin functions for denylisting (essential for security)
    function grantDenylistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        for (uint256 i = 0; i < _users.length; i++) {
            _grantRole(DENYLISTED_JAR_CREATORS, _users[i]);
        }
    }

    function revokeDenylistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        for (uint256 i = 0; i < _users.length; i++) {
            _revokeRole(DENYLISTED_JAR_CREATORS, _users[i]);
        }
    }

    /// @notice Get all jar addresses (all have integrated capabilities)
    /// @return Array of jar addresses
    function getAllJars() external view returns (address[] memory) {
        return cookieJars;
    }

    /// @notice Check if address is a jar created by this factory
    /// @param jarAddress Address to check
    /// @return isJar Whether it's a jar created by this factory
    function isFactoryJar(address jarAddress) external view returns (bool isJar) {
        // Check all jars (unified - all have integrated capabilities)
        for (uint256 i = 0; i < cookieJars.length; i++) {
            if (cookieJars[i] == jarAddress) {
                return true;
            }
        }
        return false;
    }
}