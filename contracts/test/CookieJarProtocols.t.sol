// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJar.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock contracts for protocol testing
contract MockPOAP {
    mapping(uint256 => address) public owners;
    
    function setOwner(uint256 tokenId, address owner) external {
        owners[tokenId] = owner;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "POAP: token does not exist");
        return owner;
    }
    
    function tokenDetailsOfOwnerByEvent(address owner, uint256 eventId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        // Simple mock implementation - in reality this would check event ownership
        uint256[] memory tokens = new uint256[](1);
        tokens[0] = eventId * 1000 + uint256(uint160(owner)) % 1000;
        return tokens;
    }
}

contract MockPublicLock {
    mapping(address => bool) public hasValidKey;
    
    function setHasValidKey(address user, bool valid) external {
        hasValidKey[user] = valid;
    }
    
    function getHasValidKey(address user) external view returns (bool) {
        return hasValidKey[user];
    }
}

contract MockHypercertToken {
    mapping(address => mapping(uint256 => uint256)) public balances;
    
    function setBalance(address user, uint256 tokenId, uint256 balance) external {
        balances[user][tokenId] = balance;
    }
    
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return balances[account][id];
    }
}

contract MockHats {
    mapping(address => mapping(uint256 => bool)) public wearerStatus;
    
    function setWearerStatus(address user, uint256 hatId, bool status) external {
        wearerStatus[user][hatId] = status;
    }
    
    function isWearerOfHat(address user, uint256 hatId) external view returns (bool) {
        return wearerStatus[user][hatId];
    }
}

contract DummyERC20 is ERC20 {
    constructor() ERC20("Dummy", "DUM") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract CookieJarProtocolsTest is Test {
    CookieJar public jarPOAP;
    CookieJar public jarUnlock;
    CookieJar public jarHypercert;
    CookieJar public jarHats;
    
    address public owner = address(0xABCD);
    address public user = address(0xBEEF);
    address public user2 = address(0xC0DE);
    
    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;
    
    DummyERC20 public dummyToken;
    MockPOAP public mockPOAP;
    MockPublicLock public mockUnlock;
    MockHypercertToken public mockHypercert;
    MockHats public mockHats;
    
    address[] public emptyAddresses;
    CookieJarLib.NFTType[] public emptyTypes;
    address[] public emptyWhitelist;
    string public purpose = "Withdrawal for a legitimate purpose!";
    string public shortPurpose = "Too short";
    
    uint256 public minETHDeposit = 100 wei;
    uint256 public minERC20Deposit = 100;
    uint256 public feePercentageOnDeposit = 1000;
    address public feeCollector = address(0xFEE);
    
    // Protocol-specific test data
    uint256 public testEventId = 12345;
    uint256 public testTokenId = 67890;
    uint256 public testHatId = 999;
    uint256 public testMinBalance = 1000;

    // Helper function to create JarConfig struct
    function createJarConfig(
        address _jarOwner,
        address _supportedCurrency,
        CookieJarLib.AccessType _accessType,
        CookieJarLib.WithdrawalTypeOptions _withdrawalOption,
        uint256 _fixedAmount,
        uint256 _maxWithdrawal,
        uint256 _withdrawalInterval,
        uint256 _minDeposit,
        uint256 _feePercentage,
        bool _strictPurpose,
        address _feeCollectorAddr,
        bool _emergencyEnabled,
        bool _oneTimeWithdrawal
    ) internal pure returns (CookieJarLib.JarConfig memory) {
        return
            CookieJarLib.JarConfig({
                jarOwner: _jarOwner,
                supportedCurrency: _supportedCurrency,
                accessType: _accessType,
                withdrawalOption: _withdrawalOption,
                fixedAmount: _fixedAmount,
                maxWithdrawal: _maxWithdrawal,
                withdrawalInterval: _withdrawalInterval,
                minDeposit: _minDeposit,
                feePercentageOnDeposit: _feePercentage,
                strictPurpose: _strictPurpose,
                feeCollector: _feeCollectorAddr,
                emergencyWithdrawalEnabled: _emergencyEnabled,
                oneTimeWithdrawal: _oneTimeWithdrawal
            });
    }

    // Helper function to create AccessConfig struct with protocol requirements
    function createAccessConfigWithProtocols(
        CookieJarLib.POAPRequirement memory _poapReq,
        CookieJarLib.UnlockRequirement memory _unlockReq,
        CookieJarLib.HypercertRequirement memory _hypercertReq,
        CookieJarLib.HatsRequirement memory _hatsReq
    ) internal view returns (CookieJarLib.AccessConfig memory) {
        return CookieJarLib.AccessConfig({
            nftAddresses: emptyAddresses,
            nftTypes: emptyTypes,
            whitelist: emptyWhitelist,
            poapReq: _poapReq,
            unlockReq: _unlockReq,
            hypercertReq: _hypercertReq,
            hatsReq: _hatsReq
        });
    }

    function setUp() public {
        dummyToken = new DummyERC20();
        mockPOAP = new MockPOAP();
        mockUnlock = new MockPublicLock();
        mockHypercert = new MockHypercertToken();
        mockHats = new MockHats();
        
        emptyAddresses = new address[](0);
        emptyTypes = new CookieJarLib.NFTType[](0);
        emptyWhitelist = new address[](0);

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        // Create POAP jar
        jarPOAP = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.POAP,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfigWithProtocols(
                CookieJarLib.POAPRequirement({eventId: testEventId, poapContract: address(mockPOAP)}),
                CookieJarLib.UnlockRequirement({lockAddress: address(0)}),
                CookieJarLib.HypercertRequirement({tokenContract: address(0), tokenId: 0, minBalance: 0}),
                CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
            )
        );

        // Create Unlock jar
        jarUnlock = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Unlock,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfigWithProtocols(
                CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
                CookieJarLib.UnlockRequirement({lockAddress: address(mockUnlock)}),
                CookieJarLib.HypercertRequirement({tokenContract: address(0), tokenId: 0, minBalance: 0}),
                CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
            )
        );

        // Create Hypercert jar
        jarHypercert = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Hypercert,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfigWithProtocols(
                CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
                CookieJarLib.UnlockRequirement({lockAddress: address(0)}),
                CookieJarLib.HypercertRequirement({tokenContract: address(mockHypercert), tokenId: testTokenId, minBalance: testMinBalance}),
                CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
            )
        );

        // Create Hats jar
        jarHats = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Hats,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfigWithProtocols(
                CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
                CookieJarLib.UnlockRequirement({lockAddress: address(0)}),
                CookieJarLib.HypercertRequirement({tokenContract: address(0), tokenId: 0, minBalance: 0}),
                CookieJarLib.HatsRequirement({hatId: testHatId, hatsContract: address(mockHats)})
            )
        );

        // Fund the jars
        jarPOAP.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarUnlock), 1000 * 1e18);
        jarUnlock.depositCurrency(1000 * 1e18);
        jarHypercert.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarHats), 1000 * 1e18);
        jarHats.depositCurrency(1000 * 1e18);

        vm.stopPrank();
    }

    // ==== POAP Access Tests ====

    function test_ConstructorPOAPAccess() public {
        assertTrue(jarPOAP.accessType() == CookieJarLib.AccessType.POAP);
        (uint256 eventId, address poapContract) = jarPOAP.poapRequirement();
        assertEq(eventId, testEventId);
        assertEq(poapContract, address(mockPOAP));
    }

    function test_WithdrawPOAPMode() public {
        // Setup user with POAP - user owns token ID 12345001
        uint256 poapTokenId = 12345001;
        mockPOAP.setOwner(poapTokenId, user);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarPOAP).balance;
        uint256 currencyHeldByJarBefore = jarPOAP.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        
        vm.prank(user);
        jarPOAP.withdrawPOAPMode(fixedAmount, purpose, poapTokenId);
        
        assertEq(address(jarPOAP).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarPOAP.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        assertEq(jarPOAP.lastWithdrawalPOAP(poapTokenId), block.timestamp);
    }

    function test_RevertWhen_WithdrawPOAPModeInvalidAccessType() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarUnlock.withdrawPOAPMode(fixedAmount, purpose, 12345);
    }

    function test_RevertWhen_WithdrawPOAPModeNotAuthorized() public {
        // User doesn't own the POAP token
        uint256 poapTokenId = 12345001;
        // Don't set ownership for user, so they don't own the token
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarPOAP.withdrawPOAPMode(fixedAmount, purpose, poapTokenId);
    }

    function test_RevertWhen_WithdrawPOAPModeTooSoon() public {
        // Setup user with POAP
        uint256 poapTokenId = 12345001;
        mockPOAP.setOwner(poapTokenId, user);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarPOAP.withdrawPOAPMode(fixedAmount, purpose, poapTokenId);
        
        uint256 nextAllowed = jarPOAP.lastWithdrawalPOAP(poapTokenId) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarPOAP.withdrawPOAPMode(fixedAmount, purpose, poapTokenId);
    }

    // ==== Unlock Protocol Tests ====

    function test_ConstructorUnlockAccess() public {
        assertTrue(jarUnlock.accessType() == CookieJarLib.AccessType.Unlock);
        (address lockAddress) = jarUnlock.unlockRequirement();
        assertEq(lockAddress, address(mockUnlock));
    }

    function test_WithdrawUnlockMode() public {
        // Setup user with valid key
        mockUnlock.setHasValidKey(user, true);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarUnlock));
        uint256 currencyHeldByJarBefore = jarUnlock.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        
        vm.prank(user);
        jarUnlock.withdrawUnlockMode(maxWithdrawal, purpose);
        
        assertEq(dummyToken.balanceOf(address(jarUnlock)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarUnlock.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(jarUnlock.lastWithdrawalProtocol(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawUnlockModeInvalidAccessType() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarPOAP.withdrawUnlockMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawUnlockModeNotAuthorized() public {
        // User doesn't have valid key
        mockUnlock.setHasValidKey(user, false);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarUnlock.withdrawUnlockMode(maxWithdrawal, purpose);
    }

    // ==== Hypercert Tests ====

    function test_ConstructorHypercertAccess() public {
        assertTrue(jarHypercert.accessType() == CookieJarLib.AccessType.Hypercert);
        (address tokenContract, uint256 tokenId, uint256 minBalance) = jarHypercert.hypercertRequirement();
        assertEq(tokenContract, address(mockHypercert));
        assertEq(tokenId, testTokenId);
        assertEq(minBalance, testMinBalance);
    }

    function test_WithdrawHypercertMode() public {
        // Setup user with sufficient hypercert balance
        mockHypercert.setBalance(user, testTokenId, testMinBalance + 500);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarHypercert).balance;
        uint256 currencyHeldByJarBefore = jarHypercert.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        
        vm.prank(user);
        jarHypercert.withdrawHypercertMode(fixedAmount, purpose, testTokenId);
        
        assertEq(address(jarHypercert).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarHypercert.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        assertEq(jarHypercert.lastWithdrawalProtocol(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawHypercertModeInsufficientBalance() public {
        // User has less than minimum required balance
        mockHypercert.setBalance(user, testTokenId, testMinBalance - 1);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarHypercert.withdrawHypercertMode(fixedAmount, purpose, testTokenId);
    }

    function test_RevertWhen_WithdrawHypercertModeWrongTokenId() public {
        // User has balance but for wrong token ID
        mockHypercert.setBalance(user, testTokenId + 1, testMinBalance);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarHypercert.withdrawHypercertMode(fixedAmount, purpose, testTokenId + 1);
    }

    // ==== Hats Protocol Tests ====

    function test_ConstructorHatsAccess() public {
        assertTrue(jarHats.accessType() == CookieJarLib.AccessType.Hats);
        (uint256 hatId, address hatsContract) = jarHats.hatsRequirement();
        assertEq(hatId, testHatId);
        assertEq(hatsContract, address(mockHats));
    }

    function test_WithdrawHatsMode() public {
        // Setup user wearing the required hat
        mockHats.setWearerStatus(user, testHatId, true);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarHats));
        uint256 currencyHeldByJarBefore = jarHats.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        
        vm.prank(user);
        jarHats.withdrawHatsMode(maxWithdrawal, purpose);
        
        assertEq(dummyToken.balanceOf(address(jarHats)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarHats.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(jarHats.lastWithdrawalProtocol(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawHatsModeNotAuthorized() public {
        // User is not wearing the required hat
        mockHats.setWearerStatus(user, testHatId, false);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarHats.withdrawHatsMode(maxWithdrawal, purpose);
    }

    // ==== Common Validation Tests ====

    function test_RevertWhen_ProtocolWithdrawZeroAmount() public {
        mockPOAP.setOwner(12345, user);
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarPOAP.withdrawPOAPMode(0, purpose, 12345);
    }

    function test_RevertWhen_ProtocolWithdrawShortPurpose() public {
        mockUnlock.setHasValidKey(user, true);
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarUnlock.withdrawUnlockMode(maxWithdrawal, shortPurpose);
    }

    function test_RevertWhen_ProtocolWithdrawInsufficientJarBalance() public {
        mockHypercert.setBalance(user, testTokenId, testMinBalance);
        
        // Create empty jar
        vm.prank(owner);
        CookieJar emptyJar = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Hypercert,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfigWithProtocols(
                CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
                CookieJarLib.UnlockRequirement({lockAddress: address(0)}),
                CookieJarLib.HypercertRequirement({tokenContract: address(mockHypercert), tokenId: testTokenId, minBalance: testMinBalance}),
                CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
            )
        );
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        emptyJar.withdrawHypercertMode(fixedAmount, purpose, testTokenId);
    }

    // ==== Integration Tests ====

    function test_MultipleProtocolWithdrawals() public {
        // Setup users for different protocols
        mockPOAP.setOwner(12345, user);
        mockUnlock.setHasValidKey(user2, true);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        
        // POAP withdrawal
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarPOAP.withdrawPOAPMode(fixedAmount, purpose, 12345);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        
        // Unlock withdrawal
        uint256 user2BalanceBefore = dummyToken.balanceOf(user2);
        vm.prank(user2);
        jarUnlock.withdrawUnlockMode(maxWithdrawal, purpose);
        assertEq(dummyToken.balanceOf(user2), user2BalanceBefore + maxWithdrawal);
    }

    function test_WithdrawalIntervalEnforcement() public {
        mockHats.setWearerStatus(user, testHatId, true);
        
        vm.warp(block.timestamp + withdrawalInterval + 1);
        
        // First withdrawal should succeed
        vm.prank(user);
        jarHats.withdrawHatsMode(fixedAmount, purpose);
        
        // Second withdrawal should fail (too soon)
        uint256 nextAllowed = jarHats.lastWithdrawalProtocol(user) + withdrawalInterval;
        skip(100);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarHats.withdrawHatsMode(fixedAmount, purpose);
        
        // Third withdrawal should succeed after interval
        vm.warp(nextAllowed + 1);
        vm.prank(user);
        jarHats.withdrawHatsMode(fixedAmount, purpose);
    }
}
