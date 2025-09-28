// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CookieJarLib.sol";

/// @title AdminLib
/// @notice Library for administrative functions to reduce main contract size
/// @dev Extracted from CookieJar to improve modularity and maintainability
library AdminLib {
    using SafeERC20 for IERC20;
    
    /// @notice Updates withdrawal limits with proper validation
    /// @param withdrawalOption The withdrawal type (Fixed or Variable)
    /// @param newAmount The new withdrawal amount
    /// @param currentFixedAmount Current fixed amount (for Fixed type)
    /// @param currentMaxWithdrawal Current max withdrawal (for Variable type)
    function updateWithdrawalLimits(
        CookieJarLib.WithdrawalTypeOptions withdrawalOption,
        uint256 newAmount,
        uint256 currentFixedAmount,
        uint256 currentMaxWithdrawal
    ) internal returns (uint256 updatedFixed, uint256 updatedMax) {
        if (newAmount == 0) revert CookieJarLib.ZeroAmount();
        
        if (withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            updatedFixed = newAmount;
            updatedMax = currentMaxWithdrawal;
            emit CookieJarLib.FixedWithdrawalAmountUpdated(newAmount);
        } else {
            updatedFixed = currentFixedAmount;
            updatedMax = newAmount;
            emit CookieJarLib.MaxWithdrawalUpdated(newAmount);
        }
    }
    
    /// @notice Adds NFT gate with comprehensive validation
    /// @param nftGates Current NFT gates array
    /// @param nftGateMapping Mapping for gate lookup
    /// @param nftGateIndex Index mapping for O(1) removal
    /// @param nftAddress Address of NFT contract
    /// @param nftType Type of NFT (ERC721/ERC1155)
    function addNFTGate(
        CookieJarLib.NFTGate[] storage nftGates,
        mapping(address => CookieJarLib.NFTType) storage nftGateMapping,
        mapping(address => uint256) storage nftGateIndex,
        address nftAddress,
        CookieJarLib.NFTType nftType
    ) internal {
        if (nftAddress == address(0)) revert CookieJarLib.InvalidNFTGate();
        if (nftType == CookieJarLib.NFTType.None) revert CookieJarLib.InvalidNFTType();
        if (nftGateMapping[nftAddress] != CookieJarLib.NFTType.None) revert CookieJarLib.DuplicateNFTGate();
        if (nftGates.length >= CookieJarLib.MAX_NFT_GATES) revert CookieJarLib.TooManyNFTGates();
        
        CookieJarLib.NFTGate memory gate = CookieJarLib.NFTGate({
            nftAddress: nftAddress, 
            nftType: nftType,
            threshold: 1
        });
        
        uint256 newIndex = nftGates.length;
        nftGates.push(gate);
        nftGateMapping[nftAddress] = nftType;
        nftGateIndex[nftAddress] = newIndex;
        
        emit CookieJarLib.NFTGateAdded(nftAddress, nftType);
    }
    
    /// @notice Removes NFT gate with index optimization
    /// @param nftGates Current NFT gates array
    /// @param nftGateMapping Mapping for gate lookup
    /// @param nftGateIndex Index mapping for O(1) removal
    /// @param nftAddress Address of NFT contract to remove
    function removeNFTGate(
        CookieJarLib.NFTGate[] storage nftGates,
        mapping(address => CookieJarLib.NFTType) storage nftGateMapping,
        mapping(address => uint256) storage nftGateIndex,
        address nftAddress
    ) internal {
        if (nftGateMapping[nftAddress] == CookieJarLib.NFTType.None) {
            revert CookieJarLib.NFTGateNotFound();
        }
        
        uint256 gateIndex = nftGateIndex[nftAddress];
        uint256 lastIndex = nftGates.length - 1;
        
        // If not the last element, swap with last and update its index
        if (gateIndex != lastIndex) {
            address lastGateAddress = nftGates[lastIndex].nftAddress;
            nftGates[gateIndex] = nftGates[lastIndex];
            nftGateIndex[lastGateAddress] = gateIndex;
        }
        
        // Remove the last element and clean up mappings
        nftGates.pop();
        delete nftGateMapping[nftAddress];
        delete nftGateIndex[nftAddress];
        
        emit CookieJarLib.NFTGateRemoved(nftAddress);
    }
    
    /// @notice Performs emergency withdrawal with comprehensive validation
    /// @param token Token address (address(3) for ETH, ERC20 otherwise)
    /// @param amount Amount to withdraw
    /// @param currency Jar's supported currency
    /// @param currencyHeldByJar Current jar balance
    /// @param emergencyEnabled Whether emergency withdrawal is enabled
    /// @param recipient Recipient address
    function performEmergencyWithdrawal(
        address token,
        uint256 amount,
        address currency,
        uint256 currencyHeldByJar,
        bool emergencyEnabled,
        address recipient
    ) internal returns (uint256 newCurrencyBalance) {
        if (!emergencyEnabled) revert CookieJarLib.EmergencyWithdrawalDisabled();
        if (amount == 0) revert CookieJarLib.ZeroAmount();
        
        newCurrencyBalance = currencyHeldByJar;
        
        if (token == currency) {
            if (currencyHeldByJar < amount) revert CookieJarLib.InsufficientBalance();
            newCurrencyBalance = currencyHeldByJar - amount;
        }
        
        emit CookieJarLib.EmergencyWithdrawal(recipient, token, amount);
        
        if (token == CookieJarLib.ETH_ADDRESS) {
            (bool sent, ) = recipient.call{value: amount}("");
            if (!sent) revert CookieJarLib.TransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }
    
    /// @notice Updates fee collector with validation
    /// @param currentCollector Current fee collector address
    /// @param newCollector New fee collector address
    /// @param sender Message sender for authorization
    function updateFeeCollector(
        address currentCollector,
        address newCollector,
        address sender
    ) internal returns (address) {
        if (sender != currentCollector) revert CookieJarLib.NotFeeCollector();
        if (newCollector == address(0)) revert CookieJarLib.FeeCollectorAddressCannotBeZeroAddress();
        
        emit CookieJarLib.FeeCollectorUpdated(currentCollector, newCollector);
        return newCollector;
    }
}
