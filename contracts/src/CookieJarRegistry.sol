// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJar.sol";

contract CookieJarRegistry {
    // The designated factory that is allowed to update the registry.
    address public cookieJarFactory;

    // Global whitelist and blacklist mappings.
    mapping(address => bool) public globalWhitelist;
    mapping(address => bool) public globalBlacklist;

    // --- Custom Errors ---
    error NotAuthorized();
    error AlreadySet();

    // --- Events ---
    event GlobalWhitelistUpdated(address indexed user, bool status);
    event GlobalBlacklistUpdated(address indexed user, bool status);
    event CookieJarRegistered(
        address indexed jarAddress,
        address indexed creator,
        string metadata,
        uint256 registrationTime
    );
    event CookieJarFactorySet(address factory);

    // Struct to store detailed data about each CookieJar.
    struct CookieJarInfo {
        address jarAddress;
        address creator;
        string metadata;
        uint256 registrationTime;
    }

    // Array to track registered CookieJar instances.
    CookieJarInfo[] public registeredCookieJars;

    // No owner constructor.
    constructor() {}

    // Modifier to restrict functions to the authorized factory.
    modifier onlyAuthorized() {
        if (msg.sender != cookieJarFactory) revert NotAuthorized();
        _;
    }

    /// @notice Set the CookieJarFactory address. Can only be set once.
    /// @param _factory The address of the CookieJarFactory.
    function setCookieJarFactory(address _factory) external {
        if (cookieJarFactory != address(0)) revert AlreadySet();
        cookieJarFactory = _factory;
        emit CookieJarFactorySet(_factory);
    }

    /// @notice Update the global whitelist for an address.
    /// @param _user The address to update.
    /// @param _status The new whitelist status.
    function updateGlobalWhitelist(address _user, bool _status) external onlyAuthorized {
        globalWhitelist[_user] = _status;
        emit GlobalWhitelistUpdated(_user, _status);
    }

    /// @notice Update the global blacklist for an address.
    /// @param _user The address to update.
    /// @param _status The new blacklist status.
    function updateGlobalBlacklist(address _user, bool _status) external onlyAuthorized {
        globalBlacklist[_user] = _status;
        emit GlobalBlacklistUpdated(_user, _status);
    }

    /// @notice Registers a new CookieJar in the registry with associated metadata.
    /// @param _jarAddress The deployed CookieJar contract address.
    /// @param _creator The address that created the CookieJar.
    /// @param _metadata Optional metadata for off-chain tracking.
    function registerCookieJar(address _jarAddress, address _creator, string calldata _metadata) external onlyAuthorized {
        registeredCookieJars.push(CookieJarInfo({
            jarAddress: _jarAddress,
            creator: _creator,
            metadata: _metadata,
            registrationTime: block.timestamp
        }));
        emit CookieJarRegistered(_jarAddress, _creator, _metadata, block.timestamp);
    }

    /// @notice Get the number of registered CookieJar contracts.
    function getRegisteredCookieJarsCount() external view returns (uint256) {
        return registeredCookieJars.length;
    }
}
