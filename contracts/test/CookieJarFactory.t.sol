// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJar.sol";
import "../script/HelperConfig.s.sol";
import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract CookieJarFactoryTest is Test {
    HelperConfig public helperConfig;
    address[] emptyAddresses = new address[](0);
    CookieJarLib.NFTType[] emptyTypes = new CookieJarLib.NFTType[](0);
    CookieJarFactory public factory;
    address public owner = address(0xABCD);
    address public user = address(0x1234);
    address public user2 = address(0x5678);
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    uint256 public withdrawalInterval = 1 days;
    bool public strictPurpose = true;
    address[] public users;
    address[] public emptyWhitelist;
    HelperConfig.NetworkConfig config;
    ERC20Mock testToken;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        vm.startPrank(owner);
        users = new address[](2);
        users[0] = user;
        users[1] = user2;
        emptyWhitelist = new address[](0);

        testToken = new ERC20Mock();
        testToken.mint(user, 100e18);

        // Deploy the factory with the registry's address.
        factory = new CookieJarFactory(
            config.defaultFeeCollector,
            owner,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );
        vm.deal(user, 100 ether);
        vm.stopPrank();
    }

    function testBlacklistedJarCreatorsAccessControl() public {
        vm.prank(user);
        vm.expectRevert();
        // CookieJarFactory.CookieJarFactory__Blacklisted.selector
        factory.grantBlacklistedJarCreatorsRole(users);

        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(users);
        vm.expectRevert(
            CookieJarFactory.CookieJarFactory__Blacklisted.selector
        );
        vm.prank(user);
        factory.createCookieJar(
            owner,
            address(3),
            CookieJarLib.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    function testOnlyOwnerGrantsAndRevokesProtocolAdminRoles() public {
        vm.startPrank(owner);
        factory.grantProtocolAdminRole(user);
        factory.grantProtocolAdminRole(user2);
        vm.stopPrank();
        vm.expectRevert();
        vm.prank(user);
        factory.revokeProtocolAdminRole(user2);
        vm.expectRevert();
        vm.prank(user2);
        factory.revokeProtocolAdminRole(owner);
    }

    function testTransferOwnership() public {
        vm.prank(owner);
        factory.transferOwnership(user);
        assertEq(factory.hasRole(keccak256("OWNER"), user), true);
        assertEq(factory.hasRole(keccak256("OWNER"), owner), false);
    }

    /// @notice Test creating a cookie jar by a blacklisted person
    function testCreateCookieJarByBlacklistedPerson() public {
        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(users);
        vm.prank(users[0]);
        vm.expectRevert(
            CookieJarFactory.CookieJarFactory__Blacklisted.selector
        );
        factory.createCookieJar(
            owner,
            address(3),
            CookieJarLib.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    /// @notice Test creating a CookieJar in Whitelist mode and verifying registry creator.
    function testCreateETHCookieJarWhitelist() public {
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Whitelist);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    function testCreateERC20CookieJarWhitelist() public {
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(testToken),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Whitelist);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a CookieJar in NFTGated mode and verifying registry creator.
    function testCreateETHCookieJarNFTMode() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.NFTGated);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    function testCreateERC20CookieJarNFTMode() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(testToken),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.NFTGated);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test that NFTGated mode must have at least one NFT address.
    function testCreateETHCookieJarNFTModeNoAddresses() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.NoNFTAddressesProvided.selector)
        );
        factory.createCookieJar(
            user,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }
}
