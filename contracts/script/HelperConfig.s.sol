// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelperConfig {
    address DEFAULT_FEE_COLLECTOR = address(369);
    uint256 FEE_PERCENT_ON_DEPOSIT = 1;
    /// @dev 1 percent fee on deposit.
    uint256 MIN_ETH_DEPOSIT = 100;
    uint256 MIN_ERC20_DEPOST = 100;

    struct NetworkConfig {
        address defaultFeeCollector;
        uint256 feePercentageOnDeposit;
        uint256 minETHDeposit;
        uint256 minERC20Deposit;
    }

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory baseSepoliaConfig) {
        baseSepoliaConfig = NetworkConfig({
            defaultFeeCollector: DEFAULT_FEE_COLLECTOR,
            feePercentageOnDeposit: FEE_PERCENT_ON_DEPOSIT,
            minETHDeposit: MIN_ETH_DEPOSIT,
            minERC20Deposit: MIN_ERC20_DEPOST
        });
    }

    function getAnvilConfig() public view returns (NetworkConfig memory anvilConfig) {
        anvilConfig = NetworkConfig({
            defaultFeeCollector: DEFAULT_FEE_COLLECTOR,
            feePercentageOnDeposit: FEE_PERCENT_ON_DEPOSIT,
            minETHDeposit: MIN_ETH_DEPOSIT,
            minERC20Deposit: MIN_ERC20_DEPOST
        });
    }
}
