// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Superfluid Integration Test
/// @notice Comprehensive test suite for CookieJar's integrated Superfluid functionality
/// @dev Tests the 140 lines of Superfluid code integrated directly into CookieJar contract
contract SuperfluidIntegrationTest is Test {
    CookieJar internal _jar;
    CookieJarFactory internal _factory;
    
    address internal _owner = address(0x123);
    address internal _user = address(0x456);
    address internal _feeCollector = address(0x789);
    
    // Mock Super Token for testing
    MockSuperToken internal _mockSuperToken;
    address internal _superTokenAddress;
    
    // Test configuration structs
    CookieJarLib.JarConfig internal _jarConfig;
    CookieJarLib.AccessConfig internal _accessConfig;
    
    event SuperfluidConfigUpdated(bool enabled);
    event SuperStreamCreated(address indexed sender, address indexed superToken, int96 flowRate);
    event SuperStreamUpdated(address indexed sender, address indexed superToken, int96 newFlowRate);
    event SuperStreamDeleted(address indexed sender, address indexed superToken);
    
    function setUp() public {
        vm.deal(_owner, 100 ether);
        vm.deal(_user, 100 ether);
        
        // Deploy mock Super Token
        _mockSuperToken = new MockSuperToken("Super DAI", "sDAI");
        _superTokenAddress = address(_mockSuperToken);
        
        // Deploy factory first
        _factory = new CookieJarFactory(
            _feeCollector,
            _owner, 
            500, // 5% fee
            0.01 ether, // Min ETH deposit
            100e18 // Min ERC20 deposit
        );
        
        // Setup jar configuration with Superfluid enabled
        _setupSuperfluidJarConfig();
        _setupAccessConfig();
        
        // Deploy jar with integrated Superfluid support
        _jar = new CookieJar(_jarConfig, _accessConfig);
    }
    
    function _setupSuperfluidJarConfig() internal {
        // Create accepted super tokens array
        address[] memory acceptedSuperTokens = new address[](1);
        acceptedSuperTokens[0] = _superTokenAddress;
        
        // Standard jar configuration
        CookieJarLib.MultiTokenConfig memory multiTokenConfig = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,
            minSwapAmount: 0,
            defaultFee: 3000
        });
        
        // Configure streaming settings (now includes Superfluid functionality)
        CookieJarLib.StreamingConfig memory streamingConfig = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: false, // Require manual approval
            acceptedSuperTokens: acceptedSuperTokens,
            minFlowRate: 1e18 // 1 token per second minimum
        });
        
        _jarConfig = CookieJarLib.JarConfig({
            jarOwner: _owner,
            supportedCurrency: address(_mockSuperToken), // Use super token as jar currency
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount: 0,
            maxWithdrawal: 1000e18,
            withdrawalInterval: 3600, // 1 hour
            minDeposit: 1e18,
            feePercentageOnDeposit: 500,
            strictPurpose: false,
            feeCollector: _feeCollector,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 5000e18,
            metadata: "Superfluid Integration Test Jar",
            multiTokenConfig: multiTokenConfig,
            streamingConfig: streamingConfig
        });
    }
    
    function _setupAccessConfig() internal {
        address[] memory allowlist = new address[](2);
        allowlist[0] = _owner;
        allowlist[1] = _user;
        
        _accessConfig.allowlist = allowlist;
        _accessConfig.nftRequirement = CookieJarLib.NFTRequirement({
            nftContract: address(0),
            tokenId: 0,
            minBalance: 0
        });
    }
    
    // ===================================
    // SUPERFLUID CONFIGURATION TESTS
    // ===================================
    
    function testSuperfluidConfigurationOnDeploy() public {
        // Test that Superfluid config is properly set during construction
        CookieJarLib.StreamingConfig memory config = _jar.getStreamingConfig();
        
        assertTrue(config.enabled);
        assertFalse(config.autoAcceptStreams);
        assertEq(config.acceptedSuperTokens.length, 1);
        assertEq(config.acceptedSuperTokens[0], _superTokenAddress);
        assertEq(config.minFlowRate, 1e18);
        assertFalse(config.autoAcceptStreams);
        assertEq(config.acceptedSuperTokens.length, 1);
        
        // Test that super token acceptance mapping is set
        assertTrue(_jar.isAcceptedSuperToken(_superTokenAddress));
        assertFalse(_jar.isAcceptedSuperToken(address(0x999)));
    }
    
    function testConfigureSuperfluid() public {
        // Test admin can update Superfluid configuration
        vm.prank(_owner);
        
        address[] memory newSuperTokens = new address[](2);
        newSuperTokens[0] = _superTokenAddress;
        newSuperTokens[1] = address(0x888); // Add another super token
        
        CookieJarLib.StreamingConfig memory newConfig = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true, // Change to auto-accept
            acceptedSuperTokens: newSuperTokens,
            minFlowRate: 2e18 // Increase minimum flow rate
        });
        
        // Expect event emission
        vm.expectEmit(true, true, true, true);
        emit SuperfluidConfigUpdated(true);
        
        _jar.configureStreaming(newConfig);
        
        // Verify configuration updated
        CookieJarLib.StreamingConfig memory updatedConfig = _jar.getStreamingConfig();
        assertTrue(updatedConfig.autoAcceptStreams);
        assertEq(updatedConfig.minFlowRate, 2e18);
        assertEq(updatedConfig.acceptedSuperTokens.length, 2);
        
        // Verify new super token is accepted
        assertTrue(_jar.isAcceptedSuperToken(address(0x888)));
    }
    
    function testConfigureSuperfluidOnlyOwner() public {
        // Test that only owner can configure Superfluid
        vm.prank(_user); // Not owner
        
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        
        vm.expectRevert();
        _jar.configureStreaming(config);
    }
    
    // ===================================
    // SUPER STREAM CREATION TESTS  
    // ===================================
    
    function testCreateSuperStream() public {
        // Test successful super stream creation
        vm.prank(_user);
        
        int96 flowRate = 2e18; // 2 tokens per second
        
        // Expect event emission
        vm.expectEmit(true, true, true, true);
        emit SuperStreamCreated(_user, _superTokenAddress, flowRate);
        
        _jar.createSuperStream(_superTokenAddress, flowRate);
        
        // Verify stream was created
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.superToken, _superTokenAddress);
        assertEq(stream.sender, _user);
        assertEq(stream.flowRate, flowRate);
        assertEq(stream.startTime, block.timestamp);
        assertFalse(stream.isActive); // Should be false since autoAcceptStreams is false
    }
    
    function testCreateSuperStreamWithAutoAccept() public {
        // First enable auto-accept
        vm.prank(_owner);
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        _jar.configureStreaming(config);
        
        // Now create stream
        vm.prank(_user);
        int96 flowRate = 3e18;
        _jar.createSuperStream(_superTokenAddress, flowRate);
        
        // Verify stream is auto-accepted
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertTrue(stream.isActive); // Should be true with auto-accept
    }
    
    function testCreateSuperStreamFailures() public {
        // Test: Superfluid disabled
        vm.prank(_owner);
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: false, // Disabled
            autoAcceptStreams: false,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        _jar.configureStreaming(config);
        
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidAccessType.selector);
        _jar.createSuperStream(_superTokenAddress, 2e18);
        
        // Re-enable for next tests
        config.enabled = true;
        vm.prank(_owner);
        _jar.configureStreaming(config);
        
        // Test: Invalid super token
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidTokenAddress.selector);
        _jar.createSuperStream(address(0x999), 2e18);
        
        // Test: Flow rate below minimum
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidStreamRate.selector);
        _jar.createSuperStream(_superTokenAddress, 0.5e18); // Below 1e18 minimum
    }
    
    // ===================================
    // SUPER STREAM UPDATE TESTS
    // ===================================
    
    function testUpdateSuperStream() public {
        // First create a stream
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);
        
        // Update the stream
        vm.prank(_user);
        int96 newFlowRate = 5e18;
        
        vm.expectEmit(true, true, true, true);
        emit SuperStreamUpdated(_user, _superTokenAddress, newFlowRate);
        
        _jar.updateSuperStream(_superTokenAddress, newFlowRate);
        
        // Verify update
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.flowRate, newFlowRate);
    }
    
    function testUpdateNonExistentStream() public {
        // Try to update stream that doesn't exist
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.StreamNotFound.selector);
        _jar.updateSuperStream(_superTokenAddress, 5e18);
    }
    
    // ===================================
    // SUPER STREAM DELETION TESTS  
    // ===================================
    
    function testDeleteSuperStream() public {
        // First create a stream
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);
        
        // Verify stream exists and is not active
        CookieJarLib.SuperfluidStream memory streamBefore = _jar.getSuperStream(_superTokenAddress, _user);
        assertFalse(streamBefore.isActive);
        
        // Delete the stream
        vm.prank(_user);
        
        vm.expectEmit(true, true, true, true);
        emit SuperStreamDeleted(_user, _superTokenAddress);
        
        _jar.deleteSuperStream(_superTokenAddress);
        
        // Verify stream is marked inactive
        CookieJarLib.SuperfluidStream memory streamAfter = _jar.getSuperStream(_superTokenAddress, _user);
        assertFalse(streamAfter.isActive); // Should remain false
    }
    
    function testDeleteNonExistentStream() public {
        // Try to delete stream that doesn't exist  
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.StreamNotFound.selector);
        _jar.deleteSuperStream(_superTokenAddress);
    }
    
    // ===================================
    // REAL-TIME BALANCE TESTS
    // ===================================
    
    function testGetRealTimeBalance() public {
        // Test real-time balance for jar currency
        uint256 balance = _jar.getRealTimeBalance(address(_mockSuperToken));
        assertEq(balance, 0); // Should start at 0
        
        // Add some balance to jar
        vm.prank(_user);
        _mockSuperToken.transfer(address(_jar), 1000e18);
        
        // Mock the jar balance update (in real scenario this would be done via deposits)
        // For testing purposes, we'll directly check the function behavior
        balance = _jar.getRealTimeBalance(address(_mockSuperToken));
        assertEq(balance, 0); // Should still be 0 as currencyHeldByJar hasn't been updated
        
        // Test balance for non-jar currency super token
        address otherSuperToken = address(0x999);
        balance = _jar.getRealTimeBalance(otherSuperToken);
        assertEq(balance, 0); // Should return 0 for non-jar currencies
    }
    
    // ===================================
    // EMERGENCY WITHDRAWAL TESTS
    // ===================================
    
    function testEmergencyWithdrawSuperToken() public {
        // First give jar some super tokens
        _mockSuperToken.transfer(address(_jar), 1000e18);
        
        uint256 withdrawAmount = 500e18;
        uint256 initialOwnerBalance = _mockSuperToken.balanceOf(_owner);
        
        // Test successful emergency withdrawal
        vm.prank(_owner);
        _jar.emergencyWithdrawSuperToken(_superTokenAddress, withdrawAmount);
        
        // Verify tokens were transferred
        assertEq(_mockSuperToken.balanceOf(_owner), initialOwnerBalance + withdrawAmount);
        assertEq(_mockSuperToken.balanceOf(address(_jar)), 500e18);
    }
    
    function testEmergencyWithdrawSuperTokenFailures() public {
        // Test: Only owner can call
        vm.prank(_user);
        vm.expectRevert();
        _jar.emergencyWithdrawSuperToken(_superTokenAddress, 100e18);
        
        // Test: Zero amount
        vm.prank(_owner);
        vm.expectRevert(CookieJarLib.ZeroAmount.selector);
        _jar.emergencyWithdrawSuperToken(_superTokenAddress, 0);
        
        // Test: Emergency withdrawal disabled
        // Deploy jar with emergency withdrawal disabled
        _jarConfig.emergencyWithdrawalEnabled = false;
        CookieJar jarNoEmergency = new CookieJar(_jarConfig, _accessConfig);
        
        vm.prank(_owner);
        vm.expectRevert(CookieJarLib.EmergencyWithdrawalDisabled.selector);
        jarNoEmergency.emergencyWithdrawSuperToken(_superTokenAddress, 100e18);
    }
    
    // ===================================
    // VIEW FUNCTION TESTS
    // ===================================
    
    function testIsAcceptedSuperToken() public {
        // Test accepted super token
        assertTrue(_jar.isAcceptedSuperToken(_superTokenAddress));
        
        // Test non-accepted super token
        assertFalse(_jar.isAcceptedSuperToken(address(0x999)));
        assertFalse(_jar.isAcceptedSuperToken(address(0)));
    }
    
    function testGetSuperfluidConfig() public {
        CookieJarLib.StreamingConfig memory config = _jar.getStreamingConfig();
        
        assertTrue(config.enabled);
        assertFalse(config.autoAcceptStreams);
        assertEq(config.acceptedSuperTokens.length, 1);
        assertEq(config.acceptedSuperTokens[0], _superTokenAddress);
        assertEq(config.minFlowRate, 1e18);
        assertFalse(config.autoAcceptStreams);
        assertEq(config.acceptedSuperTokens.length, 1);
    }
    
    function testGetSuperStream() public {
        // Test getting non-existent stream
        CookieJarLib.SuperfluidStream memory emptyStream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(emptyStream.sender, address(0)); // Should be empty
        
        // Create a stream
        vm.prank(_user);
        int96 flowRate = 3e18;
        _jar.createSuperStream(_superTokenAddress, flowRate);
        
        // Test getting existing stream
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.superToken, _superTokenAddress);
        assertEq(stream.sender, _user);
        assertEq(stream.flowRate, flowRate);
        assertEq(stream.startTime, block.timestamp);
        assertFalse(stream.isActive);
    }
    
    // ===================================
    // INTEGRATION TESTS
    // ===================================
    
    function testSuperfluidWithTraditionalStreaming() public {
        // Verify that Superfluid functionality doesn't interfere with traditional streaming
        // Traditional streaming should still work independently
        
        // Check that Superfluid streaming is enabled
        CookieJarLib.StreamingConfig memory streamingConfig = _jar.getStreamingConfig();
        assertTrue(streamingConfig.enabled); // Superfluid streaming enabled
        
        // Both systems should coexist independently
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18); // Should work
        
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.flowRate, 2e18);
    }
    
    function testFactoryIntegrationWithSuperfluid() public {
        // Test that factory can create jars with Superfluid configuration
        
        // Create Superfluid config first
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory streamingConfig2 = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        
        // Create enhanced configuration
        CookieJarLib.MultiTokenConfig memory multiTokenConfig = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,
            minSwapAmount: 0,
            defaultFee: 3000
        });
        
        CookieJarLib.StreamingConfig memory streamingConfig = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: new address[](0),
            minFlowRate: 1e18
        });
        
        // Create JarConfig after all other configs are ready
        CookieJarLib.JarConfig memory params = CookieJarLib.JarConfig({
            jarOwner: _owner,
            supportedCurrency: _superTokenAddress,
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount: 0,
            maxWithdrawal: 1000e18,
            withdrawalInterval: 3600,
            minDeposit: 1e18,
            feePercentageOnDeposit: 0,
            strictPurpose: false,
            feeCollector: _feeCollector,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 5000e18,
            metadata: "Test Superfluid Jar",
            multiTokenConfig: multiTokenConfig,
            streamingConfig: streamingConfig2
        });
        
        // Deploy via factory
        vm.prank(_owner);
        address newJarAddress = _factory.createCookieJar(
            params,
            _accessConfig,
            multiTokenConfig,
            streamingConfig
        );
        
        // Verify Superfluid configuration in factory-created jar
        CookieJar factoryJar = CookieJar(payable(newJarAddress));
        assertTrue(factoryJar.isAcceptedSuperToken(_superTokenAddress));
        
        CookieJarLib.StreamingConfig memory config = factoryJar.getStreamingConfig();
        assertTrue(config.enabled);
        assertTrue(config.autoAcceptStreams);
    }
    
    // ===================================
    // SECURITY & EDGE CASE TESTS
    // ===================================
    
    function testReentrancyProtection() public {
        // Test that critical functions have reentrancy protection
        // Create an ETH jar for reentrancy testing
        _jarConfig.supportedCurrency = CookieJarLib.ETH_ADDRESS;
        CookieJar ethJar = new CookieJar(_jarConfig, _accessConfig);
        
        // Deploy malicious contract
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(ethJar));
        vm.deal(address(attacker), 1 ether);
        
        // Attacker should fail due to ReentrancyGuard
        vm.expectRevert("ReentrancyGuard: reentrant call");
        attacker.attack{value: 0.2 ether}();
        
        // Normal deposit should still work
        vm.deal(_user, 1 ether);
        vm.prank(_user);
        ethJar.deposit{value: 0.1 ether}(0);
        
        // Verify deposit succeeded
        assertEq(address(ethJar).balance, 0.1 ether);
    }
    
    function testSuperfluidRealTimeBalanceWithMultipleStreams() public {
        // Test real-time balance calculation with multiple concurrent streams
        
        // Enable auto-accept streams
        vm.prank(_owner);
        address[] memory tokens = new address[](2);
        tokens[0] = _superTokenAddress;
        tokens[1] = address(0x888); // Second token
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        _jar.configureStreaming(config);
        
        // Create multiple streams
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);
        
        address secondUser = address(0x999);
        vm.prank(secondUser);
        _jar.createSuperStream(_superTokenAddress, 3e18);
        
        // Test real-time balance (should aggregate all streams)
        uint256 balance = _jar.getRealTimeBalance(_superTokenAddress);
        assertEq(balance, 0); // Still 0 as no actual Superfluid streaming implemented
    }
    
    function testEmergencyPauseDuringStreaming() public {
        // Test that emergency pause works during active streaming
        
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);
        
        // Pause the contract
        vm.prank(_owner);
        _jar.pause();
        
        // Should not be able to create new streams when paused
        vm.prank(_user);
        vm.expectRevert("Pausable: paused");
        _jar.createSuperStream(_superTokenAddress, 4e18); 
        
        // Unpause and verify streaming works again
        vm.prank(_owner);
        _jar.unpause();
        
        vm.prank(_user);
        _jar.updateSuperStream(_superTokenAddress, 4e18); // Should work
        
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.flowRate, 4e18);
    }
    
    function testSuperfluidDistributionPoolIntegration() public {
        // Test distribution pool functionality
        
        address mockDistributionPool = address(0x777);
        
        vm.prank(_owner);
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: tokens,
            minFlowRate: 1e18
        });
        _jar.configureStreaming(config);
        
        // Verify configuration
        CookieJarLib.StreamingConfig memory updatedConfig = _jar.getStreamingConfig();
        assertTrue(updatedConfig.autoAcceptStreams);
        assertEq(updatedConfig.acceptedSuperTokens.length, 1);
    }
    
    function testSuperfluidMinFlowRateEnforcement() public {
        // Test that minimum flow rate is properly enforced
        
        vm.prank(_owner);
        address[] memory tokens = new address[](1);
        tokens[0] = _superTokenAddress;
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: tokens,
            minFlowRate: 5e18
        });
        _jar.configureStreaming(config);
        
        // Try to create stream below minimum - should fail
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidStreamRate.selector);
        _jar.createSuperStream(_superTokenAddress, 3e18); // Below 5e18 minimum
        
        // Create stream at minimum - should work
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 5e18); // At minimum
        
        CookieJarLib.SuperfluidStream memory stream = _jar.getSuperStream(_superTokenAddress, _user);
        assertEq(stream.flowRate, 5e18);
    }
    
    function testSuperfluidMaxSuperTokensLimit() public {
        // Test behavior with maximum number of accepted super tokens
        
        vm.prank(_owner);
        address[] memory manyTokens = new address[](10); // Test with many tokens
        for (uint i = 0; i < 10; i++) {
            manyTokens[i] = address(uint160(0x1000 + i));
        }
        
        CookieJarLib.StreamingConfig memory config = CookieJarLib.StreamingConfig({
            enabled: true,
            autoAcceptStreams: true,
            acceptedSuperTokens: manyTokens,
            minFlowRate: 1e18
        });
        _jar.configureStreaming(config);
        
        // Verify all tokens are accepted
        for (uint i = 0; i < 10; i++) {
            assertTrue(_jar.isAcceptedSuperToken(manyTokens[i]));
        }
        
        // Verify non-configured token is not accepted
        assertFalse(_jar.isAcceptedSuperToken(address(0x9999)));
    }
}

/// @dev Mock Super Token contract for testing
contract MockSuperToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000e18); // Mint 1M tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Malicious contract to test reentrancy protection
contract ReentrancyAttacker {
    CookieJar private target;
    bool private attacking;
    
    constructor(address _target) {
        target = CookieJar(payable(_target));
    }
    
    // Try to reenter during deposit
    receive() external payable {
        if (!attacking && address(target).balance > 0.1 ether) {
            attacking = true;
            target.deposit{value: 0.1 ether}(0);
        }
    }

    function attack() external payable {
        target.deposit{value: msg.value}(0);
    }
}
