// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarRegistry.sol";
import "../src/CookieJar.sol";
import "../script/HelperConfig.s.sol";

contract CookieJarRegistryTest is Test {
    CookieJarRegistry public registry;
    CookieJar public jar;
    HelperConfig public config;
    address public owner = address(1);
    address public user = address(2);

    function setUp() public {
        config = new HelperConfig();
        HelperConfig.NetworkConfig memory currentConfig = config
            .getAnvilConfig();
        vm.deal(address(this), 1 ether);
        jar = new CookieJar(
            address(this),
            address(this),
            address(3),
            CookieJarLib.AccessType.Whitelist,
            new address[](0),
            new uint8[](0),
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            10, // fixedAmount
            100, // maxWithdrawal
            86400, // withdrawalInterval (1 day in seconds)
            1 ether, // minETHDeposit
            100, // minERC20Deposit
            500, // defaultFeePercentage (5%)
            true, // strictPurpose
            address(4), // defaultFeeCollector
            true // emergencyWithdrawalEnabled
        );
        registry = new CookieJarRegistry();

        // Set the authorized cookieJarFactory to this test contract.
        registry.setCookieJarFactory(address(this));
    }

    /// @notice Test registerCookieJar with the creator parameter.
    function testRegisterAndStoreCookieJar() public {
        // Register
        registry.registerAndStoreCookieJar(jar, "Test");
        // Verify registration.
        CookieJarRegistry.CookieJarInfo memory info = registry
            .getJarByCreatorAddress(address(this));
        assertNotEq(info.jarAddress, address(0));
        assertEq(info.currency, address(3)); // ETH jar
        CookieJarRegistry.CookieJarInfo[] memory tempArr = registry
            .getAllJars();
        assertGt(tempArr.length, 0);
    }
}
