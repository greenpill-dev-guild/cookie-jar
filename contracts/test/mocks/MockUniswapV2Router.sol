// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockUniswapV2Router
/// @notice Mock Uniswap V2 Router for testing
contract MockUniswapV2Router {
    using SafeERC20 for IERC20;

    address public immutable WETH;
    
    // Mock exchange rates: tokenA -> tokenB rate
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    constructor(address _weth) {
        WETH = _weth;
    }

    /// @notice Add a trading pair with exchange rate
    /// @param tokenA Token A address
    /// @param tokenB Token B address  
    /// @param rate Exchange rate (1 tokenA = rate * tokenB)
    function addPair(address tokenA, address tokenB, uint256 rate) external {
        exchangeRates[tokenA][tokenB] = rate;
        exchangeRates[tokenB][tokenA] = 1e18 * 1e18 / rate; // Inverse rate
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // Calculate output amount using mock rate
        uint256 amountOut = amountIn;
        
        // Calculate through multi-hop path
        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenA = path[i];
            address tokenB = path[i + 1];
            uint256 rate = exchangeRates[tokenA][tokenB];
            require(rate > 0, "No rate set for pair");
            amountOut = (amountOut * rate) / 1e18;
        }
        require(amountOut >= amountOutMin, "Insufficient output");
        
        amounts[amounts.length - 1] = amountOut;
        
        // Transfer tokens
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        require(path[0] == WETH, "First token must be WETH");
        
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        
        // Calculate output amount using mock rate
        uint256 amountOut = msg.value;
        
        // Calculate through multi-hop path
        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenA = path[i];
            address tokenB = path[i + 1];
            uint256 rate = exchangeRates[tokenA][tokenB];
            require(rate > 0, "No rate set for pair");
            amountOut = (amountOut * rate) / 1e18;
        }
        require(amountOut >= amountOutMin, "Insufficient output");
        
        amounts[amounts.length - 1] = amountOut;
        
        // Transfer tokens (ETH already received)
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).safeTransfer(to, amountOut);
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        require(path[path.length - 1] == WETH, "Last token must be WETH");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // Calculate output amount using mock rate
        uint256 amountOut = amountIn;
        
        // Calculate through multi-hop path
        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenA = path[i];
            address tokenB = path[i + 1];
            uint256 rate = exchangeRates[tokenA][tokenB];
            require(rate > 0, "No rate set for pair");
            amountOut = (amountOut * rate) / 1e18;
        }
        require(amountOut >= amountOutMin, "Insufficient output");
        
        amounts[amounts.length - 1] = amountOut;
        
        // Transfer tokens
        address tokenIn = path[0];
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        payable(to).transfer(amountOut);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        uint256 amountOut = amountIn;
        
        // Calculate through multi-hop path
        for (uint256 i = 0; i < path.length - 1; i++) {
            address tokenA = path[i];
            address tokenB = path[i + 1];
            uint256 rate = exchangeRates[tokenA][tokenB];
            if (rate == 0) {
                amounts[amounts.length - 1] = 0;
                return amounts;
            }
            amountOut = (amountOut * rate) / 1e18;
        }
        
        amounts[amounts.length - 1] = amountOut;
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        uint256 rate = exchangeRates[tokenIn][tokenOut];
        
        if (rate > 0) {
            amounts[0] = (amountOut * 1e18) / rate;
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}