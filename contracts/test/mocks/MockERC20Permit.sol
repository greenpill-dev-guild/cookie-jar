// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/interfaces/IERC20Permit.sol";

/// @title MockERC20Permit
/// @notice Mock ERC20 with permit functionality for testing
contract MockERC20Permit is ERC20, IERC20Permit {
    mapping(address => uint256) private _nonces;
    bytes32 private constant _DOMAIN_SEPARATOR = keccak256("MockERC20Permit");

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        // Set decimals if needed (ERC20 defaults to 18)
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        require(deadline >= block.timestamp, "Permit expired");
        
        // Simplified permit - just approve without signature verification
        // In a real implementation, you would verify the signature
        _nonces[owner]++;
        _approve(owner, spender, value);
    }

    function nonces(address owner) external view override returns (uint256) {
        return _nonces[owner];
    }

    function DOMAIN_SEPARATOR() external pure override returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }
}