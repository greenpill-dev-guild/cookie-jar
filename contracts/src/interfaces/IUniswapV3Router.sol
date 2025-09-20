// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IUniswapV3Router
/// @notice Interface for Uniswap V3 Router (ISwapRouter)
interface IUniswapV3Router {
    /// @notice Parameters for exactInputSingle
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Parameters for exactInput
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Swap exact input single pool
    /// @param params The parameters for the swap
    /// @return amountOut The amount of output tokens received
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    /// @notice Swap exact input multi-hop
    /// @param params The parameters for the swap
    /// @return amountOut The amount of output tokens received
    function exactInput(ExactInputParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    /// @notice Unwrap WETH9 to ETH and transfer to recipient
    /// @param amountMinimum Minimum amount to unwrap
    /// @param recipient Recipient of ETH
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;

    /// @notice Refunds any ETH balance held by this contract to the caller
    function refundETH() external payable;
}