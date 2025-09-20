// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/jar/CookieJarWithDetection.sol";
import "../src/factory/CookieJarFactory.sol";
import "../src/utils/CookieJarMonitor.sol";
import "../src/tokens/TestERC20.sol";
import "./mocks/MockWETH.sol";
import "./mocks/MockUniswapV2Router.sol";

/// @title CookieJarDetection Test Suite
/// @notice Comprehensive tests for the detection and recovery system
contract CookieJarDetectionTest is Test {
    
    // === CONTRACTS ===
    CookieJarFactory factory;
    CookieJarWithDetection jar;
    CookieJarMonitor monitor;
    TestERC20 jarToken;
    TestERC20 tokenA;
    TestERC20 tokenB;
    MockWETH weth;
    MockUniswapV2Router router;

    // === ACCOUNTS ===
    address owner = makeAddr("owner");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address attacker = makeAddr("attacker");

    // === CONSTANTS ===
    uint256 constant INITIAL_BALANCE = 1000 ether;
    uint256 constant SWAP_RATE = 2; // 1 input = 2 output tokens

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock contracts
        weth = new MockWETH();
        router = new MockUniswapV2Router(address(weth));
        
        // Deploy test tokens
        jarToken = new TestERC20("JarToken", "JAR", 18);
        tokenA = new TestERC20("TokenA", "TKNA", 18);
        tokenB = new TestERC20("TokenB", "TKNB", 18);

        // Deploy factory
        factory = new CookieJarFactory(address(router), address(weth), owner);

        // Deploy detection jar directly (since factory creates base CookieJar)
        jar = new CookieJarWithDetection(
            address(jarToken),
            false,
            address(router),
            address(weth),
            owner
        );

        // Deploy monitor
        monitor = new CookieJarMonitor();

        // Setup router with tokens and rates
        router.addPair(address(weth), address(jarToken), SWAP_RATE * 1e18);
        router.addPair(address(tokenA), address(jarToken), SWAP_RATE * 1e18);
        router.addPair(address(tokenB), address(jarToken), SWAP_RATE * 1e18);
        router.addPair(address(tokenA), address(weth), SWAP_RATE * 1e18);
        router.addPair(address(tokenB), address(weth), SWAP_RATE * 1e18);

        // Mint tokens for testing
        jarToken.mint(address(this), INITIAL_BALANCE);
        jarToken.mint(user1, INITIAL_BALANCE);
        jarToken.mint(user2, INITIAL_BALANCE);
        tokenA.mint(user1, INITIAL_BALANCE);
        tokenA.mint(user2, INITIAL_BALANCE);
        tokenB.mint(user1, INITIAL_BALANCE);
        tokenB.mint(user2, INITIAL_BALANCE);
        
        // Mint tokens to router for swaps
        jarToken.mint(address(router), INITIAL_BALANCE);
        tokenA.mint(address(router), INITIAL_BALANCE);
        tokenB.mint(address(router), INITIAL_BALANCE);

        // Fund users with ETH
        vm.deal(user1, INITIAL_BALANCE);
        vm.deal(user2, INITIAL_BALANCE);
        vm.deal(address(router), INITIAL_BALANCE);

        vm.stopPrank();
    }

    // === MONITORING TESTS ===

    function test_EnableTokenMonitoring() public {
        // Enable monitoring for tokenA
        jar.enableTokenMonitoring(address(tokenA));
        
        // Check monitoring is enabled
        assertTrue(jar.monitoredTokens(address(tokenA)), "Token should be monitored");
        
        // Check initial balance is recorded
        uint256 initialBalance = tokenA.balanceOf(address(jar));
        assertEq(jar.lastKnownBalance(address(tokenA)), initialBalance, "Initial balance should be recorded");
        
        // Check token is in monitored list
        address[] memory monitoredTokens = jar.getMonitoredTokens();
        assertEq(monitoredTokens.length, 1, "Should have 1 monitored token");
        assertEq(monitoredTokens[0], address(tokenA), "Should be tokenA");
    }

    function test_DisableTokenMonitoring() public {
        // Enable then disable monitoring
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.prank(owner);
        jar.disableTokenMonitoring(address(tokenA));
        
        // Check monitoring is disabled
        assertFalse(jar.monitoredTokens(address(tokenA)), "Token should not be monitored");
        
        // Check token is removed from monitored list
        address[] memory monitoredTokens = jar.getMonitoredTokens();
        assertEq(monitoredTokens.length, 0, "Should have 0 monitored tokens");
    }

    function test_OnlyOwnerCanDisableMonitoring() public {
        jar.enableTokenMonitoring(address(tokenA));
        
        // Non-owner cannot disable
        vm.prank(user1);
        vm.expectRevert();
        jar.disableTokenMonitoring(address(tokenA));
        
        // Owner can disable
        vm.prank(owner);
        jar.disableTokenMonitoring(address(tokenA));
        
        assertFalse(jar.monitoredTokens(address(tokenA)), "Token should be disabled");
    }

    // === DETECTION TESTS ===

    function test_DetectDirectTransfer() public {
        // Enable monitoring
        jar.enableTokenMonitoring(address(tokenA));
        
        uint256 transferAmount = 100 ether;
        
        // Direct transfer from user1
        vm.prank(user1);
        tokenA.transfer(address(jar), transferAmount);
        
        // Scan should detect the transfer
        bool detected = jar.scanToken(address(tokenA));
        assertTrue(detected, "Should detect direct transfer");
        
        // Check unaccounted balance
        uint256 unaccounted = jar.getUnaccountedBalance(address(tokenA));
        assertEq(unaccounted, 0, "Should be 0 after detection"); // Moved to detected transfers
        
        // Check detected transfers
        uint256 totalDetected = jar.getTotalDetectedTransfers();
        assertEq(totalDetected, 1, "Should have 1 detected transfer");
    }

    function test_BatchScanAllTokens() public {
        // Enable monitoring for multiple tokens
        jar.enableTokenMonitoring(address(tokenA));
        jar.enableTokenMonitoring(address(tokenB));
        
        // Direct transfers
        vm.startPrank(user1);
        tokenA.transfer(address(jar), 100 ether);
        tokenB.transfer(address(jar), 200 ether);
        vm.stopPrank();
        
        // Batch scan should detect both
        uint256 detected = jar.scanAllMonitoredTokens();
        assertEq(detected, 2, "Should detect 2 transfers");
    }

    function test_ScanUnmonitoredToken() public {
        // Try to scan token that's not monitored
        vm.expectRevert(CookieJarWithDetection.TokenNotMonitored.selector);
        jar.scanToken(address(tokenA));
    }

    // === AUTO-PROCESSING TESTS ===

    function test_ConfigureAutoProcessing() public {
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(jarToken);
        
        vm.prank(owner);
        jar.configureAutoProcessing(
            address(tokenA),
            true,      // enabled
            10 ether,  // min amount
            500,       // 5% max slippage
            path       // swap path
        );
        
        // Check configuration
        CookieJarWithDetection.AutoProcessSettings memory settings = jar.getAutoProcessSettings(address(tokenA));
        assertTrue(settings.enabled, "Auto-processing should be enabled");
        assertEq(settings.minAmount, 10 ether, "Min amount should be set");
        assertEq(settings.maxSlippage, 500, "Max slippage should be set");
    }

    function test_AutoProcessingOnDetection() public {
        // Configure auto-processing
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(jarToken);
        
        vm.prank(owner);
        jar.configureAutoProcessing(address(tokenA), true, 10 ether, 500, path);
        
        // Enable monitoring
        jar.enableTokenMonitoring(address(tokenA));
        
        uint256 transferAmount = 50 ether; // Above minimum
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        
        // Direct transfer should trigger auto-processing
        vm.prank(user1);
        tokenA.transfer(address(jar), transferAmount);
        
        // Scan should detect and auto-process
        jar.scanToken(address(tokenA));
        
        // Check jar token balance increased
        uint256 expectedOut = transferAmount * SWAP_RATE;
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut, "Jar balance should increase");
    }

    function test_AutoProcessingBelowMinimum() public {
        // Configure auto-processing with high minimum
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(jarToken);
        
        vm.prank(owner);
        jar.configureAutoProcessing(address(tokenA), true, 100 ether, 500, path);
        
        jar.enableTokenMonitoring(address(tokenA));
        
        uint256 transferAmount = 50 ether; // Below minimum
        
        // Direct transfer
        vm.prank(user1);
        tokenA.transfer(address(jar), transferAmount);
        
        // Scan should detect but not auto-process
        jar.scanToken(address(tokenA));
        
        // Check transfer was detected but not processed
        CookieJarWithDetection.DetectedTransfer[] memory transfers = jar.getUnprocessedTransfersForToken(address(tokenA));
        assertEq(transfers.length, 1, "Should have 1 unprocessed transfer");
        assertFalse(transfers[0].processed, "Transfer should not be processed");
    }

    // === MANUAL PROCESSING TESTS ===

    function test_ProcessDetectedTransfer() public {
        // Setup detection
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.prank(user1);
        tokenA.transfer(address(jar), 100 ether);
        
        jar.scanToken(address(tokenA));
        
        // Process the detected transfer
        uint256 expectedOut = 100 ether * SWAP_RATE * SWAP_RATE; // Two hops: tokenA->wNative->jarToken
        uint256 minOut = expectedOut - (expectedOut / 10); // 10% slippage
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        
        jar.processDetectedTransfer(0, minOut, new address[](0));
        
        // Check processing
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut, "Jar balance should increase");
        
        // Check transfer is marked as processed
        (,,,,bool processed,) = jar.detectedTransfers(0);
        assertTrue(processed, "Transfer should be marked as processed");
    }

    function test_ProcessAlreadyProcessedTransfer() public {
        // Setup and process transfer
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.prank(user1);
        tokenA.transfer(address(jar), 100 ether);
        
        jar.scanToken(address(tokenA));
        jar.processDetectedTransfer(0, 0, new address[](0));
        
        // Try to process again
        vm.expectRevert(CookieJarWithDetection.TransferAlreadyProcessed.selector);
        jar.processDetectedTransfer(0, 0, new address[](0));
    }

    function test_ProcessAllDetectedTransfers() public {
        // Setup multiple transfers
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.startPrank(user1);
        tokenA.transfer(address(jar), 50 ether);
        vm.stopPrank();
        
        vm.startPrank(user2);
        tokenA.transfer(address(jar), 75 ether);
        vm.stopPrank();
        
        // Scan to detect both
        jar.scanAllMonitoredTokens();
        
        // Process all
        uint256 expectedTotal = (50 + 75) * SWAP_RATE * SWAP_RATE; // Two hops each
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        
        jar.processAllDetectedTransfers(address(tokenA), 0, new address[](0));
        
        // Check all processed
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedTotal, "All transfers should be processed");
        
        CookieJarWithDetection.DetectedTransfer[] memory unprocessed = jar.getUnprocessedTransfersForToken(address(tokenA));
        assertEq(unprocessed.length, 0, "Should have no unprocessed transfers");
    }

    // === EMERGENCY RECOVERY TESTS ===

    function test_EmergencyRecover() public {
        // Direct transfer without monitoring
        vm.prank(user1);
        tokenA.transfer(address(jar), 100 ether);
        
        uint256 expectedOut = 100 ether * SWAP_RATE * SWAP_RATE; // Two hops
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        
        // Emergency recover should enable monitoring and process
        jar.emergencyRecover(address(tokenA), 0, 0, new address[](0));
        
        // Check recovery
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut, "Should recover and swap");
        assertTrue(jar.monitoredTokens(address(tokenA)), "Should enable monitoring");
    }

    function test_EmergencyRecoverPartialAmount() public {
        // Transfer 100, recover only 60
        vm.prank(user1);
        tokenA.transfer(address(jar), 100 ether);
        
        uint256 recoverAmount = 60 ether;
        uint256 expectedOut = recoverAmount * SWAP_RATE * SWAP_RATE; // Two hops
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        
        jar.emergencyRecover(address(tokenA), recoverAmount, 0, new address[](0));
        
        // Check partial recovery
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut, "Should recover partial amount");
        
        // Check remaining unaccounted balance
        uint256 remaining = jar.getUnaccountedBalance(address(tokenA));
        assertEq(remaining, 40 ether, "Should have remaining unaccounted balance");
    }

    // === MONITOR CONTRACT TESTS ===

    function test_BatchScanJars() public {
        // Setup second jar for batch testing
        CookieJarWithDetection jar2 = new CookieJarWithDetection(
            address(jarToken),
            false,
            address(router),
            address(weth),
            owner
        );
        
        // Enable monitoring on both jars
        jar.enableTokenMonitoring(address(tokenA));
        jar2.enableTokenMonitoring(address(tokenA));
        
        // Direct transfers to both jars
        vm.startPrank(user1);
        tokenA.transfer(address(jar), 100 ether);
        tokenA.transfer(address(jar2), 150 ether);
        vm.stopPrank();
        
        // Batch scan
        address[] memory jars = new address[](2);
        jars[0] = address(jar);
        jars[1] = address(jar2);
        
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);
        
        uint256[][] memory results = monitor.batchScanJars(jars, tokens);
        
        // Check results
        assertEq(results.length, 2, "Should have results for 2 jars");
        assertEq(results[0][0], 100 ether, "Jar 1 should detect 100 tokens");
        assertEq(results[1][0], 150 ether, "Jar 2 should detect 150 tokens");
    }

    function test_BatchHealthCheck() public {
        // Setup jar with unprocessed transfers
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.prank(user1);
        tokenA.transfer(address(jar), 100 ether);
        
        jar.scanToken(address(tokenA));
        
        // Health check should show unhealthy due to unprocessed transfers
        address[] memory jars = new address[](1);
        jars[0] = address(jar);
        
        bool[] memory health = monitor.batchHealthCheck(jars);
        assertFalse(health[0], "Jar should be unhealthy with unprocessed transfers");
        
        // Process transfers
        jar.processDetectedTransfer(0, 0, new address[](0));
        
        // Health check should now show healthy
        health = monitor.batchHealthCheck(jars);
        assertTrue(health[0], "Jar should be healthy after processing");
    }

    // === VIEW FUNCTION TESTS ===

    function test_GetJarStatistics() public {
        // Setup jar with various states
        jar.enableTokenMonitoring(address(tokenA));
        jar.enableTokenMonitoring(address(tokenB));
        
        vm.startPrank(user1);
        tokenA.transfer(address(jar), 100 ether);
        tokenB.transfer(address(jar), 200 ether);
        vm.stopPrank();
        
        jar.scanAllMonitoredTokens();
        
        // Get statistics
        (
            uint256 totalDetected,
            uint256 monitoredCount,
            address[] memory monitoredTokens,
            uint256[] memory unaccounted,
            uint256[] memory pending
        ) = monitor.getJarStatistics(address(jar));
        
        assertEq(totalDetected, 2, "Should have 2 detected transfers");
        assertEq(monitoredCount, 2, "Should have 2 monitored tokens");
        assertEq(monitoredTokens.length, 2, "Should return 2 monitored tokens");
    }

    function test_GetUnprocessedTransfers() public {
        // Setup multiple transfers, process some
        jar.enableTokenMonitoring(address(tokenA));
        
        vm.startPrank(user1);
        tokenA.transfer(address(jar), 50 ether);
        vm.stopPrank();
        
        vm.startPrank(user2);
        tokenA.transfer(address(jar), 75 ether);
        vm.stopPrank();
        
        jar.scanAllMonitoredTokens();
        
        // Process only the first transfer
        jar.processDetectedTransfer(0, 0, new address[](0));
        
        // Check unprocessed
        CookieJarWithDetection.DetectedTransfer[] memory unprocessed = jar.getUnprocessedTransfersForToken(address(tokenA));
        assertEq(unprocessed.length, 1, "Should have 1 unprocessed transfer");
        assertEq(unprocessed[0].amount, 75 ether, "Should be the second transfer");
    }

    // === INTEGRATION TESTS ===

    function test_FullWorkflow() public {
        // 1. Enable monitoring
        jar.enableTokenMonitoring(address(tokenA));
        
        // 2. Configure auto-processing for large amounts
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(jarToken);
        
        vm.prank(owner);
        jar.configureAutoProcessing(address(tokenA), true, 100 ether, 500, path);
        
        // 3. Small direct transfer (below auto-processing threshold)
        vm.prank(user1);
        tokenA.transfer(address(jar), 50 ether);
        
        jar.scanToken(address(tokenA));
        
        // Should be detected but not processed
        CookieJarWithDetection.DetectedTransfer[] memory unprocessed = jar.getUnprocessedTransfersForToken(address(tokenA));
        assertEq(unprocessed.length, 1, "Should have 1 unprocessed transfer");
        
        // 4. Large direct transfer (above threshold)
        vm.prank(user2);
        tokenA.transfer(address(jar), 150 ether);
        
        uint256 initialJarBalance = jarToken.balanceOf(address(jar));
        jar.scanToken(address(tokenA));
        
        // Large transfer should be auto-processed
        uint256 expectedOut = 150 ether * SWAP_RATE;
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut, "Large transfer should be auto-processed");
        
        // 5. Manually process the small transfer
        jar.processDetectedTransfer(0, 0, new address[](0));
        
        uint256 expectedSmallOut = 50 ether * SWAP_RATE;
        assertEq(jarToken.balanceOf(address(jar)), initialJarBalance + expectedOut + expectedSmallOut, "Both transfers processed");
        
        // 6. Final health check should be healthy
        address[] memory jars = new address[](1);
        jars[0] = address(jar);
        
        bool[] memory health = monitor.batchHealthCheck(jars);
        assertTrue(health[0], "Jar should be healthy");
    }
}