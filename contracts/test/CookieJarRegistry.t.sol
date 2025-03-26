// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarRegistry.sol";

contract CookieJarRegistryTest is Test {
    CookieJarRegistry public registry;
    address public user = address(0xBEEF);
    address public attacker = address(0xBAD);

    function setUp() public {
        registry = new CookieJarRegistry();
        // Set the authorized cookieJarFactory to this test contract.
        registry.setCookieJarFactory(address(this));
    }

    /// @notice Test that the authorized factory can update the whitelist.
    function testUpdateGlobalWhitelist() public {
        registry.updateGlobalWhitelist(user, true);
        bool status = registry.globalWhitelist(user);
        assertTrue(status);
    }

    /// @notice Test that updateGlobalWhitelist reverts when called by a non-authorized address.
    function testUpdateGlobalWhitelistNotAuthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJarRegistry.NotAuthorized.selector));
        registry.updateGlobalWhitelist(user, true);
    }

    /// @notice Test that the authorized factory can update the blacklist.
    function testUpdateGlobalBlacklist() public {
        registry.updateGlobalBlacklist(user, true);
        bool status = registry.globalBlacklist(user);
        assertTrue(status);
    }

    /// @notice Test that updateGlobalBlacklist reverts when called by a non-authorized address.
    function testUpdateGlobalBlacklistNotAuthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJarRegistry.NotAuthorized.selector));
        registry.updateGlobalBlacklist(user, true);
    }

    /// @notice Test registerCookieJar with the creator parameter.
    function testRegisterCookieJar() public {
        address jarAddress = address(0xABCD);
        registry.registerCookieJar(jarAddress, msg.sender, "Test Metadata");
        // Verify registration.
        (address recordedJar, address creator, , ) = registry.registeredCookieJars(0);
        assertEq(recordedJar, jarAddress);
        assertEq(creator, msg.sender);
    }

    /// @notice Test that registerCookieJar reverts when a non-authorized address attempts registration.
    function testRegisterCookieJarNotAuthorized() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJarRegistry.NotAuthorized.selector));
        registry.registerCookieJar(address(0xABCD), attacker, "Test Metadata");
    }
}

// 2. Security concerns:
// - The `cookieJarFactory` address is set only once, but there is no check to ensure that it is a trusted factory address.
// - The `updateGlobalWhitelist` and `updateGlobalBlacklist` functions allow anyone to update the global whitelist and blacklist mappings. Consider adding access control checks to restrict these functions to authorized addresses.
// - In the `registerCookieJar` function, there is no validation or security checks for the provided `_jarAddress` and `_creator` variables. Consider adding checks to ensure these addresses are valid and authorized.
// - The `registeredCookieJars` array is publicly accessible and can be read by anyone. Consider adding access control checks or a getter function with proper access control to protect the privacy of the registered CookieJar instances.
// - Consider adding input validation and error handling to prevent potential issues caused by invalid inputs or malicious actions.
