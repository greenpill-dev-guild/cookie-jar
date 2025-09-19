// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CookieJarFactory
/// @notice A factory contract to deploy "cookie jars" for users.
/// @notice A cookie jar is a contract that allows users to deposit funds, and create an allowlist for users that can "claim", example airdrops.
/// @notice DO NOT DIRECTLY SEND FUNDS TO THIS CONTRACT, USE DEPOSIT FUNCTIONS TO DEPOSIT AND STORE THE DATA IN THIS CONTRACT.
/// @dev Handles Protocol Access Control and jar deployments.
contract CookieJarFactory is AccessControl {
    /// @dev Openzeppelin AccessControl role instances.
    bytes32 public constant OWNER = keccak256("OWNER");
    bytes32 public constant PROTOCOL_ADMIN = keccak256("PROTOCOL_ADMIN");
    bytes32 public constant BLACKLISTED_JAR_CREATORS = keccak256("BLACKLISTED_JAR_CREATORS");

    address[] public cookieJars;
    string[] public metadatas;

    // Mapping from jar address to its index in the cookieJars array
    mapping(address => uint256) public jarIndex;

    address public immutable defaultFeeCollector;
    uint256 public immutable defaultFeePercentage;

    uint256 public immutable minETHDeposit;
    uint256 public immutable minERC20Deposit;

    // --- Custom Error ---
    error CookieJarFactory__Blacklisted();
    error CookieJarFactory__NotAuthorized();
    error CookieJarFactory__MismatchedArrayLengths();
    error CookieJarFactory__UserIsNotBlacklisted();
    error CookieJarFactory__NotValidERC20();
    error CookieJarFactory__JarNotFound();
    error CookieJarFactory__NotJarOwner();
    error CookieJarFactory__InvalidMetadata();
    error CookieJarFactory__MetadataTooLong();

    // --- Events ---
    event CookieJarCreated(address indexed creator, address cookieJarAddress, string metadata);
    event CookieJarMetadataUpdated(address indexed jar, string newMetadata);
    event BlacklistRoleGranted(address[] users);
    event ProtocolAdminUpdated(address indexed previous, address indexed current);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyNotBlacklisted(address _user) {
        if (hasRole(BLACKLISTED_JAR_CREATORS, _user)) revert CookieJarFactory__Blacklisted();
        _;
    }

    /// @param _defaultFeeCollector The address that will receive the fees from all deposits on all jars.
    /// @param _owner The contract owner address.
    /// @param _feePercentage The default fee percentage for all deposits on all jars. 100% = 10000.
    /// @param _minETHDeposit The minimum ETH deposit amount.
    /// @param _minERC20Deposit The minimum ERC20 deposit amount.
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

    // --- Restricted Functions ---

    /// @notice Update the global blacklist for an address.
    /// @dev Restricts the ability to create new CookieJars for a given address.
    /// @param _users The address to update.
    function grantBlacklistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        if (_users.length == 0) revert CookieJarFactory__MismatchedArrayLengths();

        for (uint256 i = 0; i < _users.length; i++) {
            _grantRole(BLACKLISTED_JAR_CREATORS, _users[i]);
        }

        emit BlacklistRoleGranted(_users);
    }

    /// @notice Removes a user from blacklist.
    /// @param _users The address to update.
    function revokeBlacklistedJarCreatorsRole(address[] calldata _users) external onlyRole(PROTOCOL_ADMIN) {
        if (_users.length == 0) revert CookieJarFactory__MismatchedArrayLengths();
        for (uint256 i = 0; i < _users.length; i++) {
            _revokeRole(BLACKLISTED_JAR_CREATORS, _users[i]);
        }
        emit BlacklistRoleGranted(_users);
    }

    /// @notice Grants the protocol admin role to a new address.
    /// @param _admin The address to update.
    function grantProtocolAdminRole(address _admin) external onlyRole(OWNER) {
        _grantRole(PROTOCOL_ADMIN, _admin);
        emit ProtocolAdminUpdated(msg.sender, _admin);
    }

    /// @notice Grants owner role to a new address, and revokes previous owner with the owner role.
    /// @param _newOwner Address of the new owner.
    function transferOwnership(address _newOwner) public onlyRole(OWNER) {
        _revokeRole(OWNER, msg.sender);
        _grantRole(OWNER, _newOwner);
        emit OwnershipTransferred(msg.sender, _newOwner);
    }

    // --- Public Functions ---

    function getCookieJars() external view returns (address[] memory) {
        return cookieJars;
    }

    function getMetadatas() external view returns (string[] memory) {
        return metadatas;
    }

    /// @notice Updates the metadata for an existing jar
    /// @param jar The address of the cookie jar to update
    /// @param newMetadata The new metadata string (JSON format with name, image, link, description)
    function updateMetadata(address jar, string calldata newMetadata) external {
        // Validate metadata length to prevent DoS
        if (bytes(newMetadata).length == 0) revert CookieJarFactory__InvalidMetadata();
        if (bytes(newMetadata).length > 8192) revert CookieJarFactory__MetadataTooLong();

        uint256 index = _validateJarExists(jar);

        // Check authorization: either jar owner or protocol admin
        CookieJar cookieJar = CookieJar(jar);

        bool isJarOwner = cookieJar.hasRole(CookieJarLib.JAR_OWNER, msg.sender);
        bool isProtocolAdmin = hasRole(PROTOCOL_ADMIN, msg.sender);

        if (!isJarOwner && !isProtocolAdmin) {
            revert CookieJarFactory__NotJarOwner();
        }

        // Update metadata
        metadatas[index] = newMetadata;

        emit CookieJarMetadataUpdated(jar, newMetadata);
    }

    /// @notice Gets metadata for a specific jar
    /// @param jar The address of the cookie jar
    /// @return The metadata string for the jar
    function getMetadata(address jar) external view returns (string memory) {
        uint256 index = _validateJarExists(jar);
        return metadatas[index];
    }

    /// @dev Internal function to validate jar exists and return its index
    /// @param jar The address of the cookie jar
    /// @return index The index of the jar in the arrays
    function _validateJarExists(address jar) internal view returns (uint256 index) {
        index = jarIndex[jar];
        if (index >= cookieJars.length || cookieJars[index] != jar) {
            revert CookieJarFactory__JarNotFound();
        }
    }

    /// @notice Creates a new CookieJar contract with custom fee percentage
    /// @param _cookieJarOwner Address of the new CookieJar owner.
    /// @param _supportedCurrency Address of the supported currency for the jar CookieJarLib.ETH_ADDRESS if native ETH.
    /// @param _accessType Claim mode: Allowlist or NFTGated.
    /// @param _nftAddresses Array of NFT contract addresses (only for NFTGated mode).
    /// @param _nftTypes Array of NFT types corresponding to _nftAddresses.
    /// @param _withdrawalOption Fixed or Variable withdrawal type.
    /// @param _fixedAmount Withdrawal amount if Fixed.
    /// @param _maxWithdrawal Maximum allowed withdrawal if Variable.
    /// @param _withdrawalInterval Time interval between withdrawals.
    /// @param _strictPurpose If true, requires a purpose length ≥20 characters.
    /// @param _emergencyWithdrawalEnabled If true, emergency withdrawal is enabled.
    /// @param _oneTimeWithdrawal If true, each recipient can only claim from the jar once.
    /// @param _allowlist Array of allowlisted addresses.
    /// @param metadata Optional metadata for off-chain tracking.
    /// @param customFeePercentage Custom fee percentage for this jar (0-10000, where 10000 = 100%)
    function createCookieJarWithFee(
        address _cookieJarOwner,
        address _supportedCurrency,
        CookieJarLib.AccessType _accessType,
        address[] calldata _nftAddresses,
        CookieJarLib.NFTType[] calldata _nftTypes,
        CookieJarLib.WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        bool _strictPurpose,
        bool _emergencyWithdrawalEnabled,
        bool _oneTimeWithdrawal,
        address[] calldata _allowlist,
        string calldata metadata,
        uint256 customFeePercentage
    ) external onlyNotBlacklisted(msg.sender) returns (address) {
        return _createJarInternal(
            CookieJarLib.CreateJarParams({
                cookieJarOwner: _cookieJarOwner,
                supportedCurrency: _supportedCurrency,
                accessType: _accessType,
                withdrawalOption: _withdrawalOption,
                fixedAmount: _fixedAmount,
                maxWithdrawal: _maxWithdrawal,
                withdrawalInterval: _withdrawalInterval,
                strictPurpose: _strictPurpose,
                emergencyWithdrawalEnabled: _emergencyWithdrawalEnabled,
                oneTimeWithdrawal: _oneTimeWithdrawal,
                metadata: metadata,
                customFeePercentage: customFeePercentage
            }),
            CookieJarLib.AccessConfig({
                nftAddresses: _nftAddresses,
                nftTypes: _nftTypes,
                allowlist: _allowlist,
                poapReq: CookieJarLib.POAPRequirement(0, address(0)),
                unlockReq: CookieJarLib.UnlockRequirement(address(0)),
                hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
                hatsReq: CookieJarLib.HatsRequirement(0, address(0))
            })
        );
    }

    /// @notice Creates a new CookieJar contract using default fee percentage
    function createCookieJar(
        address _cookieJarOwner,
        address _supportedCurrency,
        CookieJarLib.AccessType _accessType,
        address[] calldata _nftAddresses,
        CookieJarLib.NFTType[] calldata _nftTypes,
        CookieJarLib.WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        bool _strictPurpose,
        bool _emergencyWithdrawalEnabled,
        bool _oneTimeWithdrawal,
        address[] calldata _allowlist,
        string calldata metadata
    ) external onlyNotBlacklisted(msg.sender) returns (address) {
        return _createJarInternal(
            CookieJarLib.CreateJarParams({
                cookieJarOwner: _cookieJarOwner,
                supportedCurrency: _supportedCurrency,
                accessType: _accessType,
                withdrawalOption: _withdrawalOption,
                fixedAmount: _fixedAmount,
                maxWithdrawal: _maxWithdrawal,
                withdrawalInterval: _withdrawalInterval,
                strictPurpose: _strictPurpose,
                emergencyWithdrawalEnabled: _emergencyWithdrawalEnabled,
                oneTimeWithdrawal: _oneTimeWithdrawal,
                metadata: metadata,
                customFeePercentage: 0 // Use default fee
            }),
            CookieJarLib.AccessConfig({
                nftAddresses: _nftAddresses,
                nftTypes: _nftTypes,
                allowlist: _allowlist,
                poapReq: CookieJarLib.POAPRequirement(0, address(0)),
                unlockReq: CookieJarLib.UnlockRequirement(address(0)),
                hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
                hatsReq: CookieJarLib.HatsRequirement(0, address(0))
            })
        );
    }

    /// @notice Optimized jar creation using parameter structs
    function createCookieJarOptimized(
        CookieJarLib.CreateJarParams calldata params,
        CookieJarLib.AccessConfig calldata accessConfig
    ) external onlyNotBlacklisted(msg.sender) returns (address) {
        return _createJarInternal(params, accessConfig);
    }

    /// @notice Internal function to handle jar creation logic (stack optimized)
    /// @param params Grouped jar configuration parameters  
    /// @param accessConfig Access control settings
    /// @return jarAddress Address of the deployed jar
    function _createJarInternal(
        CookieJarLib.CreateJarParams memory params,
        CookieJarLib.AccessConfig memory accessConfig
    ) internal returns (address jarAddress) {
        // Validate metadata
        if (bytes(params.metadata).length == 0) revert CookieJarFactory__InvalidMetadata();
        if (bytes(params.metadata).length > 8192) revert CookieJarFactory__MetadataTooLong();

        // Determine minimum deposit based on currency type
        uint256 minDeposit = minETHDeposit;
        if (params.supportedCurrency != CookieJarLib.ETH_ADDRESS) {
            if (ERC20(params.supportedCurrency).decimals() == 0) revert CookieJarFactory__NotValidERC20();
            minDeposit = minERC20Deposit;
        }

        // Handle fee percentage (use custom if provided, otherwise default)
        uint256 feePerc = params.customFeePercentage == 0 ? defaultFeePercentage : params.customFeePercentage;
        if (feePerc > CookieJarLib.PERCENTAGE_BASE) feePerc = CookieJarLib.PERCENTAGE_BASE;

        // Create jar configuration
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
            oneTimeWithdrawal: params.oneTimeWithdrawal
        });

        return _deployJar(config, accessConfig, params.metadata);
    }

    /// @notice Internal helper to deploy jar and update contract storage
    /// @param config Jar configuration struct
    /// @param accessConfig Access control configuration
    /// @param metadata Jar metadata string
    /// @return jarAddress Address of deployed jar
    function _deployJar(
        CookieJarLib.JarConfig memory config,
        CookieJarLib.AccessConfig memory accessConfig,
        string memory metadata
    ) internal returns (address jarAddress) {
        // Deploy the new CookieJar
        CookieJar newJar = new CookieJar(config, accessConfig);
        jarAddress = address(newJar);
        
        // Update contract storage
        uint256 newIndex = cookieJars.length;
        cookieJars.push(jarAddress);
        metadatas.push(metadata);
        jarIndex[jarAddress] = newIndex;

        // Emit event
        emit CookieJarCreated(msg.sender, jarAddress, metadata);
    }
}
