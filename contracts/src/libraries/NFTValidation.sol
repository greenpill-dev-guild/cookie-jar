// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./CookieJarLib.sol";

/// @title NFTValidation - Gas-optimized and secure NFT validation library
/// @notice Provides safe NFT validation with gas limits and race condition protection
library NFTValidation {
    
    /// @notice Validates NFT ownership with gas limits and malicious contract protection
    /// @param nftContract The NFT contract address to validate
    /// @param tokenId The token ID to check ownership for
    /// @param expectedOwner The address expected to own the token
    /// @param nftType The type of NFT (ERC721 or ERC1155)
    /// @return success Whether validation succeeded
    function validateNFTOwnershipWithGasLimit(
        address nftContract,
        uint256 tokenId,
        address expectedOwner,
        CookieJarLib.NFTType nftType
    ) internal returns (bool success) {
        uint256 gasStart = gasleft();
        
        if (nftType == CookieJarLib.NFTType.ERC721) {
            try IERC721(nftContract).ownerOf{gas: CookieJarLib.MAX_NFT_VALIDATION_GAS}(tokenId) returns (address owner) {
                if (owner != expectedOwner) {
                    revert CookieJarLib.NotAuthorized();
                }
            } catch {
                revert CookieJarLib.NFTValidationFailed();
            }
        } else if (nftType == CookieJarLib.NFTType.ERC1155) {
            try IERC1155(nftContract).balanceOf{gas: CookieJarLib.MAX_NFT_VALIDATION_GAS}(expectedOwner, tokenId) returns (uint256 balance) {
                if (balance == 0) {
                    revert CookieJarLib.NotAuthorized();
                }
            } catch {
                revert CookieJarLib.NFTValidationFailed();
            }
        } else {
            revert CookieJarLib.InvalidNFTType();
        }
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Warn if gas usage is suspiciously high (80% of limit)
        if (gasUsed > (CookieJarLib.MAX_NFT_VALIDATION_GAS * 80) / 100) {
            emit CookieJarLib.HighGasUsageWarning(nftContract, gasUsed);
        }
        
        return true;
    }
    
    /// @notice Validates ERC1155 balance with race condition protection
    /// @param nftContract The ERC1155 contract address
    /// @param tokenId The token ID to check
    /// @param user The user address
    /// @param expectedMinBalance The minimum expected balance
    /// @param blockNumberSnapshot The block number when balance was checked
    /// @return actualBalance The current balance
    function validateERC1155BalanceWithProof(
        address nftContract,
        uint256 tokenId,
        address user,
        uint256 expectedMinBalance,
        uint256 blockNumberSnapshot
    ) internal view returns (uint256 actualBalance) {
        // Check if balance proof is not too stale
        if (block.number - blockNumberSnapshot > CookieJarLib.MAX_BALANCE_PROOF_AGE) {
            revert CookieJarLib.StaleBalanceProof();
        }
        
        // Get current balance with gas protection
        try IERC1155(nftContract).balanceOf{gas: CookieJarLib.MAX_NFT_VALIDATION_GAS}(user, tokenId) returns (uint256 balance) {
            actualBalance = balance;
            
            // Verify user still has minimum required balance
            if (actualBalance < expectedMinBalance) {
                revert CookieJarLib.InsufficientNFTBalance();
            }
        } catch {
            revert CookieJarLib.NFTValidationFailed();
        }
    }
    
    /// @notice Validates quantity-based requirements for ERC1155 tokens
    /// @param userBalance The user's current balance
    /// @param minQuantity Minimum quantity required (0 = no minimum)
    /// @param maxQuantity Maximum quantity allowed (0 = no maximum)
    /// @return isValid Whether the quantity requirements are met
    function validateQuantityRequirements(
        uint256 userBalance,
        uint32 minQuantity,
        uint32 maxQuantity
    ) internal pure returns (bool isValid) {
        // Check minimum quantity requirement
        if (minQuantity > 0 && userBalance < minQuantity) {
            return false;
        }
        
        // Check maximum quantity requirement (0 means unlimited)
        if (maxQuantity > 0 && userBalance > maxQuantity) {
            return false;
        }
        
        return true;
    }
    
    /// @notice Safely checks if a contract supports an interface with gas limits
    /// @param contractAddr The contract to check
    /// @param interfaceId The interface ID to check for
    /// @return supported Whether the interface is supported
    function supportsInterfaceWithGasLimit(
        address contractAddr,
        bytes4 interfaceId
    ) internal view returns (bool supported) {
        try IERC165(contractAddr).supportsInterface{gas: 30000}(interfaceId) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }
    
    /// @notice Validates that an NFT contract supports the expected interface
    /// @param nftContract The contract to validate
    /// @param expectedType The expected NFT type
    /// @return isValid Whether the contract supports the expected interface
    function validateContractInterface(
        address nftContract,
        CookieJarLib.NFTType expectedType
    ) internal view returns (bool isValid) {
        if (expectedType == CookieJarLib.NFTType.ERC721) {
            return supportsInterfaceWithGasLimit(nftContract, type(IERC721).interfaceId);
        } else if (expectedType == CookieJarLib.NFTType.ERC1155) {
            return supportsInterfaceWithGasLimit(nftContract, type(IERC1155).interfaceId);
        }
        return false;
    }
}
