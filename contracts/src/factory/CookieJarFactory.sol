// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../jar/CookieJar.sol";

/// @title CookieJarFactory
/// @notice Factory contract for deploying multi-token Cookie Jars
/// @dev Deploys Cookie Jars with auto-swap functionality
contract CookieJarFactory is Ownable {
    // === IMMUTABLE STATE ===
    address public immutable router;               // Uniswap router address
    address public immutable wNative;              // Wrapped native token address

    // === STORAGE ===
    address[] public cookieJars;                   // Array of deployed jars
    mapping(address => bool) public allowedTokens; // Allowed jar tokens (optional allowlist)
    bool public useAllowlist;                      // Whether to enforce token allowlist

    // === EVENTS ===
    event CookieJarCreated(
        address indexed creator,
        address indexed jarAddress,
        address indexed jarToken,
        bool isNativeJarToken
    );
    event AllowedTokenAdded(address indexed token);
    event AllowedTokenRemoved(address indexed token);
    event AllowlistToggled(bool enabled);

    // === ERRORS ===
    error TokenNotAllowed();
    error InvalidToken();
    error ZeroAddress();

    /// @notice Constructor
    /// @param _router Uniswap router address
    /// @param _wNative Wrapped native token address
    /// @param _owner Factory owner
    constructor(
        address _router,
        address _wNative,
        address _owner
    ) Ownable(_owner) {
        require(_router != address(0), "ZeroAddress");
        require(_wNative != address(0), "ZeroAddress");
        
        router = _router;
        wNative = _wNative;
    }

    /// @notice Create a new Cookie Jar
    /// @param jarOwner Owner of the jar
    /// @param jarToken Designated jar token (address(0) for native)
    /// @param isNativeJarToken True if jar token is native
    /// @return jarAddress Address of the deployed jar
    function createJar(
        address jarOwner,
        address jarToken,
        bool isNativeJarToken
    ) external returns (address jarAddress) {
        require(jarOwner != address(0), "ZeroAddress");

        // Validate jar token
        if (isNativeJarToken) {
            require(jarToken == address(0), "InvalidToken");
        } else {
            require(jarToken != address(0), "InvalidToken");
            
            // Check if token is allowed (if allowlist is enabled)
            if (useAllowlist && !allowedTokens[jarToken]) {
                revert TokenNotAllowed();
            }
            
            // Basic ERC-20 validation
            try IERC20(jarToken).totalSupply() returns (uint256) {
                // Token is valid ERC-20
            } catch {
                revert InvalidToken();
            }
        }

        // Deploy new jar
        CookieJar newJar = new CookieJar(
            jarToken,
            isNativeJarToken,
            router,
            wNative,
            jarOwner
        );

        jarAddress = address(newJar);
        cookieJars.push(jarAddress);

        emit CookieJarCreated(msg.sender, jarAddress, jarToken, isNativeJarToken);
    }

    // === OWNER FUNCTIONS ===

    /// @notice Toggle token allowlist enforcement
    /// @param enabled Whether to enable allowlist
    function toggleAllowlist(bool enabled) external onlyOwner {
        useAllowlist = enabled;
        emit AllowlistToggled(enabled);
    }

    /// @notice Add allowed jar tokens
    /// @param tokens Array of token addresses to allow
    function addAllowedTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            require(token != address(0), "ZeroAddress");
            
            allowedTokens[token] = true;
            emit AllowedTokenAdded(token);
        }
    }

    /// @notice Remove allowed jar tokens
    /// @param tokens Array of token addresses to remove
    function removeAllowedTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            
            allowedTokens[token] = false;
            emit AllowedTokenRemoved(token);
        }
    }

    // === VIEW FUNCTIONS ===

    /// @notice Get all deployed jars
    /// @return Array of jar addresses
    function getCookieJars() external view returns (address[] memory) {
        return cookieJars;
    }

    /// @notice Get number of deployed jars
    /// @return count Number of jars
    function getCookieJarCount() external view returns (uint256 count) {
        return cookieJars.length;
    }

    /// @notice Check if token is allowed
    /// @param token Token address to check
    /// @return allowed True if token is allowed
    function isTokenAllowed(address token) external view returns (bool allowed) {
        if (!useAllowlist) return true;
        return allowedTokens[token];
    }

    /// @notice Get factory configuration
    /// @return _router Router address
    /// @return _wNative Wrapped native address
    /// @return _useAllowlist Whether allowlist is enabled
    function getConfig() external view returns (
        address _router,
        address _wNative,
        bool _useAllowlist
    ) {
        return (router, wNative, useAllowlist);
    }
}