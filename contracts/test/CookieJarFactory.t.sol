// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract CookieJarFactoryTest is Test {
    HelperConfig public helperConfig;
    address[] emptyAddresses = new address[](0);
    CookieJarFactory public factory;
    address public owner = address(0xABCD);
    address public user = address(0x1234);
    address public user2 = address(0x5678);
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    uint256 public withdrawalInterval = 1 days;
    bool public strictPurpose = true;
    address[] private testUsers; // Renamed from users to avoid naming conflicts
    address[] public emptyAllowlist;
    HelperConfig.NetworkConfig config;
    ERC20Mock testToken;

    // Helper function to create default jar parameters
    function createDefaultJarParams(
        address jarOwner,
        address currency,
        string memory metadata
    ) internal view returns (CookieJarLib.JarConfig memory) {
        return
            CookieJarLib.JarConfig(
                jarOwner, // jarOwner
                currency, // supportedCurrency
                address(this), // feeCollector
                CookieJarLib.AccessType.Allowlist, // accessType
                CookieJarLib.WithdrawalTypeOptions.Fixed, // withdrawalOption
                strictPurpose, // strictPurpose
                true, // emergencyWithdrawalEnabled
                false, // oneTimeWithdrawal
                fixedAmount, // fixedAmount
                maxWithdrawal, // maxWithdrawal
                withdrawalInterval, // withdrawalInterval
                0.01 ether, // minDeposit
                0, // feePercentageOnDeposit
                0, // maxWithdrawalPerPeriod
                metadata, // metadata
                CookieJarLib.MultiTokenConfig({ // multiTokenConfig
                        enabled: false,
                        maxSlippagePercent: 500,
                        minSwapAmount: 0,
                        defaultFee: 3000
                    })
            );
    }

    // Helper function to create default access config
    function createDefaultAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({nftContract: address(0), tokenId: 0, minBalance: 0})
            });
    }

    // Helper function to create default multi-token config
    function createDefaultMultiTokenConfig() internal view returns (CookieJarLib.MultiTokenConfig memory) {
        return
            CookieJarLib.MultiTokenConfig({enabled: false, maxSlippagePercent: 500, minSwapAmount: 0, defaultFee: 0});
    }

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        vm.startPrank(owner);
        testUsers = new address[](2); // Using testUsers instead of users
        testUsers[0] = user;
        testUsers[1] = user2;
        emptyAllowlist = new address[](0);

        testToken = new ERC20Mock();
        testToken.mint(user, 100e18);

        // Deploy the factory with the registry's address.
        factory = new CookieJarFactory(
            config.defaultFeeCollector,
            owner,
            config.feePercentageOnDeposit, // Correct property name
            config.minEthDeposit,
            config.minErc20Deposit
        );
        vm.stopPrank();
    }

    function testCreateCookieJar() public {
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, "Test Metadata"),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    // V2: grantProtocolAdminRole removed for size optimization
    // function testOnlyOwnerGrantsAndRevokesProtocolAdminRoles() public {
    //     vm.startPrank(owner);
    //     factory.grantProtocolAdminRole(user);
    //     vm.stopPrank();
    //     vm.prank(user);
    //     vm.expectRevert();
    //     factory.grantProtocolAdminRole(user2);
    // }

    // V2: transferOwnership removed for size optimization
    // function testTransferOwnership() public {
    //     vm.prank(owner);
    //     factory.transferOwnership(user);
    //     assertEq(factory.hasRole(keccak256("OWNER"), user), true);
    //     assertEq(factory.hasRole(keccak256("OWNER"), owner), false);
    // }

    /// @notice Test creating a cookie jar
    function testCreateCookieJarBasic() public {
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, "Test Metadata"),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with custom fee
    function testCreateCookieJarWithCustomFee() public {
        vm.prank(owner);
        CookieJarLib.JarConfig memory params = createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, "Test Metadata");
        params.feePercentageOnDeposit = 500; // 5%

        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with Variable withdrawal option
    function testCreateCookieJarWithVariableWithdrawal() public {
        vm.prank(owner);
        CookieJarLib.JarConfig memory params = createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, "Test Metadata");
        params.withdrawalOption = CookieJarLib.WithdrawalTypeOptions.Variable;

        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with One-time withdrawal option
    function testCreateCookieJarWithOneTimeWithdrawal() public {
        vm.prank(owner);
        CookieJarLib.JarConfig memory params = createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, "Test Metadata");
        params.oneTimeWithdrawal = true;

        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating jar with ERC20 token
    function testCreateCookieJarWithERC20() public {
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, address(testToken), "ERC20 Test Jar"),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address[] memory cookieJars = factory.getAllJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test metadata functionality
    function testMetadataFunctionality() public {
        string memory testMetadata = "Test Jar Metadata";

        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, testMetadata),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        // Test getMetadata for specific jar
        assertEq(factory.getMetadata(jarAddress), testMetadata);

        // Metadata functionality verified
    }

    /// @notice Test updating metadata
    function testUpdateMetadata() public {
        string memory originalMetadata = "Original Metadata";
        string memory newMetadata = "Updated Metadata";

        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, originalMetadata),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        // Verify original metadata
        assertEq(factory.getMetadata(jarAddress), originalMetadata);

        // Update metadata (as jar owner)
        vm.prank(owner);
        factory.updateMetadata(jarAddress, newMetadata);

        // Verify updated metadata
        assertEq(factory.getMetadata(jarAddress), newMetadata);
    }

    /// @notice Test updating metadata by non-owner should fail
    function testUpdateMetadataByNonOwnerFails() public {
        string memory originalMetadata = "Original Metadata";
        string memory newMetadata = "Updated Metadata";

        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, originalMetadata),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        // Try to update metadata as non-owner (should fail)
        vm.prank(user);
        vm.expectRevert(CookieJarFactory.NotAuthorized.selector);
        factory.updateMetadata(jarAddress, newMetadata);
    }

    /// @notice Test getting metadata for non-existent jar should fail
    function testGetMetadataForNonExistentJar() public {
        vm.expectRevert(CookieJarFactory.JarNotFound.selector);
        factory.getMetadata(address(0x9999));
    }

    /// @notice Test updating metadata for non-existent jar should fail
    function testUpdateMetadataForNonExistentJar() public {
        vm.prank(owner);
        vm.expectRevert(CookieJarFactory.JarNotFound.selector);
        factory.updateMetadata(address(0x9999), "New Metadata");
    }

    /// @notice Test multiple jars metadata handling
    function testMultipleJarsMetadata() public {
        string memory metadata1 = "Jar 1 Metadata";
        string memory metadata2 = "Jar 2 Metadata";
        string memory metadata3 = "Jar 3 Metadata";

        vm.startPrank(owner);
        address jar1 = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, metadata1),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address jar2 = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, metadata2),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );

        address jar3 = factory.createCookieJar(
            createDefaultJarParams(owner, CookieJarLib.ETH_ADDRESS, metadata3),
            createDefaultAccessConfig(),
            createDefaultMultiTokenConfig()
        );
        vm.stopPrank();

        // Test individual metadata retrieval
        assertEq(factory.getMetadata(jar1), metadata1);
        assertEq(factory.getMetadata(jar2), metadata2);
        assertEq(factory.getMetadata(jar3), metadata3);

        // Test individual metadata retrieval verified above
    }
}
