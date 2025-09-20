// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV3Router.sol";
import "../interfaces/IWNative.sol";

/// @title DexAdapter
/// @notice Library for handling DEX swaps across Uniswap V2 and V3
library DexAdapter {
    using SafeERC20 for IERC20;

    /// @notice Swap exact tokens for tokens using Uniswap V2
    /// @param router Uniswap V2 router address
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input tokens
    /// @param minOut Minimum amount of output tokens
    /// @param to Recipient address
    /// @param wNative Wrapped native token address
    /// @param path Custom swap path (if empty, will build default path)
    /// @return amountOut Amount of output tokens received
    function swapExactTokensForTokens(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address to,
        address wNative,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        // Build path if not provided
        if (path.length == 0) {
            path = _buildDefaultPath(tokenIn, tokenOut, wNative);
        }
        
        // Validate path
        require(path.length >= 2, "InvalidPath");
        require(path[0] == tokenIn && path[path.length - 1] == tokenOut, "InvalidPath");
        
        // Approve router
        require(IERC20(tokenIn).approve(router, amountIn), "Approval failed");
        
        // Execute swap
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            to,
            block.timestamp + 300 // 5 minute deadline
        );
        
        amountOut = amounts[amounts.length - 1];
        
        // Reset approval to zero if needed
        _resetApprovalIfNeeded(tokenIn, router);
    }

    /// @notice Swap exact ETH for tokens using Uniswap V2
    /// @param router Uniswap V2 router address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of ETH input
    /// @param minOut Minimum amount of output tokens
    /// @param to Recipient address
    /// @param wNative Wrapped native token address
    /// @param path Custom swap path (if empty, will build default path)
    /// @return amountOut Amount of output tokens received
    function swapExactETHForTokens(
        address router,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address to,
        address wNative,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        // Build path if not provided
        if (path.length == 0) {
            path = new address[](2);
            path[0] = wNative;
            path[1] = tokenOut;
        }
        
        // Validate path
        require(path.length >= 2, "InvalidPath");
        require(path[0] == wNative && path[path.length - 1] == tokenOut, "InvalidPath");
        
        // Execute swap
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactETHForTokens{value: amountIn}(
            minOut,
            path,
            to,
            block.timestamp + 300 // 5 minute deadline
        );
        
        amountOut = amounts[amounts.length - 1];
    }

    /// @notice Swap exact tokens for ETH using Uniswap V2
    /// @param router Uniswap V2 router address
    /// @param tokenIn Input token address
    /// @param amountIn Amount of input tokens
    /// @param minOut Minimum amount of output ETH
    /// @param to Recipient address
    /// @param wNative Wrapped native token address
    /// @param path Custom swap path (if empty, will build default path)
    /// @return amountOut Amount of ETH received
    function swapExactTokensForETH(
        address router,
        address tokenIn,
        uint256 amountIn,
        uint256 minOut,
        address to,
        address wNative,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        // Build path if not provided
        if (path.length == 0) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = wNative;
        }
        
        // Validate path
        require(path.length >= 2, "InvalidPath");
        require(path[0] == tokenIn && path[path.length - 1] == wNative, "InvalidPath");
        
        // Approve router
        require(IERC20(tokenIn).approve(router, amountIn), "Approval failed");
        
        // Execute swap
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForETH(
            amountIn,
            minOut,
            path,
            to,
            block.timestamp + 300 // 5 minute deadline
        );
        
        amountOut = amounts[amounts.length - 1];
        
        // Reset approval to zero if needed
        _resetApprovalIfNeeded(tokenIn, router);
    }

    /// @notice Wrap native tokens to wrapped native tokens
    /// @param wNative Wrapped native token address
    /// @param amount Amount to wrap
    function wrapNative(address wNative, uint256 amount) internal {
        IWNative(wNative).deposit{value: amount}();
    }

    /// @notice Unwrap wrapped native tokens to native tokens
    /// @param wNative Wrapped native token address
    /// @param amount Amount to unwrap
    function unwrapToNative(address wNative, uint256 amount) internal {
        IWNative(wNative).withdraw(amount);
    }

    /// @notice Build default swap path between two tokens
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param wNative Wrapped native token address
    /// @return path Default swap path
    function _buildDefaultPath(
        address tokenIn,
        address tokenOut,
        address wNative
    ) private pure returns (address[] memory path) {
        if (tokenIn == wNative || tokenOut == wNative) {
            // Direct path if one token is wNative
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            // Path through wNative
            path = new address[](3);
            path[0] = tokenIn;
            path[1] = wNative;
            path[2] = tokenOut;
        }
    }

    /// @notice Reset token approval to zero if needed (for tokens that require it)
    /// @param token Token address
    /// @param spender Spender address
    function _resetApprovalIfNeeded(address token, address spender) private {
        // Try to set allowance to 0, ignore failures (some tokens don't require this)
        try IERC20(token).approve(spender, 0) {} catch {}
    }

    /// @notice Get expected output amount for V2 swap
    /// @param router Uniswap V2 router address
    /// @param amountIn Input amount
    /// @param path Swap path
    /// @return amountOut Expected output amount
    function getAmountsOut(
        address router,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256 amountOut) {
        require(path.length >= 2, "InvalidPath");
        uint256[] memory amounts = IUniswapV2Router02(router).getAmountsOut(amountIn, path);
        amountOut = amounts[amounts.length - 1];
    }

    /// @notice Check if a swap path is valid
    /// @param tokenIn Input token
    /// @param tokenOut Output token
    /// @param path Swap path
    /// @return valid True if path is valid
    function isValidPath(
        address tokenIn,
        address tokenOut,
        address[] memory path
    ) internal pure returns (bool valid) {
        if (path.length < 2) return false;
        if (path[0] != tokenIn) return false;
        if (path[path.length - 1] != tokenOut) return false;
        return true;
    }
}