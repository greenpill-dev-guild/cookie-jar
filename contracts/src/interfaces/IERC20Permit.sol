// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC20Permit
/// @notice Interface for ERC20 tokens with permit functionality (EIP-2612)
interface IERC20Permit {
    /// @notice Approve tokens via signature
    /// @param owner Token owner
    /// @param spender Approved spender
    /// @param value Amount to approve
    /// @param deadline Permit deadline
    /// @param v Signature v component
    /// @param r Signature r component
    /// @param s Signature s component
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Returns the current nonce for owner
    function nonces(address owner) external view returns (uint256);

    /// @notice Returns the domain separator
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}