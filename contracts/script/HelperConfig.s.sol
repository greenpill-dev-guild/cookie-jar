// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title HelperConfig
/// @notice Configuration helper for deployment scripts
contract HelperConfig {
    address defaultFeeCollector = address(0xcFF556854A07A8Ff47F8b178abb617901682D4eb);
    uint256 feePercentOnDeposit = 100;
    /// @dev 1% fee on deposit. 100=1% 1000=10%
    uint256 minEthDeposit = 0;
    uint256 minErc20Deposit = 0;

    struct NetworkConfig {
        address defaultFeeCollector;
        uint256 feePercentageOnDeposit;
        uint128 minEthDeposit;
        uint128 minErc20Deposit;
    }

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory baseSepoliaConfig) {
        baseSepoliaConfig = NetworkConfig({
            defaultFeeCollector: defaultFeeCollector,
            feePercentageOnDeposit: feePercentOnDeposit,
            minEthDeposit: uint128(minEthDeposit),
            minErc20Deposit: uint128(minErc20Deposit)
        });
    }

    function getAnvilConfig() public view returns (NetworkConfig memory anvilConfig) {
        anvilConfig = NetworkConfig({
            defaultFeeCollector: defaultFeeCollector,
            feePercentageOnDeposit: feePercentOnDeposit,
            minEthDeposit: uint128(minEthDeposit),
            minErc20Deposit: uint128(minErc20Deposit)
        });
    }
}
