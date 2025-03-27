// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJar.sol";
import "../src/CookieJarRegistry.sol";

contract CookieJarFactoryTest is Test {
    CookieJarFactory public factory;
    CookieJarRegistry public registry;
    address public feeCollector = address(0xFEED);
    address public admin = address(0xABCD);
    address public user = address(0x1234);
    address public user2 = address(0x5678);
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    uint256 public withdrawalInterval = 1 days;
    bool public strictPurpose = true;
    address[] public users;
    bool[] public statuses;

    function setUp() public {
        // Deploy the registry first.
        registry = new CookieJarRegistry();
             users = new address[](2);
        users[0] = user;
        users[1] = user2;
        statuses = new bool[](2);
        statuses[0] = true;
        statuses[1] = true;
        // Deploy the factory with the registry's address.
        factory = new CookieJarFactory(
            feeCollector,
            address(registry),
            admin
        );
        // Let the registry know which factory is authorized.
        registry.setCookieJarFactory(address(factory));
        vm.deal(user, 100 ether);
                vm.deal(user2, 100 ether);

    }

    /// @notice Test creating a cookie jar by a blacklisted person
    function testCreateCookieJarByBlacklistedPerson() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(admin);
        factory.updateGlobalBlacklist(users, statuses);
        vm.prank(user);
        vm.expectRevert(CookieJarFactory.Blacklisted.selector);

        address jarAddress = factory.createCookieJar{value: 100 wei}(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Test Metadata"
        );


    }
       function testCreateCookieJarByBlacklistedPerson2() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(admin);
        factory.updateGlobalBlacklist(users, statuses);
        vm.prank(user2);
        vm.expectRevert(CookieJarFactory.Blacklisted.selector);

        address jarAddress = factory.createCookieJar{value: 100 wei}(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Test Metadata"
        );
        

    }

    /// @notice Test creating a CookieJar in Whitelist mode and verifying registry creator.
    function testCreateCookieJarWhitelist() public {
            uint256 initialBalance = address(feeCollector).balance;

        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(user);
        address jarAddress = factory.createCookieJar{value: 100 wei}(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Test Metadata"
        );
            uint256 finalBalance = address(feeCollector).balance;
    assertEq(finalBalance, initialBalance + 1 wei, "Fee collector should receive the exact fee amount");

        string memory meta = factory.cookieJarMetadata(jarAddress);
        assertEq(meta, "Test Metadata");

        // Verify that the registry recorded the correct creator.
        uint256 count = registry.getRegisteredCookieJarsCount();
        (address recordedJar, address creator, , ) = registry
            .registeredCookieJars(count - 1);
        assertEq(recordedJar, jarAddress);
        assertEq(creator, user);
    }

    /// @notice Test creating a CookieJar in NFTGated mode and verifying registry creator.
    function testCreateCookieJarNFTMode() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0x1234);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        vm.prank(user);
        address jarAddress = factory.createCookieJar{value: 100 wei}(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "NFT Mode Metadata"
        );
        string memory meta = factory.cookieJarMetadata(jarAddress);
        assertEq(meta, "NFT Mode Metadata");

        // Verify that the registry recorded the correct creator.
        uint256 count = registry.getRegisteredCookieJarsCount();
        (address recordedJar, address creator, , ) = registry
            .registeredCookieJars(count - 1);
        assertEq(recordedJar, jarAddress);
        assertEq(creator, user);
    }

    function testWithoutFeeForCreatingCookieJar() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarFactory.LessThanMinimumDeposit.selector));

        factory.createCookieJar{value: 99 wei}(
            admin,
            CookieJar.AccessType.NFTGated,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "NFT Mode Metadata"
        );
    }



    /// @notice Test that NFTGated mode must have at least one NFT address.
    function testCreateCookieJarNFTModeNoAddresses() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJar.NoNFTAddressesProvided.selector)
        );
        factory.createCookieJar{value: 1 ether}(
            admin,
            CookieJar.AccessType.NFTGated,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Invalid NFT Mode"
        );
    }


    /// @notice Test that factory creation reverts if admin is the zero address.
    function testFactoryCreateCookieJarInvalidAdmin() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJar.AdminCannotBeZeroAddress.selector)
        );
        factory.createCookieJar{value: 100 wei}(
            address(0),
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Invalid Admin"
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
            abi.encodeWithSelector(CookieJar.InvalidNFTType.selector)
        );
        factory.createCookieJar{value: 100 wei}(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            "Invalid NFT Type"
        );
    }
}
