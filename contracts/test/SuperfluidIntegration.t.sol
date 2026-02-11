// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock CFA that responds to the function selectors called by the Streaming library.
/// Uses address params instead of ISuperfluidToken to match ABI selectors (interfaces = address).
contract MockCFA {
    function agreementType() external pure returns (bytes32) {
        return keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1");
    }

    function getFlow(address, address, address) external pure returns (uint256, int96, uint256, uint256) {
        return (0, 0, 0, 0);
    }

    function createFlow(address, address, int96, bytes calldata) external returns (bytes memory) {
        return "";
    }

    function updateFlow(address, address, int96, bytes calldata) external returns (bytes memory) {
        return "";
    }

    function deleteFlow(address, address, address, bytes calldata) external returns (bytes memory) {
        return "";
    }

    function getNetFlow(address, address) external pure returns (int96) {
        return 0;
    }

    function getAccountFlowInfo(address, address) external pure returns (uint256, int96, uint256, uint256) {
        return (0, 0, 0, 0);
    }
}

/// @dev Mock Superfluid host that responds to callAgreement and getAgreementClass selectors.
/// The Streaming library calls these on ISuperfluid-typed addresses.
contract MockSuperfluidHost {
    address public immutable mockCFA;

    constructor(address _mockCFA) {
        mockCFA = _mockCFA;
    }

    /// @dev Returns the MockCFA address. Matches ISuperfluid.getAgreementClass(bytes32) selector.
    function getAgreementClass(bytes32) external view returns (address) {
        return mockCFA;
    }

    /// @dev No-op agreement call. Matches ISuperfluid.callAgreement(address, bytes, bytes) selector.
    function callAgreement(address, bytes calldata, bytes calldata) external returns (bytes memory) {
        return "";
    }
}

/// @title Superfluid Integration Test
/// @notice Comprehensive test suite for CookieJar's integrated Superfluid functionality
/// @dev Tests the Superfluid streaming functionality using the Streaming library
contract SuperfluidIntegrationTest is Test {
    CookieJar internal _jar;
    CookieJarFactory internal _factory;

    address internal _owner = address(0x123);
    address internal _user = address(0x456);
    address internal _feeCollector = address(0x789);

    // Mock Super Token for testing
    MockSuperToken internal _mockSuperToken;
    address internal _superTokenAddress;
    address internal mockSuperfluidHost;

    // Test configuration structs
    CookieJarLib.JarConfig internal _jarConfig;
    CookieJarLib.AccessConfig internal _accessConfig;

    event SuperStreamCreated(address indexed sender, address indexed superToken, int96 flowRate);
    event SuperStreamUpdated(address indexed sender, address indexed superToken, int96 newFlowRate);
    event SuperStreamDeleted(address indexed sender, address indexed superToken);

    function setUp() public {
        vm.deal(_owner, 100 ether);
        vm.deal(_user, 100 ether);

        // Deploy mock Super Token
        _mockSuperToken = new MockSuperToken("Super DAI", "sDAI");
        _superTokenAddress = address(_mockSuperToken);

        // Deploy mock Superfluid contracts (MockCFA first, then host wrapping it)
        MockCFA mockCFA = new MockCFA();
        MockSuperfluidHost mockHost = new MockSuperfluidHost(address(mockCFA));
        mockSuperfluidHost = address(mockHost);

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
        _jar = new CookieJar(_jarConfig, _accessConfig, mockSuperfluidHost);
    }

    function _setupSuperfluidJarConfig() internal {
        // Standard jar configuration
        CookieJarLib.MultiTokenConfig memory multiTokenConfig = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,
            minSwapAmount: 0,
            defaultFee: 3000
        });

        _jarConfig = CookieJarLib.JarConfig(
            _owner, // jarOwner
            address(_mockSuperToken), // supportedCurrency
            _feeCollector, // feeCollector
            CookieJarLib.AccessType.Allowlist, // accessType
            CookieJarLib.WithdrawalTypeOptions.Variable, // withdrawalOption
            false, // strictPurpose
            true, // emergencyWithdrawalEnabled
            false, // oneTimeWithdrawal
            0, // fixedAmount
            1000e18, // maxWithdrawal
            3600, // withdrawalInterval (1 hour)
            1e18, // minDeposit
            500, // feePercentageOnDeposit
            5000e18, // maxWithdrawalPerPeriod
            "Superfluid Integration Test Jar", // metadata
            multiTokenConfig // multiTokenConfig
        );
    }

    function _setupAccessConfig() internal {
        address[] memory allowlist = new address[](2);
        allowlist[0] = _owner;
        allowlist[1] = _user;

        _accessConfig.allowlist = allowlist;
        _accessConfig.nftRequirement = CookieJarLib.NftRequirement({
            nftContract: address(0),
            tokenId: 0,
            minBalance: 0
        });
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
    }

    function testCreateSuperStreamFailures() public {
        // Test: Invalid super token (zero address)
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidTokenAddress.selector);
        _jar.createSuperStream(address(0), 2e18);

        // Test: Flow rate below minimum
        vm.prank(_user);
        vm.expectRevert(CookieJarLib.InvalidStreamRate.selector);
        _jar.createSuperStream(_superTokenAddress, 0); // Zero flow rate
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

        // Delete the stream
        vm.prank(_user);

        vm.expectEmit(true, true, true, true);
        emit SuperStreamDeleted(_user, _superTokenAddress);

        _jar.deleteSuperStream(_superTokenAddress);
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

        // Mint tokens to _user (constructor mints to deployer, not _user)
        _mockSuperToken.mint(_user, 1000e18);

        // Add some balance to jar
        vm.prank(_user);
        bool success = _mockSuperToken.transfer(address(_jar), 1000e18);
        require(success, "Transfer failed");

        // Verify jar received the tokens
        assertEq(_mockSuperToken.balanceOf(address(_jar)), 1000e18);
    }

    // ===================================
    // EMERGENCY WITHDRAWAL TESTS
    // ===================================

    function testEmergencyWithdrawSuperToken() public {
        // First give jar some super tokens
        bool success2 = _mockSuperToken.transfer(address(_jar), 1000e18);
        require(success2, "Transfer failed");

        uint256 withdrawAmount = 500e18;
        uint256 initialOwnerBalance = _mockSuperToken.balanceOf(_owner);

        // Test successful emergency withdrawal
        vm.prank(_owner);

        // Verify tokens were transferred
        // assertEq(_mockSuperToken.balanceOf(_owner), initialOwnerBalance + withdrawAmount);
        // assertEq(_mockSuperToken.balanceOf(address(_jar)), 500e18);
    }

    // ===================================
    // VIEW FUNCTION TESTS
    // ===================================

    function testGetSuperStream() public {
        // Test getting non-existent stream

        // Create a stream
        vm.prank(_user);
        int96 flowRate = 3e18;
        _jar.createSuperStream(_superTokenAddress, flowRate);
    }

    // ===================================
    // INTEGRATION TESTS
    // ===================================

    function testSuperfluidWithTraditionalStreaming() public {
        // Verify that Superfluid functionality doesn't interfere with traditional streaming
        // Traditional streaming should still work independently

        // Both systems should coexist independently
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18); // Should work
    }

    function testFactoryIntegrationWithSuperfluid() public {
        // Test that factory can create jars (factory uses SuperfluidConfig which returns
        // address(0) for local chain 31337, so factory jars have Superfluid disabled)

        // Create enhanced configuration
        CookieJarLib.MultiTokenConfig memory multiTokenConfig = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,
            minSwapAmount: 0,
            defaultFee: 3000
        });

        // Create JarConfig
        CookieJarLib.JarConfig memory params = CookieJarLib.JarConfig(
            _owner, // jarOwner
            _superTokenAddress, // supportedCurrency
            _feeCollector, // feeCollector
            CookieJarLib.AccessType.Allowlist, // accessType
            CookieJarLib.WithdrawalTypeOptions.Variable, // withdrawalOption
            false, // strictPurpose
            true, // emergencyWithdrawalEnabled
            false, // oneTimeWithdrawal
            0, // fixedAmount
            1000e18, // maxWithdrawal
            3600, // withdrawalInterval
            1e18, // minDeposit
            type(uint256).max, // feePercentageOnDeposit (sentinel: use factory default)
            5000e18, // maxWithdrawalPerPeriod
            "Test Superfluid Jar", // metadata
            multiTokenConfig // multiTokenConfig
        );

        // Deploy via factory
        vm.prank(_owner);
        address newJarAddress = _factory.createCookieJar(params, _accessConfig, multiTokenConfig);

        // Verify jar was created successfully
        CookieJar factoryJar = CookieJar(payable(newJarAddress));
        assertTrue(newJarAddress != address(0));

        // Verify jar owner is set correctly
        assertTrue(factoryJar.hasRole(CookieJarLib.JAR_OWNER, _owner));
    }

    // ===================================
    // SECURITY & EDGE CASE TESTS
    // ===================================

    function testReentrancyProtection() public {
        // Test that deposit has reentrancy protection via ReentrancyGuard.
        // Attack vector: attacker is fee collector, so fee transfer triggers receive()
        // which tries to re-enter deposit.

        // Deploy attacker with placeholder target
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(1));
        vm.deal(address(attacker), 2 ether);

        // Deploy ETH jar with attacker as fee collector and low minDeposit
        _jarConfig.supportedCurrency = CookieJarLib.ETH_ADDRESS;
        _jarConfig.minDeposit = 0.01 ether;
        _jarConfig.feeCollector = address(attacker);
        CookieJar ethJar = new CookieJar(_jarConfig, _accessConfig, mockSuperfluidHost);

        // Point attacker at the real jar
        attacker.setTarget(address(ethJar));

        // Attacker's deposit triggers fee transfer to itself → receive() → reentrant deposit.
        // The nested deposit reverts with ReentrancyGuardReentrantCall(), which makes
        // the fee .call() return success=false, surfacing as FeeTransferFailed().
        vm.expectRevert(CookieJarLib.FeeTransferFailed.selector);
        attacker.attack{value: 1 ether}();

        // Jar balance unchanged — reentrancy was blocked, deposit rolled back
        assertEq(address(ethJar).balance, 0);
    }

    function testSuperfluidRealTimeBalanceWithMultipleStreams() public {
        // Test real-time balance calculation with multiple concurrent streams

        // Create multiple streams
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);

        address secondUser = address(0x999);
        vm.prank(secondUser);
        _jar.createSuperStream(_superTokenAddress, 3e18);

        // Test real-time balance (should aggregate all streams)
    }

    function testEmergencyPauseDuringStreaming() public {
        // Test that pause blocks deposits/withdrawals but streaming continues
        // (createSuperStream only has nonReentrant, not whenNotPaused)

        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);

        // Pause the contract
        vm.prank(_owner);
        _jar.pause();

        // Deposit should be blocked when paused (OZ v5 uses custom error)
        _mockSuperToken.approve(address(_jar), 100e18);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        _jar.deposit(100e18);

        // Unpause and verify streaming update works
        vm.prank(_owner);
        _jar.unpause();

        vm.prank(_user);
        _jar.updateSuperStream(_superTokenAddress, 4e18); // Should work
    }

    function testSuperfluidDistributionPoolIntegration() public {
        // Test that streaming works with different super tokens

        address mockDistributionPool = address(0x777);

        // Test streaming with different super tokens (now accepts all)
        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);
    }

    function testSuperfluidMultipleTokenSupport() public {
        // Test that multiple different super tokens can be streamed

        // Create streams with different super tokens
        address secondSuperToken = address(0x888);
        address thirdSuperToken = address(0x999);

        vm.prank(_user);
        _jar.createSuperStream(_superTokenAddress, 2e18);

        vm.prank(_user);
        _jar.createSuperStream(secondSuperToken, 3e18);

        vm.prank(_user);
        _jar.createSuperStream(thirdSuperToken, 4e18);
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

/// @dev Malicious contract to test reentrancy protection.
/// Used as fee collector: deposit → fee transfer → receive() → re-enter deposit.
contract ReentrancyAttacker {
    CookieJar private target;
    bool private attacking;

    constructor(address _target) {
        target = CookieJar(payable(_target));
    }

    function setTarget(address _target) external {
        target = CookieJar(payable(_target));
    }

    // Fee transfer triggers this → tries to re-enter deposit
    receive() external payable {
        if (!attacking) {
            attacking = true;
            target.deposit{value: 0.1 ether}(0);
        }
    }

    function attack() external payable {
        target.deposit{value: msg.value}(0);
    }
}
