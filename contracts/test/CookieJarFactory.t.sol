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
    address[] public emptyAllowlist;
    HelperConfig.NetworkConfig config;
    ERC20Mock testToken;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        vm.startPrank(owner);
        users = new address[](2);
        users[0] = user;
        users[1] = user2;
        emptyAllowlist = new address[](0);

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
        vm.expectRevert(CookieJarFactory.CookieJarFactory__Blacklisted.selector);
        vm.prank(user);
        factory.createCookieJar(
            owner,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyAllowlist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    function testOnlyOwnerGrantsAndRevokesProtocolAdminRoles() public {
        vm.startPrank(owner);
        factory.grantProtocolAdminRole(user);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert();
        factory.grantProtocolAdminRole(user2);
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
        vm.expectRevert(CookieJarFactory.CookieJarFactory__Blacklisted.selector);
        factory.createCookieJar(
            owner,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyAllowlist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    /// @notice Test creating a CookieJar in Allowlist mode and verifying registry creator.
    function testCreateETHCookieJarAllowlist() public {
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyAllowlist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Allowlist);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    function testCreateERC20CookieJarAllowlist() public {
        vm.prank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(testToken),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyAllowlist,
            "Test Metadata"
        );
        assertTrue(CookieJar(payable(jarAddress)).accessType() == CookieJarLib.AccessType.Allowlist);
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
            emptyAllowlist,
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
            emptyAllowlist,
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
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NoNFTAddressesProvided.selector));
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
            emptyAllowlist,
            "Test Metadata"
        );
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    // ============ NEW FUNCTIONALITY TESTS ============

    function testUpdateMetadata() public {
        // First create a jar
        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3), // ETH
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergency withdrawal
            false, // one time withdrawal
            emptyAllowlist,
            "Initial metadata"
        );
        vm.stopPrank();

        // Test updating metadata as jar owner
        string
            memory newMetadata = '{"name":"My Jar","description":"Updated description","image":"https://example.com/image.png","link":"https://example.com"}';

        vm.startPrank(user);
        vm.expectEmit(true, false, false, true);
        emit CookieJarMetadataUpdated(jarAddress, newMetadata);
        factory.updateMetadata(jarAddress, newMetadata);
        vm.stopPrank();

        // Verify metadata was updated
        assertEq(factory.getMetadata(jarAddress), newMetadata);
    }

    function testUpdateMetadataFailsForNonOwner() public {
        // Create a jar
        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Initial metadata"
        );
        vm.stopPrank();

        // Try to update metadata as non-owner
        vm.startPrank(user2);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__NotJarOwner.selector);
        factory.updateMetadata(jarAddress, "Unauthorized update");
        vm.stopPrank();
    }

    function testUpdateMetadataFailsForNonexistentJar() public {
        address fakeJar = address(0x9999);

        vm.startPrank(user);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__JarNotFound.selector);
        factory.updateMetadata(fakeJar, "Should fail");
        vm.stopPrank();
    }

    function testUpdateMetadataFailsForEmptyMetadata() public {
        // Create a jar
        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Initial metadata"
        );

        // Try to update with empty metadata
        vm.expectRevert(CookieJarFactory.CookieJarFactory__InvalidMetadata.selector);
        factory.updateMetadata(jarAddress, "");
        vm.stopPrank();
    }

    function testUpdateMetadataFailsForTooLongMetadata() public {
        // Create a jar
        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Initial metadata"
        );

        // Create metadata longer than 8192 bytes
        string memory longMetadata = new string(8193);

        vm.expectRevert(CookieJarFactory.CookieJarFactory__MetadataTooLong.selector);
        factory.updateMetadata(jarAddress, longMetadata);
        vm.stopPrank();
    }

    function testUpdateMetadataSucceedsForProtocolAdmin() public {
        // Create a jar
        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Initial metadata"
        );
        vm.stopPrank();

        // Update metadata as protocol admin (owner)
        string memory newMetadata = "Admin updated metadata";

        vm.startPrank(owner);
        factory.updateMetadata(jarAddress, newMetadata);
        vm.stopPrank();

        // Verify metadata was updated
        assertEq(factory.getMetadata(jarAddress), newMetadata);
    }

    function testGetMetadata() public {
        string memory originalMetadata = "Test metadata";

        vm.startPrank(user);
        address jarAddress = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            originalMetadata
        );
        vm.stopPrank();

        // Test getting metadata
        assertEq(factory.getMetadata(jarAddress), originalMetadata);
    }

    function testGetMetadataFailsForNonexistentJar() public {
        address fakeJar = address(0x9999);

        vm.expectRevert(CookieJarFactory.CookieJarFactory__JarNotFound.selector);
        factory.getMetadata(fakeJar);
    }

    function testCreateCookieJarWithFee() public {
        uint256 customFee = 500; // 5%
        string memory metadata = "Custom fee jar";

        vm.startPrank(user);
        address jarAddress = factory.createCookieJarWithFee(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            metadata,
            customFee
        );
        vm.stopPrank();

        // Verify jar was created
        assertTrue(jarAddress != address(0));

        // Verify metadata was set
        assertEq(factory.getMetadata(jarAddress), metadata);

        // Verify jar index was set
        assertTrue(factory.jarIndex(jarAddress) < factory.getCookieJars().length);

        // Verify the jar has custom fee
        CookieJar jar = CookieJar(jarAddress);
        assertEq(jar.feePercentageOnDeposit(), customFee);
    }

    function testCreateCookieJarWithFeeClampedToMax() public {
        uint256 excessiveFee = 15000; // 150% (should be clamped to 10000)

        vm.startPrank(user);
        address jarAddress = factory.createCookieJarWithFee(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Test metadata",
            excessiveFee
        );
        vm.stopPrank();

        // Verify fee was clamped to 100%
        CookieJar jar = CookieJar(jarAddress);
        assertEq(jar.feePercentageOnDeposit(), 10000);
    }

    function testCreateCookieJarWithZeroFee() public {
        uint256 zeroFee = 0;

        vm.startPrank(user);
        address jarAddress = factory.createCookieJarWithFee(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Zero fee jar",
            zeroFee
        );
        vm.stopPrank();

        // Verify zero fee was set
        CookieJar jar = CookieJar(jarAddress);
        assertEq(jar.feePercentageOnDeposit(), 0);
    }

    function testCreateCookieJarWithFeeFailsForEmptyMetadata() public {
        vm.startPrank(user);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__InvalidMetadata.selector);
        factory.createCookieJarWithFee(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "", // Empty metadata
            100
        );
        vm.stopPrank();
    }

    function testJarIndexMapping() public {
        vm.startPrank(user);

        // Create first jar
        address jar1 = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "First jar"
        );

        // Create second jar
        address jar2 = factory.createCookieJar(
            user,
            address(3),
            CookieJarLib.AccessType.Allowlist,
            emptyAddresses,
            emptyTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            emptyAllowlist,
            "Second jar"
        );

        vm.stopPrank();

        // Verify jar indices
        assertEq(factory.jarIndex(jar1), 0);
        assertEq(factory.jarIndex(jar2), 1);

        // Verify we can get metadata using the indices
        assertEq(factory.getMetadata(jar1), "First jar");
        assertEq(factory.getMetadata(jar2), "Second jar");
    }

    // Events for testing
    event CookieJarMetadataUpdated(address indexed jar, string newMetadata);
}
