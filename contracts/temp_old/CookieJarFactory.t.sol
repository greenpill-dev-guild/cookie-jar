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
    address[] private testUsers; // Renamed from users to avoid naming conflicts
    address[] public emptyAllowlist;
    HelperConfig.NetworkConfig config;
    ERC20Mock testToken;

    // Helper function to create default jar parameters
    function createDefaultJarParams(
        address jarOwner,
        address currency,
        string memory metadata
    ) internal view returns (CookieJarLib.CreateJarParams memory) {
        return CookieJarLib.CreateJarParams(
            jarOwner,
            currency,
            CookieJarLib.AccessType.Allowlist,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false, // oneTimeWithdrawal
            metadata,
            0, // customFeePercentage
            0  // maxWithdrawalPerPeriod
        );
    }

    // Helper function to create default access config
    function createDefaultAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return CookieJarLib.AccessConfig(
            emptyAddresses,
            emptyTypes,
            emptyAllowlist,
            CookieJarLib.POAPRequirement(0, address(0)),
            CookieJarLib.UnlockRequirement(address(0)),
            CookieJarLib.HypercertRequirement(address(0), 0, 1),
            CookieJarLib.HatsRequirement(0, address(0))
        );
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
            config.minETHDeposit,
            config.minERC20Deposit
        );
        vm.stopPrank();
    }

    function testCreateCookieJarByBlacklistedPersonReverts() public {
        address[] memory localUsers = new address[](1); // Use local variable
        localUsers[0] = user;
        
        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(localUsers);

        vm.prank(localUsers[0]);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__Blacklisted.selector);
        
        // V2: Use struct-based parameters
        CookieJarLib.CreateJarParams memory params = createDefaultJarParams(
            owner,
            address(3),
            "Test Metadata"
        );
        
        CookieJarLib.AccessConfig memory accessConfig = createDefaultAccessConfig();
        
        factory.createCookieJar(params, accessConfig);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
    }

    /// @notice Test creating a cookie jar by a blacklisted person
    function testCreateCookieJarByBlacklistedPerson() public {
        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(testUsers);
        vm.prank(testUsers[0]);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__Blacklisted.selector);
        
        CookieJarLib.CreateJarParams memory params = createDefaultJarParams(
            owner,
            address(3),
            "Test Metadata"
        );
        
        CookieJarLib.AccessConfig memory accessConfig = createDefaultAccessConfig();
        
        factory.createCookieJar(params, accessConfig);
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 0);
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
    function testCreateCookieJar() public {
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), "Test Metadata"),
            createDefaultAccessConfig()
        );
        
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with custom fee
    function testCreateCookieJarWithCustomFee() public {
        vm.prank(owner);
        CookieJarLib.CreateJarParams memory params = createDefaultJarParams(
            owner,
            address(3),
            "Test Metadata"
        );
        params.customFeePercentage = 500; // 5%
        
        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig()
        );
        
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with Variable withdrawal option
    function testCreateCookieJarWithVariableWithdrawal() public {
        vm.prank(owner);
        CookieJarLib.CreateJarParams memory params = createDefaultJarParams(
            owner,
            address(3),
            "Test Metadata"
        );
        params.withdrawalOption = CookieJarLib.WithdrawalTypeOptions.Variable;
        
        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig()
        );
        
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test creating a cookie jar with One-time withdrawal option
    function testCreateCookieJarWithOneTimeWithdrawal() public {
        vm.prank(owner);
        CookieJarLib.CreateJarParams memory params = createDefaultJarParams(
            owner,
            address(3),
            "Test Metadata"
        );
        params.oneTimeWithdrawal = true;
        
        address jarAddress = factory.createCookieJar(
            params,
            createDefaultAccessConfig()
        );
        
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test granting blacklisted jar creator role
    function testGrantBlacklistedJarCreator() public {
        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(testUsers);
        assertEq(factory.hasRole(keccak256("BLACKLISTED_JAR_CREATORS"), testUsers[0]), true);
        assertEq(factory.hasRole(keccak256("BLACKLISTED_JAR_CREATORS"), testUsers[1]), true);
    }

    /// @notice Test revoking blacklisted jar creator role
    function testRevokeBlacklistedJarCreator() public {
        vm.prank(owner);
        factory.grantBlacklistedJarCreatorsRole(testUsers);
        vm.prank(owner);
        factory.revokeBlacklistedJarCreatorsRole(testUsers);
        assertEq(factory.hasRole(keccak256("BLACKLISTED_JAR_CREATORS"), testUsers[0]), false);
        assertEq(factory.hasRole(keccak256("BLACKLISTED_JAR_CREATORS"), testUsers[1]), false);
    }

    /// @notice Test creating jar with ERC20 token
    function testCreateCookieJarWithERC20() public {
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, address(testToken), "ERC20 Test Jar"),
            createDefaultAccessConfig()
        );
        
        address[] memory cookieJars = factory.getCookieJars();
        assertEq(cookieJars.length, 1);
        assertEq(cookieJars[0], jarAddress);
    }

    /// @notice Test metadata functionality
    function testMetadataFunctionality() public {
        string memory testMetadata = "Test Jar Metadata";
        
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), testMetadata),
            createDefaultAccessConfig()
        );
        
        // Test getMetadata for specific jar
        assertEq(factory.getMetadata(jarAddress), testMetadata);
        
        // Test metadatas by index
        assertEq(factory.metadatas(0), testMetadata);
        
        // Test getMetadatas (batch)
        string[] memory allMetadata = factory.getMetadatas();
        assertEq(allMetadata.length, 1);
        assertEq(allMetadata[0], testMetadata);
    }

    /// @notice Test updating metadata
    function testUpdateMetadata() public {
        string memory originalMetadata = "Original Metadata";
        string memory newMetadata = "Updated Metadata";
        
        vm.prank(owner);
        address jarAddress = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), originalMetadata),
            createDefaultAccessConfig()
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
            createDefaultJarParams(owner, address(3), originalMetadata),
            createDefaultAccessConfig()
        );
        
        // Try to update metadata as non-owner (should fail)
        vm.prank(user);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__NotJarOwner.selector);
        factory.updateMetadata(jarAddress, newMetadata);
    }

    /// @notice Test getting metadata for non-existent jar should fail
    function testGetMetadataForNonExistentJar() public {
        vm.expectRevert(CookieJarFactory.CookieJarFactory__JarNotFound.selector);
        factory.getMetadata(address(0x9999));
    }

    /// @notice Test updating metadata for non-existent jar should fail
    function testUpdateMetadataForNonExistentJar() public {
        vm.prank(owner);
        vm.expectRevert(CookieJarFactory.CookieJarFactory__JarNotFound.selector);
        factory.updateMetadata(address(0x9999), "New Metadata");
    }

    /// @notice Test metadatas function with invalid index
    function testMetadatasInvalidIndex() public {
        vm.expectRevert("Index out of bounds");
        factory.metadatas(999);
    }

    /// @notice Test multiple jars metadata handling
    function testMultipleJarsMetadata() public {
        string memory metadata1 = "Jar 1 Metadata";
        string memory metadata2 = "Jar 2 Metadata";
        string memory metadata3 = "Jar 3 Metadata";
        
        vm.startPrank(owner);
        address jar1 = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), metadata1),
            createDefaultAccessConfig()
        );
        
        address jar2 = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), metadata2),
            createDefaultAccessConfig()
        );
        
        address jar3 = factory.createCookieJar(
            createDefaultJarParams(owner, address(3), metadata3),
            createDefaultAccessConfig()
        );
        vm.stopPrank();
        
        // Test individual metadata retrieval
        assertEq(factory.getMetadata(jar1), metadata1);
        assertEq(factory.getMetadata(jar2), metadata2);
        assertEq(factory.getMetadata(jar3), metadata3);
        
        // Test batch metadata retrieval
        string[] memory allMetadata = factory.getMetadatas();
        assertEq(allMetadata.length, 3);
        assertEq(allMetadata[0], metadata1);
        assertEq(allMetadata[1], metadata2);
        assertEq(allMetadata[2], metadata3);
        
        // Test metadatas by index
        assertEq(factory.metadatas(0), metadata1);
        assertEq(factory.metadatas(1), metadata2);
        assertEq(factory.metadatas(2), metadata3);
    }
}
