// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IUniswapV2Router02
/// @notice Interface for Uniswap V2 Router
interface IUniswapV2Router02 {
    /// @notice Get WETH address
    function WETH() external pure returns (address);

    /// @notice Swap exact tokens for tokens
    /// @param amountIn Amount of input tokens
    /// @param amountOutMin Minimum amount of output tokens
    /// @param path Array of token addresses representing the swap path
    /// @param to Recipient address
    /// @param deadline Transaction deadline
    /// @return amounts Array of input/output amounts
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /// @notice Swap exact ETH for tokens
    /// @param amountOutMin Minimum amount of output tokens
    /// @param path Array of token addresses representing the swap path
    /// @param to Recipient address
    /// @param deadline Transaction deadline
    /// @return amounts Array of input/output amounts
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /// @notice Swap exact tokens for ETH
    /// @param amountIn Amount of input tokens
    /// @param amountOutMin Minimum amount of output ETH
    /// @param path Array of token addresses representing the swap path
    /// @param to Recipient address
    /// @param deadline Transaction deadline
    /// @return amounts Array of input/output amounts
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /// @notice Get amounts out for given input
    /// @param amountIn Amount of input tokens
    /// @param path Array of token addresses representing the swap path
    /// @return amounts Array of expected output amounts
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    /// @notice Get amounts in for given output
    /// @param amountOut Amount of output tokens
    /// @param path Array of token addresses representing the swap path
    /// @return amounts Array of required input amounts
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}