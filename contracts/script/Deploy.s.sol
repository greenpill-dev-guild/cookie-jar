// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";

/// @title Deploy
/// @notice Deploys a CookieJarFactory with the parameters read from the environment.
/// @dev Client configuration is no longer written from Solidity. After a broadcast run
///      `bun sync:deployment -- --chain <chainId>` (scripts/deploy.sh does this) to merge the
///      new factory into client/config/deployments.json.
contract Deploy is Script {
    function run() external {
        address feeCollector = vm.envAddress("FEE_COLLECTOR");
        address owner = vm.envAddress("FACTORY_OWNER");
        uint256 feePercentage = vm.envUint("FEE_PERCENTAGE");
        uint256 minEthDeposit = vm.envUint("MIN_ETH_DEPOSIT");
        uint256 minErc20Deposit = vm.envUint("MIN_ERC20_DEPOSIT");

        console.log("=== Cookie Jar Factory Deployment ===");
        console.log("Chain ID:", block.chainid);
        console.log("Fee Collector:", feeCollector);
        console.log("Factory Owner:", owner);
        console.log("Fee Percentage:", feePercentage, "bps");
        console.log("Min ETH Deposit:", minEthDeposit, "wei");
        console.log("Min ERC20 Deposit:", minErc20Deposit, "base units");
        console.log("=====================================");

        vm.startBroadcast();

        CookieJarFactory factory = new CookieJarFactory(
            feeCollector,
            owner,
            feePercentage,
            uint128(minEthDeposit),
            uint128(minErc20Deposit)
        );

        vm.stopBroadcast();

        console.log("SUCCESS: CookieJarFactory deployed to:", address(factory));
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
        console.log("NEXT: bun sync:deployment -- --chain", block.chainid);
    }
}
