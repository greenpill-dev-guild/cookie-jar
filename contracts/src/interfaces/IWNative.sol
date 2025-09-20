// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IWNative
/// @notice Interface for wrapped native tokens (WETH, WCELO, etc.)
interface IWNative {
    /// @notice Deposit native tokens and receive wrapped tokens
    function deposit() external payable;

    /// @notice Withdraw native tokens by burning wrapped tokens
    /// @param amount Amount to withdraw
    function withdraw(uint256 amount) external;

    /// @notice Get balance of wrapped tokens
    /// @param account Account to check
    /// @return balance The balance
    function balanceOf(address account) external view returns (uint256 balance);

    /// @notice Transfer wrapped tokens
    /// @param to Recipient
    /// @param amount Amount to transfer
    /// @return success Transfer success
    function transfer(address to, uint256 amount) external returns (bool success);

    /// @notice Transfer wrapped tokens from one account to another
    /// @param from Sender
    /// @param to Recipient
    /// @param amount Amount to transfer
    /// @return success Transfer success
    function transferFrom(address from, address to, uint256 amount) external returns (bool success);

    /// @notice Approve spending of wrapped tokens
    /// @param spender Approved spender
    /// @param amount Amount to approve
    /// @return success Approval success
    function approve(address spender, uint256 amount) external returns (bool success);
}