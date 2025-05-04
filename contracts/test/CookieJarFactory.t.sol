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
    uint8[] emptyTypes = new uint8[](0);
    CookieJarFactory public factory;
    address public owner = address(0xABCD);
    address public user = address(0x1234);
    address public user2 = address(0x5678);
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    uint256 public withdrawalInterval = 1 days;
    bool public strictPurpose = true;
    address[] public users;
    HelperConfig.NetworkConfig config;
    ERC20Mock testToken;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        vm.startPrank(owner);
        users = new address[](2);
        users[0] = user;
        users[1] = user2;

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
            "Test Metadata"
        );
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
        vm.startPrank(users[0]);
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
            "Test Metadata"
        );
        vm.stopPrank();
    }

    /// @notice Test creating a CookieJar in Whitelist mode and verifying registry creator.
    function testCreateETHCookieJarWhitelist() public {
        uint256 initialBalance = address(config.defaultFeeCollector).balance;
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
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Whitelist);
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
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Whitelist);
    }

    /// @notice Test creating a CookieJar in NFTGated mode and verifying registry creator.
    function testCreateETHCookieJarNFTMode() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);
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
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.NFTGated);
    }

    function testCreateERC20CookieJarNFTMode() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);
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
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.NFTGated);

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
            "Test Metadata"
        );
    }

    /// @notice Test that factory creation reverts if an invalid NFT type (>2) is provided.
    function testFactoryCreateCookieJarInvalidNFTType() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = 3; // invalid NFT type

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidNFTType.selector)
        );
        factory.createCookieJar(
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
            false, // oneTimeWithdrawal
            "Test Metadata"
        );
    }
}
