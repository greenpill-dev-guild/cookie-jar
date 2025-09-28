// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CookieJarLib.sol";
import "./AdminLib.sol";

/// @title AccessInitializer
/// @notice Library for initializing access control to reduce constructor complexity
/// @dev Factory pattern implementation to split complex constructor logic
library AccessInitializer {
    
    /// @notice Initialize access control based on access type
    /// @param accessType The type of access control to initialize
    /// @param accessConfig Configuration for the access control
    /// @param nftGates Storage reference to NFT gates array
    /// @param nftGateMapping Storage reference to NFT gate mapping
    /// @param nftGateIndex Storage reference to NFT gate index mapping
    /// @param poapRequirement Storage reference to POAP requirement
    /// @param unlockRequirement Storage reference to Unlock requirement
    /// @param hypercertRequirement Storage reference to Hypercert requirement
    /// @param hatsRequirement Storage reference to Hats requirement
    function initializeAccess(
        CookieJarLib.AccessType accessType,
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.NFTGate[] storage nftGates,
        mapping(address => CookieJarLib.NFTType) storage nftGateMapping,
        mapping(address => uint256) storage nftGateIndex,
        CookieJarLib.POAPRequirement storage poapRequirement,
        CookieJarLib.UnlockRequirement storage unlockRequirement,
        CookieJarLib.HypercertRequirement storage hypercertRequirement,
        CookieJarLib.HatsRequirement storage hatsRequirement
    ) internal {
        if (accessType == CookieJarLib.AccessType.Allowlist) {
            _initAllowlist(accessConfig);
        } else if (accessType == CookieJarLib.AccessType.NFTGated) {
            _initNFTGated(accessConfig, nftGates, nftGateMapping, nftGateIndex);
        } else if (accessType == CookieJarLib.AccessType.POAP) {
            _initPOAP(accessConfig, poapRequirement);
        } else if (accessType == CookieJarLib.AccessType.Unlock) {
            _initUnlock(accessConfig, unlockRequirement);
        } else if (accessType == CookieJarLib.AccessType.Hypercert) {
            _initHypercert(accessConfig, hypercertRequirement);
        } else if (accessType == CookieJarLib.AccessType.Hats) {
            _initHats(accessConfig, hatsRequirement);
        } else {
            revert CookieJarLib.InvalidAccessType();
        }
    }
    
    /// @notice Initialize allowlist access control
    /// @param accessConfig Configuration containing allowlist data
    function _initAllowlist(CookieJarLib.AccessConfig memory accessConfig) private pure {
        // Allowlist mode - only allowlist should be provided
        if (accessConfig.nftAddresses.length > 0) {
            revert CookieJarLib.AllowlistNotAllowedForNFTGated();
        }
        // Note: Actual allowlist role assignment happens in main contract
        // due to AccessControl inheritance requirements
    }
    
    /// @notice Initialize NFT-gated access control
    /// @param accessConfig Configuration containing NFT data
    /// @param nftGates Storage reference to NFT gates array
    /// @param nftGateMapping Storage reference to NFT gate mapping
    /// @param nftGateIndex Storage reference to NFT gate index mapping
    function _initNFTGated(
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.NFTGate[] storage nftGates,
        mapping(address => CookieJarLib.NFTType) storage nftGateMapping,
        mapping(address => uint256) storage nftGateIndex
    ) private {
        if (accessConfig.nftAddresses.length == 0) {
            revert CookieJarLib.NoNFTAddressesProvided();
        }
        if (accessConfig.nftAddresses.length != accessConfig.nftTypes.length) {
            revert CookieJarLib.NFTArrayLengthMismatch();
        }
        if (accessConfig.allowlist.length > 0) {
            revert CookieJarLib.AllowlistNotAllowedForNFTGated();
        }
        
        for (uint256 i = 0; i < accessConfig.nftAddresses.length; i++) {
            AdminLib.addNFTGate(
                nftGates,
                nftGateMapping,
                nftGateIndex,
                accessConfig.nftAddresses[i],
                accessConfig.nftTypes[i]
            );
        }
    }
    
    /// @notice Initialize POAP access control
    /// @param accessConfig Configuration containing POAP data
    /// @param poapRequirement Storage reference to POAP requirement
    function _initPOAP(
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.POAPRequirement storage poapRequirement
    ) private {
        if (accessConfig.poapReq.eventId == 0) {
            revert CookieJarLib.InvalidAccessType();
        }
        if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) {
            revert CookieJarLib.InvalidAccessType();
        }
        poapRequirement.eventId = accessConfig.poapReq.eventId;
        poapRequirement.poapContract = accessConfig.poapReq.poapContract;
    }
    
    /// @notice Initialize Unlock Protocol access control
    /// @param accessConfig Configuration containing Unlock data
    /// @param unlockRequirement Storage reference to Unlock requirement
    function _initUnlock(
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.UnlockRequirement storage unlockRequirement
    ) private {
        if (accessConfig.unlockReq.lockAddress == address(0)) {
            revert CookieJarLib.InvalidAccessType();
        }
        if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) {
            revert CookieJarLib.InvalidAccessType();
        }
        unlockRequirement.lockAddress = accessConfig.unlockReq.lockAddress;
        unlockRequirement.requireValidKey = accessConfig.unlockReq.requireValidKey;
    }
    
    /// @notice Initialize Hypercert access control
    /// @param accessConfig Configuration containing Hypercert data
    /// @param hypercertRequirement Storage reference to Hypercert requirement
    function _initHypercert(
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.HypercertRequirement storage hypercertRequirement
    ) private {
        if (accessConfig.hypercertReq.hypercertContract == address(0)) {
            revert CookieJarLib.InvalidAccessType();
        }
        if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) {
            revert CookieJarLib.InvalidAccessType();
        }
        
        hypercertRequirement.hypercertContract = accessConfig.hypercertReq.hypercertContract;
        hypercertRequirement.requiredFractions = accessConfig.hypercertReq.requiredFractions;
        hypercertRequirement.allowedCreators = accessConfig.hypercertReq.allowedCreators;
        hypercertRequirement.tokenId = accessConfig.hypercertReq.tokenId;
        hypercertRequirement.tokenContract = accessConfig.hypercertReq.tokenContract;
        hypercertRequirement.minBalance = accessConfig.hypercertReq.minBalance;
    }
    
    /// @notice Initialize Hats Protocol access control
    /// @param accessConfig Configuration containing Hats data
    /// @param hatsRequirement Storage reference to Hats requirement
    function _initHats(
        CookieJarLib.AccessConfig memory accessConfig,
        CookieJarLib.HatsRequirement storage hatsRequirement
    ) private {
        if (accessConfig.hatsReq.hatId == 0 || accessConfig.hatsReq.hatsContract == address(0)) {
            revert CookieJarLib.InvalidAccessType();
        }
        if (accessConfig.nftAddresses.length > 0 || accessConfig.allowlist.length > 0) {
            revert CookieJarLib.InvalidAccessType();
        }
        
        hatsRequirement.hatId = accessConfig.hatsReq.hatId;
        hatsRequirement.hatsContract = accessConfig.hatsReq.hatsContract;
    }
    
    /// @notice Validate configuration parameters before initialization
    /// @param config Main jar configuration
    /// @param accessConfig Access control configuration
    function validateConfiguration(
        CookieJarLib.JarConfig memory config,
        CookieJarLib.AccessConfig memory accessConfig
    ) internal pure {
        // Basic validation
        if (config.jarOwner == address(0)) {
            revert CookieJarLib.AdminCannotBeZeroAddress();
        }
        if (config.feeCollector == address(0)) {
            revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        }
        
        // Validate withdrawal configuration
        if (config.withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (config.fixedAmount == 0) revert CookieJarLib.ZeroAmount();
        } else {
            if (config.maxWithdrawal == 0) revert CookieJarLib.ZeroAmount();
        }
        
        // Validate fee percentage
        if (config.feePercentageOnDeposit > CookieJarLib.MAX_FEE_PERCENTAGE) {
            revert CookieJarLib.InvalidTokenAddress(); // Reusing error for now
        }
        
        // Access type specific validation
        if (config.accessType == CookieJarLib.AccessType.NFTGated) {
            if (accessConfig.nftAddresses.length == 0) {
                revert CookieJarLib.NoNFTAddressesProvided();
            }
            if (accessConfig.nftAddresses.length != accessConfig.nftTypes.length) {
                revert CookieJarLib.NFTArrayLengthMismatch();
            }
            if (accessConfig.nftAddresses.length > CookieJarLib.MAX_NFT_GATES) {
                revert CookieJarLib.TooManyNFTGates();
            }
        }
        
        // Validate streaming configuration if enabled
        if (config.streamingConfig.enabled) {
            if (config.streamingConfig.minFlowRate == 0) {
                revert CookieJarLib.InvalidStreamRate();
            }
        }
    }
}
