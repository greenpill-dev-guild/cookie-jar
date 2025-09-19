// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy "cookie jars" for users.
/// @dev V2 factory with metadata functionality restored
contract CookieJarFactory is AccessControl {
    bytes32 public constant OWNER = keccak256("OWNER");
    bytes32 public constant PROTOCOL_ADMIN = keccak256("PROTOCOL_ADMIN");
    bytes32 public constant BLACKLISTED_JAR_CREATORS = keccak256("BLACKLISTED_JAR_CREATORS");
    bytes32 public constant JAR_OWNER = keccak256("JAR_OWNER");

    address[] public cookieJars;
    
    /// @notice Storage for jar metadata (size-optimized)
    mapping(uint256 => string) private _jarMetadata;

    address public immutable defaultFeeCollector;
    uint256 public immutable defaultFeePercentage;
    uint256 public immutable minETHDeposit;
    uint256 public immutable minERC20Deposit;

    error CookieJarFactory__Blacklisted();
    error CookieJarFactory__NotValidERC20();
    error CookieJarFactory__JarNotFound();
    error CookieJarFactory__NotJarOwner();

    event CookieJarCreated(address indexed creator, address cookieJarAddress);
    event MetadataUpdated(address indexed jarAddress, string metadata);

    modifier onlyNotBlacklisted(address _user) {
        if (hasRole(BLACKLISTED_JAR_CREATORS, _user)) revert CookieJarFactory__Blacklisted();
        _;
    }

    constructor(
        address _defaultFeeCollector,
        address _owner,
        uint256 _feePercentage,
        uint256 _minETHDeposit,
        uint256 _minERC20Deposit
    ) {
        if (_defaultFeeCollector == address(0)) revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        defaultFeeCollector = _defaultFeeCollector;
        defaultFeePercentage = _feePercentage;
        minETHDeposit = _minETHDeposit;
        minERC20Deposit = _minERC20Deposit;
        _grantRole(OWNER, _owner);
        _grantRole(PROTOCOL_ADMIN, _owner);
        _setRoleAdmin(PROTOCOL_ADMIN, OWNER);
        _setRoleAdmin(BLACKLISTED_JAR_CREATORS, OWNER);
    }

    function getCookieJars() external view returns (address[] memory) {
        return cookieJars;
    }

    /// @notice Get metadata for all jars (batch function)
    /// @return Array of metadata strings
    function getMetadatas() external view returns (string[] memory) {
        string[] memory allMetadatas = new string[](cookieJars.length);
        for (uint256 i = 0; i < cookieJars.length; i++) {
            allMetadatas[i] = _jarMetadata[i];
        }
        return allMetadatas;
    }

    /// @notice Get metadata for a specific jar by index
    /// @param index Index of the jar in the cookieJars array
    /// @return metadata string
    function metadatas(uint256 index) external view returns (string memory) {
        require(index < cookieJars.length, "Index out of bounds");
        return _jarMetadata[index];
    }

    /// @notice Get metadata for a specific jar by address
    /// @param jarAddress Address of the jar
    /// @return metadata string
    function getMetadata(address jarAddress) external view returns (string memory) {
        // Find jar index
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
        // Find jar index
        uint256 jarIndex = type(uint256).max;
        for (uint256 i = 0; i < cookieJars.length; i++) {
            if (cookieJars[i] == jarAddress) {
                jarIndex = i;
                break;
            }
        }
        if (jarIndex == type(uint256).max) revert CookieJarFactory__JarNotFound();
        
        // Check if caller is jar owner
        if (!CookieJar(jarAddress).hasRole(JAR_OWNER, msg.sender)) {
            revert CookieJarFactory__NotJarOwner();
        }
        
        _jarMetadata[jarIndex] = newMetadata;
        emit MetadataUpdated(jarAddress, newMetadata);
    }

    /// @notice Creates a new CookieJar using optimized parameter structs
    function createCookieJar(
        CookieJarLib.CreateJarParams calldata params,
        CookieJarLib.AccessConfig calldata accessConfig
    ) external onlyNotBlacklisted(msg.sender) returns (address) {
        uint256 minDeposit = minETHDeposit;
        if (params.supportedCurrency != CookieJarLib.ETH_ADDRESS) {
            if (ERC20(params.supportedCurrency).decimals() == 0) revert CookieJarFactory__NotValidERC20();
            minDeposit = minERC20Deposit;
        }

        uint256 feePerc = params.customFeePercentage == 0 ? defaultFeePercentage : params.customFeePercentage;
        if (feePerc > CookieJarLib.PERCENTAGE_BASE) feePerc = CookieJarLib.PERCENTAGE_BASE;

        CookieJarLib.JarConfig memory config = CookieJarLib.JarConfig({
            jarOwner: params.cookieJarOwner,
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
            maxWithdrawalPerPeriod: params.maxWithdrawalPerPeriod
        });

        CookieJar newJar = new CookieJar(config, accessConfig);
        address jarAddress = address(newJar);
        
        cookieJars.push(jarAddress);
        // Store metadata for the new jar
        _jarMetadata[cookieJars.length - 1] = params.metadata;
        
        emit CookieJarCreated(msg.sender, jarAddress);
        return jarAddress;
    }

    // Admin functions for blacklisting (essential for security)
    function grantBlacklistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        for (uint256 i = 0; i < _users.length; i++) {
            _grantRole(BLACKLISTED_JAR_CREATORS, _users[i]);
        }
    }

    function revokeBlacklistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        for (uint256 i = 0; i < _users.length; i++) {
            _revokeRole(BLACKLISTED_JAR_CREATORS, _users[i]);
        }
    }
}
