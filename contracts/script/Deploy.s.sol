// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {CookieJarRegistry} from "../src/CookieJarRegistry.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";



contract Deploy is Script {
    HelperConfig helperConfig;
    HelperConfig.NetworkConfig config;

    function run() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);
      

        // Deploy Registry
        CookieJarRegistry registry = new CookieJarRegistry();
        ERC20Mock testtoken=new ERC20Mock();
        testtoken.mint(deployer,100e18);
        console.log("CookieJarRegistry deployed at: ", address(registry));
        console.log("Test ERC", address(testtoken));

        // Deploy Factory with Registry address
        CookieJarFactory factory = new CookieJarFactory(
            config.defaultFeeCollector,
            address(registry),
            0x487a30c88900098b765d76285c205c7c47582512,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );

        console.log("CookieJarFactory deployed at: ", address(factory));

        // Set Factory in Registry
        registry.setCookieJarFactory(address(factory));
        factory.grantProtocolAdminRole(
            0x9ED3f77Bb53C2b37Cf86BfBed0Df8D0867a7F9dc
        );
        vm.stopBroadcast();
    }
}
