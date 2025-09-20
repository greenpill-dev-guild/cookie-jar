// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/streaming/SimpleContinuousStreamJar.sol";
import "../src/tokens/TestERC20.sol";
import "./mocks/MockWETH.sol";
import "./mocks/MockUniswapV2Router.sol";

/// @title SimpleStreamingCookieJar Test Suite
/// @notice Tests for continuous streaming functionality
contract SimpleStreamingCookieJarTest is Test {
    
    // === CONTRACTS ===
    SimpleContinuousStreamJar streamJar;
    TestERC20 jarToken;
    TestERC20 streamToken;
    MockWETH weth;
    MockUniswapV2Router router;

    // === ACCOUNTS ===
    address owner = makeAddr("owner");
    address streamer1 = makeAddr("streamer1");
    address streamer2 = makeAddr("streamer2");
    address employee = makeAddr("employee");
    address company = makeAddr("company");

    // === CONSTANTS ===
    uint256 constant INITIAL_BALANCE = 10000 ether;
    uint256 constant SWAP_RATE = 2; // 1 input = 2 output tokens
    uint256 constant RATE_PER_SECOND = 1e18; // 1 token per second

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock contracts
        weth = new MockWETH();
        router = new MockUniswapV2Router(address(weth));
        
        // Deploy test tokens
        jarToken = new TestERC20("JarToken", "JAR", 18);
        streamToken = new TestERC20("StreamToken", "STR", 18);

        // Deploy streaming jar
        streamJar = new SimpleContinuousStreamJar(
            address(jarToken),
            false,
            address(router),
            address(weth),
            owner
        );

        // Setup router rates
        router.addPair(address(streamToken), address(jarToken), SWAP_RATE * 1e18);
        router.addPair(address(streamToken), address(weth), SWAP_RATE * 1e18);

        // Mint tokens
        jarToken.mint(address(router), INITIAL_BALANCE);
        streamToken.mint(streamer1, INITIAL_BALANCE);
        streamToken.mint(streamer2, INITIAL_BALANCE);
        streamToken.mint(company, INITIAL_BALANCE);

        vm.stopPrank();
    }

    // === BASIC STREAMING TESTS ===

    function test_CreateBasicStream() public {
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(
            address(streamToken),
            RATE_PER_SECOND,
            30 days,
            true,  // autoSwap
            0      // minOut
        );

        // Check stream was created
        SimpleContinuousStreamJar.Stream memory stream = streamJar.getStream(streamId);

        assertEq(stream.sender, streamer1, "Sender should be streamer1");
        assertEq(stream.token, address(streamToken), "Token should be streamToken");
        assertEq(stream.ratePerSecond, RATE_PER_SECOND, "Rate should match");
        assertTrue(stream.isActive, "Stream should be active");
        assertTrue(stream.autoSwap, "Auto-swap should be enabled");
        assertEq(stream.startTime, block.timestamp, "Start time should be current");
        assertEq(stream.stopTime, block.timestamp + 30 days, "Stop time should be start + duration");
    }

    function test_FundStream() public {
        // Create stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(
            address(streamToken),
            RATE_PER_SECOND,
            30 days,
            true,
            0
        );

        // Fund stream
        uint256 fundAmount = 100 ether;
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), fundAmount);
        streamJar.fundStream(streamId, fundAmount);
        vm.stopPrank();

        // Check stream balance
        uint256 streamBalance = streamJar.streamBalances(streamId);
        assertEq(streamBalance, fundAmount, "Stream balance should equal funding");
    }

    function test_ClaimStreamBasic() public {
        // Setup funded stream
        vm.startPrank(streamer1);
        uint256 streamId = streamJar.createStream(
            address(streamToken),
            RATE_PER_SECOND,
            30 days,
            true,
            0
        );

        uint256 fundAmount = 100 ether;
        streamToken.approve(address(streamJar), fundAmount);
        streamJar.fundStream(streamId, fundAmount);
        vm.stopPrank();

        // Wait 10 seconds
        vm.warp(block.timestamp + 10);

        // Check claimable amount
        uint256 claimable = streamJar.getClaimableAmount(streamId);
        uint256 expected = 10 * RATE_PER_SECOND; // 10 seconds worth
        assertEq(claimable, expected, "Should be able to claim 10 seconds worth");

        // Claim stream
        uint256 initialJarBalance = jarToken.balanceOf(address(streamJar));
        (uint256 claimed, uint256 jarTokensReceived) = streamJar.claimStream(streamId);

        assertEq(claimed, expected, "Should claim expected amount");
        
        // Check jar tokens received (after swap)
        uint256 expectedJarTokens = claimed * SWAP_RATE;
        assertEq(jarTokensReceived, expectedJarTokens, "Should receive swapped jar tokens");
        assertEq(jarToken.balanceOf(address(streamJar)), initialJarBalance + expectedJarTokens, "Jar balance should increase");
    }

    // === REAL-WORLD SCENARIOS ===

    function test_SalaryStreamingScenario() public {
        // Company sets up $5000/month salary stream for employee
        uint256 monthlyAmount = 5000 ether;
        uint256 salaryRate = monthlyAmount / (30 * 24 * 60 * 60); // Per second

        vm.prank(company);
        uint256 salaryStream = streamJar.createStream(
            address(streamToken),
            salaryRate,
            30 days,
            true, // Auto-swap to stable jar token
            0
        );

        // Company funds 3 months of salary
        uint256 fundingAmount = monthlyAmount * 3;
        vm.startPrank(company);
        streamToken.approve(address(streamJar), fundingAmount);
        streamJar.fundStream(salaryStream, fundingAmount);
        vm.stopPrank();

        // Employee can claim earned salary any time
        // After 1 week (7 days)
        vm.warp(block.timestamp + 7 days);
        
        uint256 weeklyAmount = salaryRate * 7 days;
        uint256 claimable = streamJar.getClaimableAmount(salaryStream);
        
        assertEq(claimable, weeklyAmount, "Should be able to claim 1 week of salary");

        // Employee claims weekly salary
        (uint256 claimed, uint256 jarTokensReceived) = streamJar.claimStream(salaryStream);
        
        assertEq(claimed, weeklyAmount, "Should claim weekly amount");
        assertTrue(jarTokensReceived > 0, "Should receive jar tokens");

        // After 2 more weeks (total 3 weeks)
        vm.warp(block.timestamp + 14 days);
        
        uint256 additionalClaimable = streamJar.getClaimableAmount(salaryStream);
        uint256 expectedAdditional = salaryRate * 14 days;
        
        assertEq(additionalClaimable, expectedAdditional, "Should be able to claim 2 more weeks");
    }

    function test_DCAStreamingScenario() public {
        // User sets up $1000/month DCA stream
        uint256 monthlyDCA = 1000 ether;
        uint256 dcaRate = monthlyDCA / (30 * 24 * 60 * 60);

        vm.prank(streamer1);
        uint256 dcaStream = streamJar.createStream(
            address(streamToken),
            dcaRate,
            0, // Indefinite duration
            true, // Auto-swap for DCA
            0
        );

        // Fund 6 months of DCA
        uint256 fundingAmount = monthlyDCA * 6;
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), fundingAmount);
        streamJar.fundStream(dcaStream, fundingAmount);
        vm.stopPrank();

        uint256 initialJarBalance = jarToken.balanceOf(address(streamJar));
        
        // Simulate claiming every week for 4 weeks (1 month total)
        for (uint256 week = 1; week <= 4; week++) {
            vm.warp(block.timestamp + 7 days);
            streamJar.claimStream(dcaStream);
        }

        // After 4 weeks, should have ~1 month worth of DCA
        uint256 expectedMonthlyJarTokens = monthlyDCA * SWAP_RATE;
        uint256 actualJarTokens = jarToken.balanceOf(address(streamJar)) - initialJarBalance;
        
        // Allow for small timing differences
        assertApproxEqRel(actualJarTokens, expectedMonthlyJarTokens, 0.01e18, "Should have ~1 month of DCA");
    }

    function test_MultipleStreamsDifferentRates() public {
        // Create streams with different rates
        uint256 slowRate = RATE_PER_SECOND / 2;     // 0.5 tokens/second
        uint256 fastRate = RATE_PER_SECOND * 3;     // 3 tokens/second

        vm.prank(streamer1);
        uint256 slowStream = streamJar.createStream(address(streamToken), slowRate, 30 days, true, 0);
        
        vm.prank(streamer2);
        uint256 fastStream = streamJar.createStream(address(streamToken), fastRate, 30 days, true, 0);

        // Fund both streams
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), 1000 ether);
        streamJar.fundStream(slowStream, 500 ether);
        vm.stopPrank();

        vm.startPrank(streamer2);
        streamToken.approve(address(streamJar), 1000 ether);
        streamJar.fundStream(fastStream, 500 ether);
        vm.stopPrank();

        // Wait 60 seconds
        vm.warp(block.timestamp + 60);

        // Check claimable amounts
        uint256 slowClaimable = streamJar.getClaimableAmount(slowStream);
        uint256 fastClaimable = streamJar.getClaimableAmount(fastStream);

        assertEq(slowClaimable, 60 * slowRate, "Slow stream should have 60 * 0.5 = 30 tokens");
        assertEq(fastClaimable, 60 * fastRate, "Fast stream should have 60 * 3 = 180 tokens");

        // Claim both
        uint256 initialJarBalance = jarToken.balanceOf(address(streamJar));
        
        (uint256 slowClaimed,) = streamJar.claimStream(slowStream);
        (uint256 fastClaimed,) = streamJar.claimStream(fastStream);

        assertEq(slowClaimed, slowClaimable, "Should claim slow amount");
        assertEq(fastClaimed, fastClaimable, "Should claim fast amount");

        // Check total jar tokens
        uint256 totalClaimed = slowClaimed + fastClaimed;
        uint256 expectedJarTokens = totalClaimed * SWAP_RATE;
        assertEq(jarToken.balanceOf(address(streamJar)), initialJarBalance + expectedJarTokens, "Should receive total jar tokens");
    }

    function test_StreamExpiration() public {
        // Create 1-hour stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(
            address(streamToken),
            RATE_PER_SECOND,
            1 hours,
            true,
            0
        );

        // Fund stream
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), 100 ether);
        streamJar.fundStream(streamId, 100 ether);
        vm.stopPrank();

        // Wait past expiration (2 hours)
        vm.warp(block.timestamp + 2 hours);

        // Should only be able to claim 1 hour worth
        uint256 claimable = streamJar.getClaimableAmount(streamId);
        uint256 expectedMaxClaimable = 1 hours * RATE_PER_SECOND;
        
        assertEq(claimable, expectedMaxClaimable, "Should only claim up to stream duration");

        // Claim should deactivate stream
        (uint256 claimed,) = streamJar.claimStream(streamId);
        
        SimpleContinuousStreamJar.Stream memory stream = streamJar.getStream(streamId);
        assertFalse(stream.isActive, "Stream should be inactive after expiration");
    }

    function test_StopStreamWithRefund() public {
        // Create and fund stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);

        uint256 fundAmount = 100 ether;
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), fundAmount);
        streamJar.fundStream(streamId, fundAmount);
        vm.stopPrank();

        // Wait 10 seconds then stop
        vm.warp(block.timestamp + 10);

        uint256 initialBalance = streamToken.balanceOf(streamer1);
        vm.prank(streamer1);
        streamJar.stopStream(streamId);

        // Check refund (should get back unstreamed amount)
        uint256 streamedAmount = 10 * RATE_PER_SECOND;
        uint256 expectedRefund = fundAmount - streamedAmount;
        
        assertEq(streamToken.balanceOf(streamer1), initialBalance + expectedRefund, "Should receive refund");

        // Check stream is stopped
        SimpleContinuousStreamJar.Stream memory stream = streamJar.getStream(streamId);
        assertFalse(stream.isActive, "Stream should be stopped");
    }

    // === VIEW FUNCTION TESTS ===

    function test_GetActiveStreams() public {
        // Create multiple streams
        vm.startPrank(streamer1);
        uint256 stream1 = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);
        uint256 stream2 = streamJar.createStream(address(jarToken), RATE_PER_SECOND, 15 days, false, 0); // Different token
        vm.stopPrank();

        // Check active streams
        uint256[] memory activeStreams = streamJar.getActiveStreams(streamer1);
        assertEq(activeStreams.length, 2, "Should have 2 active streams");
        assertEq(activeStreams[0], stream1, "Should include stream1");
        assertEq(activeStreams[1], stream2, "Should include stream2");

        // Stop one stream
        vm.prank(streamer1);
        streamJar.stopStream(stream1);

        // Should now have only 1 active stream
        activeStreams = streamJar.getActiveStreams(streamer1);
        assertEq(activeStreams.length, 1, "Should have 1 active stream");
        assertEq(activeStreams[0], stream2, "Should only include stream2");
    }

    function test_GetStreamStats() public {
        // Create multiple streams with different rates
        vm.startPrank(streamer1);
        uint256 stream1 = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);
        uint256 stream2 = streamJar.createStream(address(jarToken), RATE_PER_SECOND * 2, 15 days, false, 0);
        vm.stopPrank();

        // Fund streams
        vm.startPrank(streamer1);
        streamToken.approve(address(streamJar), 200 ether);
        jarToken.approve(address(streamJar), 200 ether);
        streamJar.fundStream(stream1, 100 ether);
        streamJar.fundStream(stream2, 150 ether);
        vm.stopPrank();

        // Get stats
        (
            uint256 activeStreams,
            uint256 totalValueLocked,
            uint256 totalStreamRate
        ) = streamJar.getSenderStreamStats(streamer1);

        assertEq(activeStreams, 2, "Should have 2 active streams");
        assertEq(totalValueLocked, 250 ether, "Should have 250 total locked");
        assertEq(totalStreamRate, RATE_PER_SECOND * 3, "Should have combined rate of 3 tokens/second");
    }

    // === ERROR CONDITION TESTS ===

    function test_CannotCreateDuplicateStream() public {
        // Create first stream
        vm.prank(streamer1);
        streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);

        // Try to create duplicate
        vm.prank(streamer1);
        vm.expectRevert("Stream already exists");
        streamJar.createStream(address(streamToken), RATE_PER_SECOND * 2, 15 days, true, 0);
    }

    function test_CannotClaimWithoutFunding() public {
        // Create unfunded stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);

        // Wait some time
        vm.warp(block.timestamp + 10);

        // Try to claim without funding
        vm.expectRevert("Nothing to claim");
        streamJar.claimStream(streamId);
    }

    function test_OnlyOwnerCanStopStream() public {
        // Create stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 30 days, true, 0);

        // Non-owner cannot stop
        vm.prank(streamer2);
        vm.expectRevert("Not stream owner");
        streamJar.stopStream(streamId);

        // Owner can stop
        vm.prank(streamer1);
        streamJar.stopStream(streamId);
        
        SimpleContinuousStreamJar.Stream memory stream = streamJar.getStream(streamId);
        assertFalse(stream.isActive, "Stream should be stopped");
    }

    // === UTILITY FUNCTION TESTS ===

    function test_CalculateStreamFunding() public {
        uint256 rate = RATE_PER_SECOND;
        uint256 duration = 30 days;
        
        uint256 totalFunding = streamJar.calculateStreamFunding(rate, duration);
        uint256 expected = rate * duration;
        
        assertEq(totalFunding, expected, "Should calculate correct total funding");
    }

    function test_GetRemainingTime() public {
        // Create 1-hour stream
        vm.prank(streamer1);
        uint256 streamId = streamJar.createStream(address(streamToken), RATE_PER_SECOND, 1 hours, true, 0);

        // Check remaining time initially
        uint256 remainingTime = streamJar.getStreamRemainingTime(streamId);
        assertEq(remainingTime, 1 hours, "Should have full hour remaining");

        // Wait 30 minutes
        vm.warp(block.timestamp + 30 minutes);
        
        remainingTime = streamJar.getStreamRemainingTime(streamId);
        assertEq(remainingTime, 30 minutes, "Should have 30 minutes remaining");

        // Wait past expiration
        vm.warp(block.timestamp + 1 hours);
        
        remainingTime = streamJar.getStreamRemainingTime(streamId);
        assertEq(remainingTime, 0, "Should have 0 time remaining");
    }
}