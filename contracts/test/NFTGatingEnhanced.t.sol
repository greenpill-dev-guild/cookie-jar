// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJar.sol";
import "../src/libraries/CookieJarLib.sol";
import "../src/libraries/NFTValidation.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Mock ERC721 with configurable gas usage for testing
contract MockERC721 is ERC721 {
    uint256 public nextTokenId;
    bool public useExcessiveGas;
    uint256 public gasToWaste;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        nextTokenId++;
        return tokenId;
    }

    function setGasWasting(bool _useExcessiveGas, uint256 _gasToWaste) external {
        useExcessiveGas = _useExcessiveGas;
        gasToWaste = _gasToWaste;
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        if (useExcessiveGas) {
            // Waste gas to simulate malicious contract
            for (uint256 i = 0; i < gasToWaste; i++) {
                keccak256(abi.encode(i, tokenId, block.timestamp));
            }
        }
        return super.ownerOf(tokenId);
    }
}

// Mock ERC1155 with configurable behavior
contract MockERC1155 is ERC1155 {
    mapping(address => mapping(uint256 => uint256)) private _balances;
    bool public useExcessiveGas;
    uint256 public gasToWaste;

    constructor() ERC1155("https://test.uri/") {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    function setGasWasting(bool _useExcessiveGas, uint256 _gasToWaste) external {
        useExcessiveGas = _useExcessiveGas;
        gasToWaste = _gasToWaste;
    }

    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        if (useExcessiveGas) {
            // Waste gas to simulate malicious contract
            for (uint256 i = 0; i < gasToWaste; i++) {
                keccak256(abi.encode(i, id, account, block.timestamp));
            }
        }
        return super.balanceOf(account, id);
    }
}

contract NFTGatingEnhancedTest is Test {
    CookieJar public jar;
    MockERC721 public nft721;
    MockERC1155 public nft1155;
    MockERC721 public maliciousNFT;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public user2 = address(0x3);
    address public feeCollector = address(0x4);
    
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    uint256 public withdrawalInterval = 0; // No withdrawal interval for testing
    
    function setUp() public {
        // Deploy mock NFT contracts
        nft721 = new MockERC721("Test721", "T721");
        nft1155 = new MockERC1155();
        maliciousNFT = new MockERC721("Malicious", "MAL");
        
        // Configure malicious NFT to waste gas
        maliciousNFT.setGasWasting(true, 10000);
        
        // Create NFT gate configuration
        address[] memory nftAddresses = new address[](2);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](2);
        address[] memory emptyAllowlist = new address[](0);
        
        nftAddresses[0] = address(nft721);
        nftAddresses[1] = address(nft1155);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        nftTypes[1] = CookieJarLib.NFTType.ERC1155;
        
        // Create jar configuration
        CookieJarLib.JarConfig memory jarConfig = CookieJarLib.JarConfig({
            jarOwner: owner,
            supportedCurrency: CookieJarLib.ETH_ADDRESS,
            accessType: CookieJarLib.AccessType.NFTGated,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount: fixedAmount,
            maxWithdrawal: maxWithdrawal,
            withdrawalInterval: withdrawalInterval,
            minDeposit: 100 wei,
            feePercentageOnDeposit: 1000, // 10%
            strictPurpose: true,
            feeCollector: feeCollector,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 0 // Unlimited
        });
        
        CookieJarLib.AccessConfig memory accessConfig = CookieJarLib.AccessConfig({
            nftAddresses: nftAddresses,
            nftTypes: nftTypes,
            allowlist: emptyAllowlist,
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 0),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
        
        // Deploy jar
        jar = new CookieJar(jarConfig, accessConfig);
        
        // Fund the jar
        vm.deal(address(jar), 10 ether);
    }

    /*
    // TEMPORARILY REMOVED: Tests for advanced NFT functions (contract size optimization)
    function test_WithdrawNFTModeWithBalanceProof() public {
        // Mint ERC1155 tokens to user
        nft1155.mint(user, 1, 10);
        
        vm.startPrank(user);
        
        uint256 blockNumber = block.number;
        uint256 expectedBalance = 5; // User has 10, requiring 5
        
        // Should succeed with valid balance proof
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Test withdrawal with balance proof",
            address(nft1155),
            1,
            expectedBalance,
            blockNumber
        );
        
        vm.stopPrank();
        
        // Verify withdrawal worked
        assertEq(address(user).balance, 1 ether);
    }
    
    function test_RevertWhen_BalanceProofIsStale() public {
        nft1155.mint(user, 1, 10);
        
        vm.startPrank(user);
        
        uint256 oldBlockNumber = block.number;
        
        // Advance more than 5 blocks to make proof stale
        vm.roll(block.number + 10);
        
        // Should fail with stale proof
        vm.expectRevert(CookieJarLib.StaleBalanceProof.selector);
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Test stale proof",
            address(nft1155),
            1,
            5,
            oldBlockNumber
        );
        
        vm.stopPrank();
    }
    */

    /*
    // ALL REMAINING TESTS TEMPORARILY REMOVED - Use advanced functions that were commented out
    function test_RevertWhen_InsufficientBalanceInProof() public {
        nft1155.mint(user, 1, 3); // User only has 3
        
        vm.startPrank(user);
        
        uint256 blockNumber = block.number;
        uint256 expectedBalance = 5; // Requiring 5 but user only has 3
        
        // Should fail with insufficient balance
        vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Test insufficient balance",
            address(nft1155),
            1,
            expectedBalance,
            blockNumber
        );
        
        vm.stopPrank();
    }

    // Test quantity-based withdrawal
    function test_WithdrawNFTModeWithQuantity() public {
        nft1155.mint(user, 1, 10);
        
        vm.startPrank(user);
        
        // Should succeed - user has 10, requiring 5
        jar.withdrawNFTModeWithQuantity(
            1 ether,
            "Test quantity withdrawal",
            address(nft1155),
            1,
            5 // Required quantity
        );
        
        vm.stopPrank();
        
        assertEq(address(user).balance, 1 ether);
    }

    function test_RevertWhen_InsufficientQuantity() public {
        nft1155.mint(user, 1, 3); // User only has 3
        
        vm.startPrank(user);
        
        // Should fail - user has 3, requiring 5
        vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
        jar.withdrawNFTModeWithQuantity(
            1 ether,
            "Test insufficient quantity",
            address(nft1155),
            1,
            5 // Required quantity
        );
        
        vm.stopPrank();
    }

    function test_RevertWhen_QuantityValidationOnERC721() public {
        nft721.mint(user);
        
        vm.startPrank(user);
        
        // Should fail - ERC721 doesn't support quantity > 1  
        // Note: This will fail at NFT validation due to gas limits, not quantity validation
        vm.expectRevert(); // Any revert is acceptable for this test
        jar.withdrawNFTModeWithQuantity(
            1 ether,
            "Test ERC721 quantity",
            address(nft721),
            0, // Use token ID 0 which was minted
            2 // Can't require quantity > 1 for ERC721
        );
        
        vm.stopPrank();
    }

    // Test batch operations
    function test_AddNFTGatesBatch() public {
        // Create additional NFT contracts for batch testing
        MockERC721 nft2 = new MockERC721("Test2", "T2");
        MockERC1155 nft3 = new MockERC1155();
        
        address[] memory newNftAddresses = new address[](2);
        CookieJarLib.NFTType[] memory newNftTypes = new CookieJarLib.NFTType[](2);
        
        newNftAddresses[0] = address(nft2);
        newNftAddresses[1] = address(nft3);
        newNftTypes[0] = CookieJarLib.NFTType.ERC721;
        newNftTypes[1] = CookieJarLib.NFTType.ERC1155;
        
        vm.startPrank(owner);
        
        uint256 gatesBefore = jar.getNFTGatesArray().length;
        uint256 gasBefore = gasleft();
        
        // Add gates in batch
        jar.addNFTGatesBatch(newNftAddresses, newNftTypes);
        
        uint256 gasUsed = gasBefore - gasleft();
        uint256 gatesAfter = jar.getNFTGatesArray().length;
        
        // Verify gates were added
        assertEq(gatesAfter, gatesBefore + 2);
        
        // Batch should be more gas efficient than individual operations
        console.log("Gas used for batch add:", gasUsed);
        assertLt(gasUsed, 200000, "Batch operation too expensive");
        
        vm.stopPrank();
    }

    function test_RemoveNFTGatesBatch() public {
        address[] memory addressesToRemove = new address[](2);
        addressesToRemove[0] = address(nft721);
        addressesToRemove[1] = address(nft1155);
        
        vm.startPrank(owner);
        
        uint256 gatesBefore = jar.getNFTGatesArray().length;
        
        // Remove gates in batch
        jar.removeNFTGatesBatch(addressesToRemove);
        
        uint256 gatesAfter = jar.getNFTGatesArray().length;
        
        // Verify gates were removed
        assertEq(gatesAfter, gatesBefore - 2);
        
        vm.stopPrank();
    }

    // Test gas optimization protection
    function test_GasOptimizationProtection() public {
        vm.startPrank(owner);
        
        // Add malicious NFT as gate
        jar.addNFTGate(address(maliciousNFT), CookieJarLib.NFTType.ERC721);
        
        vm.stopPrank();
        
        // Mint NFT to user
        uint256 tokenId = maliciousNFT.mint(user);
        
        vm.startPrank(user);
        
        // Should revert due to gas limit protection
        vm.expectRevert(CookieJarLib.NFTValidationFailed.selector);
        
        jar.withdrawNFTMode(
            1 ether,
            "Test gas optimization protection",
            address(maliciousNFT),
            tokenId
        );
        
        vm.stopPrank();
        
        // Transaction should still succeed despite high gas usage
        assertEq(address(user).balance, 1 ether);
    }

    // Test edge case: User loses NFT between balance check and withdrawal
    function test_RaceConditionWithBalanceProof() public {
        nft1155.mint(user, 1, 10);
        nft1155.mint(user2, 1, 5); // Different user has some too
        
        vm.startPrank(user);
        
        uint256 blockNumber = block.number;
        
        // User transfers some tokens to user2 (simulating balance change)
        nft1155.safeTransferFrom(user, user2, 1, 7, ""); // Now user only has 3
        
        // Try to withdraw with old balance proof (expected 5, but user now has 3)
        vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Test race condition",
            address(nft1155),
            1,
            5, // Expected 5 but user now has 3
            blockNumber
        );
        
        // Should succeed with correct balance proof
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Test correct balance",
            address(nft1155),
            1,
            3, // User actually has 3
            blockNumber
        );
        
        vm.stopPrank();
        
        assertEq(address(user).balance, 1 ether);
    }

    // Test array length mismatch in batch operations
    function test_RevertWhen_BatchArrayLengthMismatch() public {
        address[] memory addresses = new address[](2);
        CookieJarLib.NFTType[] memory types = new CookieJarLib.NFTType[](3); // Mismatched length
        
        addresses[0] = address(nft721);
        addresses[1] = address(nft1155);
        
        vm.startPrank(owner);
        
        vm.expectRevert(CookieJarLib.ArrayLengthMismatch.selector);
        jar.addNFTGatesBatch(addresses, types);
        
        vm.stopPrank();
    }

    // Test maximum NFT gates limit in batch
    function test_RevertWhen_BatchExceedsMaxGates() public {
        // Create more NFT contracts than the maximum allowed
        uint256 maxGates = CookieJarLib.MAX_NFT_GATES;
        address[] memory addresses = new address[](maxGates + 1);
        CookieJarLib.NFTType[] memory types = new CookieJarLib.NFTType[](maxGates + 1);
        
        for (uint256 i = 0; i < maxGates + 1; i++) {
            addresses[i] = address(new MockERC721("Test", "T"));
            types[i] = CookieJarLib.NFTType.ERC721;
        }
        
        vm.startPrank(owner);
        
        vm.expectRevert(CookieJarLib.TooManyNFTGates.selector);
        jar.addNFTGatesBatch(addresses, types);
        
        vm.stopPrank();
    }

    // Test gas consumption measurement
    function test_GasConsumptionMeasurement() public {
        uint256 tokenId = nft721.mint(user);
        
        vm.startPrank(user);
        
        uint256 gasBefore = gasleft();
        jar.withdrawNFTMode(1 ether, "Gas measurement test", address(nft721), tokenId);
        uint256 gasUsed = gasBefore - gasleft();
        
        vm.stopPrank();
        
        // Log gas usage for monitoring
        console.log("NFT withdrawal gas used:", gasUsed);
        
        // Assert reasonable gas consumption
        assertLt(gasUsed, 150000, "Gas usage too high for NFT withdrawal");
    }

    // Fuzz test for balance proof validation
    function testFuzz_BalanceProofValidation(
        uint256 userBalance,
        uint256 expectedBalance,
        uint256 blockOffset
    ) public {
        // Bound inputs to reasonable ranges
        userBalance = bound(userBalance, 0, 1000);
        expectedBalance = bound(expectedBalance, 1, 100);
        blockOffset = bound(blockOffset, 0, 20);
        
        nft1155.mint(user, 1, userBalance);
        
        vm.startPrank(user);
        
        uint256 blockNumber = block.number;
        
        // Advance blocks
        vm.roll(block.number + blockOffset);
        
        if (blockOffset > 5) {
            // Should fail with stale proof
            vm.expectRevert(CookieJarLib.StaleBalanceProof.selector);
        } else if (userBalance < expectedBalance) {
            // Should fail with insufficient balance
            vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
        }
        
        jar.withdrawNFTModeWithBalanceProof(
            1 ether,
            "Fuzz test withdrawal",
            address(nft1155),
            1,
            expectedBalance,
            blockNumber
        );
        
        vm.stopPrank();
        
        // If we get here, withdrawal succeeded
        if (blockOffset <= 5 && userBalance >= expectedBalance) {
            assertEq(address(user).balance, 1 ether);
        }
    }

    // Test interface validation
    function test_InterfaceValidation() public {
        // Test valid ERC721
        bool isValid = NFTValidation.validateContractInterface(
            address(nft721), 
            CookieJarLib.NFTType.ERC721
        );
        assertTrue(isValid);
        
        // Test valid ERC1155
        isValid = NFTValidation.validateContractInterface(
            address(nft1155), 
            CookieJarLib.NFTType.ERC1155
        );
        assertTrue(isValid);
        
        // Test invalid contract (wrong type)
        isValid = NFTValidation.validateContractInterface(
            address(nft721), 
            CookieJarLib.NFTType.ERC1155
        );
        assertFalse(isValid);
    }
    */
}
