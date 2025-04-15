// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";
import "./CookieJarFactory.sol";

/**
 * @title CookieJarRegistry.
 * @notice Handles registering deployed "cookie jars" and stores all the jar's data into this contract.
 */
contract CookieJarRegistry {
    /// @dev The designated factory instance that is allowed to update the registry.
    CookieJarFactory public cookieJarFactory;

    // --- Custom Errors ---
    error CookieJarRegistry__OnlyFactoryCanCall();
    error CookieJarRegistry__FactoryAlreadySet();
    error CookieJarRegistry__NotValidJarAddress();
    error CookieJarRegistry__NotOwner();

    // --- Events ---
    event GlobalWhitelistUpdated(address indexed user, bool status);
    event GlobalBlacklistUpdated(address indexed user, bool status);
    event CookieJarRegistered(CookieJar jarInstance);
    event CookieJarFactorySet(address factory);

    /// @dev Struct to store detailed data about each CookieJar.
    struct CookieJarInfo {
        address jarAddress;
        address currency;
        address jarCreator;
        string metadata;
        uint256 registrationTime;
        CookieJarLib.AccessType accessType;
        CookieJarLib.NFTGate[] nftGates;
        CookieJarLib.WithdrawalTypeOptions withdrawalOption;
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        bool strictPurpose;
        bool emergencyWithdrawalEnabled;
        bool oneTimeWithdrawal;
    }

    /// @dev Array to track registered CookieJar structs.
    CookieJarInfo[] public registeredCookieJars;

    /// @dev Mapping from creator address to their respective CookieJarInfo struct.
    mapping(address => CookieJarInfo) public jarCreatorToJar;

    constructor() {}

    // --- Modifiers ---
    /// @dev Modifier to restrict functions to the authorized factory.
    modifier onlyCookieJarFactory() {
        if (msg.sender != address(cookieJarFactory)) {
            revert CookieJarRegistry__OnlyFactoryCanCall();
        }
        _;
    }

    /// @dev Modifier to restrict functions to the owner of the jar.
    modifier onlyOwner(address _user) {
        if (cookieJarFactory.hasRole(cookieJarFactory.OWNER(), _user) != true) {
            revert CookieJarRegistry__NotOwner();
        }
        _;
    }

    /**
     * @notice Sets the factory instance that is allowed to update the registry.
     * @param _factory Address of the factory contract.
     */
    function setCookieJarFactory(address _factory) external {
        if (address(cookieJarFactory) != address(0)) {
            revert CookieJarRegistry__FactoryAlreadySet();
        }
        cookieJarFactory = CookieJarFactory(_factory);
        emit CookieJarFactorySet(_factory);
    }

    /**
     * @notice Registers a new CookieJar contract and stores its data in the registry.
     * @param _jarInstance Instance of the CookieJar contract.
     * @param _metadata Optional metadata for off-chain tracking.
     */
    function registerAndStoreCookieJar(
        CookieJar _jarInstance,
        string memory _metadata
    ) external onlyCookieJarFactory {
        if (address(_jarInstance) == address(0)) {
            revert CookieJarRegistry__NotValidJarAddress();
        }

        CookieJarInfo memory tempJar = CookieJarInfo({
            jarAddress: address(_jarInstance),
            currency: _jarInstance.currency(),
            jarCreator: _jarInstance.jarOwner(),
            metadata: _metadata,
            registrationTime: block.timestamp,
            accessType: _jarInstance.accessType(),
            nftGates: _jarInstance.getNFTGatesArray(),
            withdrawalOption: _jarInstance.withdrawalOption(),
            fixedAmount: _jarInstance.fixedAmount(),
            maxWithdrawal: _jarInstance.maxWithdrawal(),
            withdrawalInterval: _jarInstance.withdrawalInterval(),
            strictPurpose: _jarInstance.strictPurpose(),
            emergencyWithdrawalEnabled: _jarInstance
                .emergencyWithdrawalEnabled(),
            oneTimeWithdrawal: _jarInstance.oneTimeWithdrawal()
        });
        registeredCookieJars.push(tempJar);
        jarCreatorToJar[_jarInstance.jarOwner()] = tempJar;
        emit CookieJarRegistered(_jarInstance);
    }

    /**
     * @return Number of registered CookieJars in the protocol..
     */
    function getRegisteredCookieJarsCount() external view returns (uint256) {
        return registeredCookieJars.length;
    }

    /**
     * @return Array of all registered CookieJars in the protocol.
     */
    function getAllJars() external view returns (CookieJarInfo[] memory) {
        return registeredCookieJars;
    }

    /**
     * @param _jarCreator Address of the jar creator.
     * @return Jar details for the given creator.
     */
    function getJarByCreatorAddress(
        address _jarCreator
    ) external view returns (CookieJarInfo memory) {
        return jarCreatorToJar[_jarCreator];
    }
}
