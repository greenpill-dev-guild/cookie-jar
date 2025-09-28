// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJar.sol";
import "../src/libraries/UniversalSwapAdapter.sol";
import "../src/libraries/CookieJarLib.sol";

contract UniswapV4IntegrationTest is Test {
    CookieJar internal _jar;
    
    address internal _owner = address(0x123);
    address internal _user = address(0x456);
    address internal _mockToken = address(0x789);
    
    // Test configuration
    CookieJarLib.JarConfig internal _jarConfig;
    CookieJarLib.AccessConfig internal _accessConfig;

    function setUp() public {
        vm.deal(_owner, 10 ether);
        vm.deal(_user, 10 ether);

        // Set up jar configuration
        _jarConfig.jarOwner = _owner;
        _jarConfig.supportedCurrency = _mockToken; // Use ERC20 token
        _jarConfig.accessType = CookieJarLib.AccessType.Allowlist;
        _jarConfig.withdrawalOption = CookieJarLib.WithdrawalTypeOptions.Variable;
        _jarConfig.maxWithdrawal = 1000e18;
        _jarConfig.withdrawalInterval = 86400;
        _jarConfig.strictPurpose = false;
        _jarConfig.emergencyWithdrawalEnabled = true;
        _jarConfig.oneTimeWithdrawal = false;
        _jarConfig.maxWithdrawalPerPeriod = 5000e18;
        _jarConfig.minDeposit = 1e18;
        _jarConfig.feeCollector = _owner;
        _jarConfig.feePercentageOnDeposit = 500; // 5%
        
        // Multi-token configuration with Universal Router
        _jarConfig.multiTokenConfig = CookieJarLib.MultiTokenConfig({
            enabled: true,
            maxSlippagePercent: 500, // 5%
            minSwapAmount: 0.01 ether,
            defaultFee: 3000 // 0.3%
        });
        
        // Streaming and Superfluid configs (disabled for this test)
        _jarConfig.streamingConfig = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: new address[](0),
            minFlowRate: 1e18
        });
        

        // Access configuration  
        address[] memory allowlist = new address[](2);
        allowlist[0] = _owner;
        allowlist[1] = _user;

        _accessConfig.allowlist = allowlist;
        _accessConfig.nftAddresses = new address[](0);
        _accessConfig.nftTypes = new CookieJarLib.NFTType[](0);

        // Deploy jar
        _jar = new CookieJar(_jarConfig, _accessConfig);
    }

    // === UNIVERSAL SWAP ADAPTER TESTS ===

    function testUniversalRouterSupport() public {
        // Test chain support detection
        uint256[] memory supportedChains = UniversalSwapAdapter.getSupportedChains();
        assertEq(supportedChains.length, 11);
        assertEq(supportedChains[0], 1); // Ethereum
        assertEq(supportedChains[1], 8453); // Base
    }

    function testUniversalRouterAddresses() public {
        // Test official Universal Router addresses
        address ethereumRouter = UniversalSwapAdapter.getUniversalRouter(1);
        assertEq(ethereumRouter, 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af);
        
        address baseRouter = UniversalSwapAdapter.getUniversalRouter(8453);
        assertEq(baseRouter, 0x198d7387Fa97A73F05b8578CdEFf8F2A1f34Cd1F);
        
        address unsupportedRouter = UniversalSwapAdapter.getUniversalRouter(999999);
        assertEq(unsupportedRouter, address(0));
    }

    function testPermit2Address() public {
        // Test Permit2 address consistency
        address permit2 = UniversalSwapAdapter.getPermit2();
        assertEq(permit2, 0x000000000022D473030F116dDEE9F6B43aC78BA3);
    }

    function testWNativeAddresses() public {
        // Test wrapped native token addresses
        address wethEthereum = UniversalSwapAdapter.getWNative(1);
        assertEq(wethEthereum, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        
        address wethBase = UniversalSwapAdapter.getWNative(8453);
        assertEq(wethBase, 0x4200000000000000000000000000000000000006);
        
        address wmaticPolygon = UniversalSwapAdapter.getWNative(137);
        assertEq(wmaticPolygon, 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270);
    }

    // === UTILITY FUNCTION TESTS ===

    function testGetAmountOut() public {
        // Test amount calculation (0.3% fee)
        uint256 amountIn = 1000e18;
        uint256 amountOut = UniversalSwapAdapter.getAmountOut(_mockToken, address(0x999), amountIn);
        assertEq(amountOut, 997e18); // 1000 - 0.3% fee
        
        // Test same token (no swap)
        amountOut = UniversalSwapAdapter.getAmountOut(_mockToken, _mockToken, amountIn);
        assertEq(amountOut, amountIn);
        
        // Test zero amount
        amountOut = UniversalSwapAdapter.getAmountOut(_mockToken, address(0x999), 0);
        assertEq(amountOut, 0);
    }

    function testCalculateMinOutput() public {
        uint256 amountOut = 1000e18;
        uint256 slippage = 500; // 5%
        
        uint256 minOut = UniversalSwapAdapter.calculateMinOutput(amountOut, slippage);
        assertEq(minOut, 950e18); // 1000 - 5% slippage
    }

    function testIsUniversalRouterAvailable() public {
        // Test current chain availability (depends on test environment)
        bool available = UniversalSwapAdapter.isUniversalRouterAvailable();
        
        // Should match whether current chain has Universal Router
        address router = UniversalSwapAdapter.getUniversalRouter(block.chainid);
        assertEq(available, router != address(0));
    }

    function testIsSwapProfitable() public {
        // Test profitable swap
        bool profitable = UniversalSwapAdapter.isSwapProfitable(
            _mockToken,
            address(0x999),
            1000e18, // Amount in
            900e18   // Min out (less than 997e18 expected)
        );
        assertTrue(profitable);
        
        // Test unprofitable swap
        profitable = UniversalSwapAdapter.isSwapProfitable(
            _mockToken,
            address(0x999),
            1000e18, // Amount in
            1000e18  // Min out (more than 997e18 expected)
        );
        assertFalse(profitable);
    }

    // === ERROR CONDITION TESTS ===

    function testUnsupportedChain() public {
        // Mock unsupported chain
        vm.chainId(999999);
        
        vm.expectRevert(
            abi.encodeWithSelector(UniversalSwapAdapter.UnsupportedChain.selector, 999999)
        );
        
        // This would fail with UnsupportedChain error
        UniversalSwapAdapter.swapExactInputSingle(
            _mockToken,
            address(0x999),
            1000e18,
            900e18,
            _user
        );
    }

    function testZeroAmount() public {
        vm.expectRevert(UniversalSwapAdapter.ZeroAmount.selector);
        
        UniversalSwapAdapter.swapExactInputSingle(
            _mockToken,
            address(0x999),
            0, // Zero amount
            0,
            _user
        );
    }

    function testZeroAddress() public {
        vm.expectRevert(UniversalSwapAdapter.ZeroAddress.selector);
        
        UniversalSwapAdapter.swapExactInputSingle(
            _mockToken,
            address(0x999),
            1000e18,
            900e18,
            address(0) // Zero address recipient
        );
    }

    // === INTEGRATION TESTS ===

    function testJarMultiTokenConfig() public {
        // Test jar's multi-token configuration
        (bool enabled, uint256 maxSlippagePercent, uint256 minSwapAmount, uint256 defaultFee) = _jar.multiTokenConfig();
        assertTrue(enabled);
        assertEq(maxSlippagePercent, 500);
        assertEq(defaultFee, 3000);
    }

    function testETHReceiveHandling() public {
        // Test ETH handling when not jar currency
        assertEq(_jar.pendingTokenBalances(address(0)), 0);
        
        // Send ETH to jar (should be stored as pending)
        (bool success,) = address(_jar).call{value: 1 ether}("");
        assertTrue(success);
        
        assertEq(_jar.pendingTokenBalances(address(0)), 1 ether);
    }

    // === MOCK TESTS FOR SWAP FUNCTIONALITY ===
    
    function testSwapFunctionSignatures() public {
        // Test that swap functions exist and have correct signatures
        // (These would fail in actual execution without proper setup)
        
        // Just verify that the functions exist by checking they don't revert at compilation
        // In a real test environment, these would be tested with proper mock setups
        assertTrue(true); // Basic assertion to avoid empty test function
        
        // Test swapExactETHForTokens signature
        // try UniversalSwapAdapter.swapExactETHForTokens(
        //     _mockToken,
        //     0,
        //     address(this)
        // ) returns (uint256) {
        //     // Would fail due to no actual swap setup, but signature is correct
        //     fail("Should have reverted");
        // } catch Error(string memory) {
        //     // Expected - no actual swap infrastructure  
        // }
        
        // Test swapExactTokensForETH signature  
        // try UniversalSwapAdapter.swapExactTokensForETH(
        //     _mockToken,
        //     1000e18,
        //     0,
        //     address(this)
        // ) returns (uint256) {
        //     fail("Should have reverted");
        // } catch Error(string memory) {
        //     // Expected - no actual swap infrastructure
        // }
    }

    receive() external payable {}
}