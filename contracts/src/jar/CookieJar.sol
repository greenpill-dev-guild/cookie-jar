// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IERC20Permit.sol";
import "../interfaces/IWNative.sol";
import "../lib/DexAdapter.sol";

/// @title CookieJar
/// @notice Multi-token Cookie Jar with auto-swap functionality
/// @dev Supports native and ERC-20 deposits with automatic conversion to designated jar token
contract CookieJar is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using DexAdapter for address;

    // === IMMUTABLE STATE ===
    address public immutable jarToken;             // Designated jar token (address(0) for native)
    bool public immutable isNativeJarToken;        // True if jar token is native
    address public immutable router;               // Uniswap router address
    address public immutable wNative;              // Wrapped native token address

    // === STORAGE ===
    /// @notice Pending tokens awaiting manual swap
    mapping(address => uint256) public pendingTokens;

    // === EVENTS ===
    event Deposit(address indexed from, address indexed tokenIn, uint256 amount);
    event DepositConverted(address indexed from, address indexed tokenIn, uint256 amountIn, address indexed jarToken, uint256 amountOut);
    event DepositPendingSwap(address indexed from, address indexed tokenIn, uint256 amount);
    event ManualSwapExecuted(address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event Withdraw(address indexed to, uint256 amount);
    event TransferOut(address indexed to, uint256 amount);
    event Sweep(address indexed token, uint256 amount, address indexed to);

    // === ERRORS ===
    error InvalidPath();
    error InsufficientOut(uint256 got, uint256 minOut);
    error SwapFailed();
    error ZeroAmount();
    error InsufficientBalance();

    /// @notice Constructor
    /// @param _jarToken Designated jar token (address(0) for native)
    /// @param _isNativeJarToken True if jar token is native
    /// @param _router Uniswap router address
    /// @param _wNative Wrapped native token address
    /// @param _owner Jar owner
    constructor(
        address _jarToken,
        bool _isNativeJarToken,
        address _router,
        address _wNative,
        address _owner
    ) Ownable(_owner) {
        jarToken = _jarToken;
        isNativeJarToken = _isNativeJarToken;
        router = _router;
        wNative = _wNative;
    }

    // === DEPOSIT FUNCTIONS ===

    /// @notice Receive native tokens
    /// @dev Auto-converts to jar token if needed, or records as pending
    receive() external payable {
        _depositNative(msg.sender, msg.value, 0, new address[](0));
    }

    /// @notice Deposit native tokens with slippage protection
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Custom swap path (empty for default)
    function depositNative(uint256 minOut, address[] calldata path) external payable virtual nonReentrant {
        _depositNative(msg.sender, msg.value, minOut, path);
    }

    /// @notice Deposit ERC-20 tokens via prior approval
    /// @param tokenIn Token to deposit
    /// @param amount Amount to deposit
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Custom swap path (empty for default)
    function deposit(
        address tokenIn,
        uint256 amount,
        uint256 minOut,
        address[] calldata path
    ) external virtual nonReentrant {
        require(tokenIn != address(0), "Use depositNative for native");
        require(amount > 0, "ZeroAmount");

        // Calculate actual received amount (handles fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(tokenIn).balanceOf(address(this)) - balanceBefore;

        if (_isJarToken(tokenIn)) {
            emit Deposit(msg.sender, tokenIn, received);
            return;
        }

        // Attempt auto-swap
        try this._swapIn(tokenIn, received, minOut, path) returns (uint256 out) {
            emit DepositConverted(msg.sender, tokenIn, received, _jarTokenAddress(), out);
        } catch {
            pendingTokens[tokenIn] += received;
            emit DepositPendingSwap(msg.sender, tokenIn, received);
        }
    }

    /// @notice Deposit ERC-20 tokens with permit (single transaction)
    /// @param tokenIn Token to deposit
    /// @param amount Amount to deposit
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Custom swap path (empty for default)
    /// @param deadline Permit deadline
    /// @param v Signature v component
    /// @param r Signature r component
    /// @param s Signature s component
    function depositWithPermit(
        address tokenIn,
        uint256 amount,
        uint256 minOut,
        address[] calldata path,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual nonReentrant {
        require(tokenIn != address(0), "Use depositNative for native");
        require(amount > 0, "ZeroAmount");

        // Execute permit
        IERC20Permit(tokenIn).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Calculate actual received amount (handles fee-on-transfer tokens)
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(tokenIn).balanceOf(address(this)) - balanceBefore;

        if (_isJarToken(tokenIn)) {
            emit Deposit(msg.sender, tokenIn, received);
            return;
        }

        // Attempt auto-swap
        try this._swapIn(tokenIn, received, minOut, path) returns (uint256 out) {
            emit DepositConverted(msg.sender, tokenIn, received, _jarTokenAddress(), out);
        } catch {
            pendingTokens[tokenIn] += received;
            emit DepositPendingSwap(msg.sender, tokenIn, received);
        }
    }

    // === OWNER FUNCTIONS ===

    /// @notice Owner withdraw jar tokens
    /// @param amount Amount to withdraw
    /// @param to Recipient address
    function ownerWithdraw(uint256 amount, address to) external onlyOwner nonReentrant {
        require(amount > 0, "ZeroAmount");
        require(to != address(0), "Invalid recipient");

        if (isNativeJarToken) {
            require(address(this).balance >= amount, "InsufficientBalance");
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            require(IERC20(jarToken).balanceOf(address(this)) >= amount, "InsufficientBalance");
            IERC20(jarToken).safeTransfer(to, amount);
        }

        emit Withdraw(to, amount);
    }

    /// @notice Owner transfer jar tokens (alias for ownerWithdraw)
    /// @param to Recipient address
    /// @param amount Amount to transfer
    function ownerTransfer(address to, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "ZeroAmount");
        require(to != address(0), "Invalid recipient");

        if (isNativeJarToken) {
            require(address(this).balance >= amount, "InsufficientBalance");
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            require(IERC20(jarToken).balanceOf(address(this)) >= amount, "InsufficientBalance");
            IERC20(jarToken).safeTransfer(to, amount);
        }

        emit TransferOut(to, amount);
    }

    /// @notice Owner manually swap pending tokens
    /// @param tokenIn Token to swap from pending
    /// @param minOut Minimum amount of jar tokens to receive
    /// @param path Custom swap path (empty for default)
    function adminSwapPending(
        address tokenIn,
        uint256 minOut,
        address[] calldata path
    ) external onlyOwner nonReentrant {
        uint256 amount = pendingTokens[tokenIn];
        require(amount > 0, "No pending tokens");

        pendingTokens[tokenIn] = 0;

        uint256 amountOut = this._swapIn(tokenIn, amount, minOut, path);
        emit ManualSwapExecuted(tokenIn, amount, amountOut);
    }

    /// @notice Owner sweep non-jar tokens
    /// @param token Token to sweep (address(0) for native)
    /// @param amount Amount to sweep
    /// @param to Recipient address
    function adminSweep(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        require(amount > 0, "ZeroAmount");
        require(to != address(0), "Invalid recipient");
        require(!_isJarToken(token), "Cannot sweep jar token");

        if (token == address(0)) {
            // Sweep native tokens (but not if jar token is native)
            require(!isNativeJarToken, "Cannot sweep native jar token");
            require(address(this).balance >= amount, "InsufficientBalance");
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            require(IERC20(token).balanceOf(address(this)) >= amount, "InsufficientBalance");
            IERC20(token).safeTransfer(to, amount);
        }

        emit Sweep(token, amount, to);
    }

    // === VIEW FUNCTIONS ===

    /// @notice Get jar token balance
    /// @return balance Current jar token balance
    function getJarTokenBalance() external view returns (uint256 balance) {
        if (isNativeJarToken) {
            return address(this).balance;
        } else {
            return IERC20(jarToken).balanceOf(address(this));
        }
    }

    /// @notice Get pending token amount
    /// @param token Token address
    /// @return amount Pending amount
    function getPendingAmount(address token) external view returns (uint256 amount) {
        return pendingTokens[token];
    }

    /// @notice Check if token is the jar token
    /// @param token Token to check
    /// @return isJar True if token is jar token
    function isJarToken(address token) external view returns (bool isJar) {
        return _isJarToken(token);
    }

    // === INTERNAL FUNCTIONS ===

    /// @notice Internal native deposit logic
    /// @param from Depositor address
    /// @param amount Native amount
    /// @param minOut Minimum jar tokens to receive
    /// @param path Swap path
    function _depositNative(
        address from,
        uint256 amount,
        uint256 minOut,
        address[] memory path
    ) internal {
        require(amount > 0, "ZeroAmount");

        if (isNativeJarToken) {
            emit Deposit(from, address(0), amount);
            return;
        }

        // Wrap native tokens first
        DexAdapter.wrapNative(wNative, amount);

        // Attempt auto-swap from wNative to jarToken
        try this._swapIn(wNative, amount, minOut, path) returns (uint256 out) {
            emit DepositConverted(from, address(0), amount, _jarTokenAddress(), out);
        } catch {
            pendingTokens[wNative] += amount;
            emit DepositPendingSwap(from, address(0), amount);
        }
    }

    /// @notice Internal swap function (external to enable try/catch)
    /// @param tokenIn Input token
    /// @param amountIn Input amount
    /// @param minOut Minimum output
    /// @param path Swap path
    /// @return amountOut Output amount
    function _swapIn(
        address tokenIn,
        uint256 amountIn,
        uint256 minOut,
        address[] memory path
    ) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Only self");

        address tokenOut = _jarTokenAddress();
        
        if (isNativeJarToken) {
            // Swapping to native (unwrap at the end)
            amountOut = DexAdapter.swapExactTokensForETH(
                router,
                tokenIn,
                amountIn,
                minOut,
                address(this),
                wNative,
                path
            );
        } else {
            // Swapping to ERC-20 jar token
            amountOut = DexAdapter.swapExactTokensForTokens(
                router,
                tokenIn,
                tokenOut,
                amountIn,
                minOut,
                address(this),
                wNative,
                path
            );
        }

        if (amountOut < minOut) {
            revert InsufficientOut(amountOut, minOut);
        }
    }

    /// @notice Check if token is the jar token
    /// @param token Token to check
    /// @return True if token is jar token
    function _isJarToken(address token) internal view returns (bool) {
        if (isNativeJarToken) {
            return token == address(0);
        } else {
            return token == jarToken;
        }
    }

    /// @notice Get jar token address for swaps
    /// @return Jar token address (wNative if native jar token)
    function _jarTokenAddress() internal view returns (address) {
        if (isNativeJarToken) {
            return wNative; // Use wNative for swaps, unwrap at the end
        } else {
            return jarToken;
        }
    }
}