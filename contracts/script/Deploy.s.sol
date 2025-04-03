// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {CookieJarRegistry} from "../src/CookieJarRegistry.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    HelperConfig helperConfig;
    HelperConfig.NetworkConfig config;

    function run() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Registry
        CookieJarRegistry registry = new CookieJarRegistry();
        console.log("CookieJarRegistry deployed at: ", address(registry));

        // Deploy Factory with Registry address
        CookieJarFactory factory = new CookieJarFactory(
            config.defaultFeeCollector,
            address(registry),
            0x12B2434a1022d5787bf06056F2885Fe35De62Bf8,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );
        console.log("CookieJarFactory deployed at: ", address(factory));

        // Set Factory in Registry
        registry.setCookieJarFactory(address(factory));

        factory.grantProtocolAdminRole(
            0x603fbF99674B8ed3305Eb6EA5f3491F634A402A6
        );

        vm.stopBroadcast();
    }
}
