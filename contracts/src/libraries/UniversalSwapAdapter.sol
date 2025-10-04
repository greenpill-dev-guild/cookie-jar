// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IWNative} from "../interfaces/IWNative.sol";

// Import actual Universal Router contracts
import {IUniversalRouter} from "universal-router/contracts/interfaces/IUniversalRouter.sol";
import {Commands} from "universal-router/contracts/libraries/Commands.sol";

/// @title UniversalSwapAdapter
/// @notice Adapter for Uniswap Universal Router using official contracts and interfaces
/// @dev Uses actual Universal Router addresses and Permit2 for token approvals
library UniversalSwapAdapter {
    using SafeERC20 for IERC20;

    /// @notice Custom errors
    error SwapFailed(string reason);
    error InsufficientOutput(uint256 amountOut, uint256 minAmountOut);
    error UnsupportedChain(uint256 chainId);
    error ZeroAmount();
    error ZeroAddress();

    /// @notice Official Universal Router addresses from Uniswap v4 deployments
    /// @dev Source: https://docs.uniswap.org/contracts/v4/deployments
    function getUniversalRouter(uint256 chainId) internal pure returns (address) {
        // Mainnet deployments
        if (chainId == 1) return 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af; // Ethereum
        if (chainId == 8453) return 0x198d7387Fa97A73F05b8578CdEFf8F2A1f34Cd1F; // Base
        if (chainId == 10) return 0xb555edF5dcF85f42cEeF1f3630a52A108E55A654; // Optimism
        if (chainId == 42161) return 0x5E325eDA8064b456f4781070C0738d849c824258; // Arbitrum One
        if (chainId == 137) return 0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2; // Polygon
        if (chainId == 81457) return 0x334e3F7f5A9740627fA47Fa9Aa51cE0ccbD765cF; // Blast
        if (chainId == 7777777) return 0x4Dae2f939ACf50408e13d58534Ff8c2776d45265; // Zora
        if (chainId == 480) return 0x4Dae2f939ACf50408e13d58534Ff8c2776d45265; // Worldchain
        if (chainId == 130) return 0xEf740bf23aCaE26f6492B10de645D6B98dC8Eaf3; // Unichain

        // Testnet deployments
        if (chainId == 11155111) return 0x4Dae2f939ACf50408e13d58534Ff8c2776d45265; // Sepolia
        if (chainId == 84532) return 0x4Dae2f939ACf50408e13d58534Ff8c2776d45265; // Base Sepolia

        return address(0); // Chain not supported
    }

    /// @notice Get Permit2 address (consistent across all chains)
    function getPermit2() internal pure returns (address) {
        return 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    }

    /// @notice Get wrapped native token address by chain
    function getWNative(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH - Ethereum
        if (chainId == 8453) return 0x4200000000000000000000000000000000000006; // WETH - Base
        if (chainId == 10) return 0x4200000000000000000000000000000000000006; // WETH - Optimism
        if (chainId == 42161) return 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH - Arbitrum
        if (chainId == 137) return 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; // WMATIC - Polygon
        if (chainId == 81457) return 0x4300000000000000000000000000000000000004; // WETH - Blast
        if (chainId == 130) return 0x4200000000000000000000000000000000000006; // WETH - Unichain

        // Testnets
        if (chainId == 11155111) return 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // WETH - Sepolia
        if (chainId == 84532) return 0x4200000000000000000000000000000000000006; // WETH - Base Sepolia

        return address(0);
    }

    /// @notice Universal swap function using actual Universal Router
    /// @param tokenIn Input token address (address(0) for ETH)
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input tokens
    /// @param minAmountOut Minimum output amount (slippage protection)
    /// @param to Recipient address
    /// @return amountOut Actual amount of tokens received
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (tokenIn == tokenOut) return amountIn; // No swap needed

        uint256 chainId = block.chainid;
        address universalRouter = getUniversalRouter(chainId);

        if (universalRouter == address(0)) {
            revert UnsupportedChain(chainId);
        }

        return _swapWithUniversalRouter(tokenIn, tokenOut, amountIn, minAmountOut, to, universalRouter);
    }

    /// @notice Swap ETH for tokens using Universal Router
    function swapExactEthForTokens(
        address tokenOut,
        uint256 minAmountOut,
        address to
    ) internal returns (uint256 amountOut) {
        return
            swapExactInputSingle(
                address(0), // ETH
                tokenOut,
                msg.value,
                minAmountOut,
                to
            );
    }

    function swapExactEthForTokens(
        address tokenOut,
        uint256 ethAmount,
        uint256 minAmountOut,
        address to
    ) internal returns (uint256 amountOut) {
        return
            swapExactInputSingle(
                address(0), // ETH
                tokenOut,
                ethAmount,
                minAmountOut,
                to
            );
    }

    /// @notice Swap tokens for ETH using Universal Router
    function swapExactTokensForEth(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) internal returns (uint256 amountOut) {
        return
            swapExactInputSingle(
                tokenIn,
                address(0), // ETH
                amountIn,
                minAmountOut,
                to
            );
    }

    /// @notice Internal swap using Universal Router with official interfaces
    function _swapWithUniversalRouter(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        address universalRouter
    ) private returns (uint256 amountOut) {
        uint256 chainId = block.chainid;
        address wNative = getWNative(chainId);

        // Handle ETH input
        bool wrapInput = (tokenIn == address(0));
        if (wrapInput) {
            tokenIn = wNative;
            IWNative(wNative).deposit{value: amountIn}();
        }

        // Handle ETH output
        bool unwrapOutput = (tokenOut == address(0));
        if (unwrapOutput) {
            tokenOut = wNative;
        }

        // Approve Permit2 for token spending (Universal Router uses Permit2)
        if (tokenIn != address(0)) {
            IERC20(tokenIn).forceApprove(getPermit2(), amountIn);
        }

        // Build v3 path for Universal Router (tokenIn -> 0.3% fee -> tokenOut)
        bytes memory path = abi.encodePacked(
            tokenIn,
            uint24(3000), // 0.3% fee tier
            tokenOut
        );

        // Build Universal Router command using official Commands library
        bytes memory commands = abi.encodePacked(uint8(Commands.V3_SWAP_EXACT_IN));

        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            unwrapOutput ? address(this) : to, // recipient (use this address for ETH unwrapping)
            amountIn, // amountIn
            minAmountOut, // amountOutMin
            path, // v3 path
            true // payerIsUser (router pulls via Permit2)
        );

        // Track balance before swap
        uint256 balanceBefore;
        if (unwrapOutput) {
            balanceBefore = IERC20(wNative).balanceOf(address(this));
        } else {
            balanceBefore = IERC20(tokenOut).balanceOf(to);
        }

        // Execute swap via Universal Router using official interface
        try
            IUniversalRouter(universalRouter).execute(
                commands,
                inputs,
                block.timestamp + 300 // 5 minute deadline
            )
        {
            // Calculate output amount
            if (unwrapOutput) {
                uint256 wethBalance = IERC20(wNative).balanceOf(address(this));
                amountOut = wethBalance - balanceBefore;

                // Unwrap WETH to ETH and send to recipient
                if (amountOut > 0) {
                    IWNative(wNative).withdraw(amountOut);
                    if (to != address(this)) {
                        (bool success, ) = payable(to).call{value: amountOut}("");
                        if (!success) revert SwapFailed("ETH transfer failed");
                    }
                }
            } else {
                amountOut = IERC20(tokenOut).balanceOf(to) - balanceBefore;
            }

            if (amountOut < minAmountOut) {
                revert InsufficientOutput(amountOut, minAmountOut);
            }
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert SwapFailed("Universal Router swap failed");
            } else {
                // Propagate the original error
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    /// @notice Get estimated output amount (simplified - 0.3% fee deduction)
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        if (tokenIn == tokenOut) return amountIn;

        // Simplified calculation (0.3% fee)
        amountOut = (amountIn * 997) / 1000;
        return amountOut;
    }

    /// @notice Check if Universal Router is available on current chain
    function isUniversalRouterAvailable() internal view returns (bool available) {
        return getUniversalRouter(block.chainid) != address(0);
    }

    /// @notice Calculate minimum output with slippage tolerance
    function calculateMinOutput(uint256 amountOut, uint256 slippagePercent) internal pure returns (uint256 minOut) {
        minOut = (amountOut * (10000 - slippagePercent)) / 10000;
    }

    /// @notice Check if swap would be profitable
    function isSwapProfitable(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal pure returns (bool profitable) {
        uint256 estimatedOut = getAmountOut(tokenIn, tokenOut, amountIn);
        return estimatedOut >= minAmountOut;
    }

    /// @notice Get supported chain IDs
    function getSupportedChains() internal pure returns (uint256[] memory chainIds) {
        chainIds = new uint256[](11);
        chainIds[0] = 1; // Ethereum
        chainIds[1] = 8453; // Base
        chainIds[2] = 10; // Optimism
        chainIds[3] = 42161; // Arbitrum One
        chainIds[4] = 137; // Polygon
        chainIds[5] = 81457; // Blast
        chainIds[6] = 7777777; // Zora
        chainIds[7] = 480; // Worldchain
        chainIds[8] = 130; // Unichain
        chainIds[9] = 11155111; // Sepolia
        chainIds[10] = 84532; // Base Sepolia
        return chainIds;
    }
}
