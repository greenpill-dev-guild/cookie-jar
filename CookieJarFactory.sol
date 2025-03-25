// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CookieJar.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @title CookieJarFactory
* @dev Factory contract for creating new CookieJar instances
* with super admin (fee collector) blacklisting capabilities
*/
contract CookieJarFactory is Ownable {
// ============ Events ============
event CookieJarCreated(
    address indexed jarAddress,
    address indexed creator,
    string name,
    string description
);

event JarBlacklistUpdated(address indexed jarAddress, bool isBlacklisted);
event OwnerBlacklistUpdated(address indexed ownerAddress, bool isBlacklisted);
event FeeCollectorUpdated(address indexed newFeeCollector);

// ============ State Variables ============
address public feeCollector;
address[] public cookieJars;
mapping(address => bool) public isCookieJar;

// Blacklist mappings
mapping(address => bool) public blacklistedJars;
mapping(address => bool) public blacklistedOwners;

// ============ Modifiers ============
modifier onlyFeeCollector() {
    require(msg.sender == feeCollector || msg.sender == owner(), "Not authorized");
    _;
}

// ============ Constructor ============
constructor(address _feeCollector) Ownable(msg.sender) {
    require(_feeCollector != address(0), "Invalid fee collector");
    feeCollector = _feeCollector;
}

// ============ External Functions ============

/**
 * @dev Create a new CookieJar
 */
function createCookieJar(
    string memory name,
    string memory description,
    uint256 maxWithdrawalAmount,
    uint256 cooldownPeriod,
    bool requirePurpose,
    bool fixedWithdrawalAmount,
    bool emergencyWithdrawalEnabled,
    bool useWhitelist
) external returns (address) {
    // Check if the creator is blacklisted
    require(!blacklistedOwners[msg.sender], "Creator blacklisted");
    
    CookieJar cookieJar = new CookieJar(
        name,
        description,
        maxWithdrawalAmount,
        cooldownPeriod,
        requirePurpose,
        fixedWithdrawalAmount,
        emergencyWithdrawalEnabled,
        useWhitelist,
        feeCollector
    );
    
    // Transfer ownership to creator
    cookieJar.transferOwnership(msg.sender);
    
    // Register cookie jar
    address jarAddress = address(cookieJar);
    cookieJars.push(jarAddress);
    isCookieJar[jarAddress] = true;
    
    emit CookieJarCreated(jarAddress, msg.sender, name, description);
    
    return jarAddress;
}

/**
 * @dev Update the fee collector address
 */
function setFeeCollector(address _feeCollector) external onlyOwner {
    require(_feeCollector != address(0), "Invalid fee collector");
    
    feeCollector = _feeCollector;
    emit FeeCollectorUpdated(_feeCollector);
}

/**
 * @dev Blacklist a jar (can only be called by fee collector or owner)
 */
function blacklistJar(address jarAddress, bool isBlacklisted) external onlyFeeCollector {
    require(isCookieJar[jarAddress], "Not a registered jar");
    
    blacklistedJars[jarAddress] = isBlacklisted;
    emit JarBlacklistUpdated(jarAddress, isBlacklisted);
}

/**
 * @dev Blacklist an owner (can only be called by fee collector or owner)
 */
function blacklistOwner(address ownerAddress, bool isBlacklisted) external onlyFeeCollector {
    require(ownerAddress != address(0), "Invalid owner address");
    
    blacklistedOwners[ownerAddress] = isBlacklisted;
    emit OwnerBlacklistUpdated(ownerAddress, isBlacklisted);
}

/**
 * @dev Get the number of cookie jars
 */
function getCookieJarsCount() external view returns (uint256) {
    return cookieJars.length;
}

/**
 * @dev Check if a jar is blacklisted
 */
function isJarBlacklisted(address jarAddress) external view returns (bool) {
    return blacklistedJars[jarAddress];
}

/**
 * @dev Check if an owner is blacklisted
 */
function isOwnerBlacklisted(address ownerAddress) external view returns (bool) {
    return blacklistedOwners[ownerAddress];
}
}

