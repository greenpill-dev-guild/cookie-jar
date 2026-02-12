// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock contracts for protocol testing
contract MockPOAP {
    mapping(uint256 => address) public owners;
    mapping(address => uint256) public ownerTokenCount;
    mapping(uint256 => uint256) public tokenEventIds;
    mapping(address => mapping(uint256 => uint256[])) private ownerEventTokens;
    mapping(uint256 => uint256) private ownerEventTokenIndex;

    function setOwner(uint256 tokenId, address owner) external {
        _setOwnerForEvent(tokenId, tokenEventIds[tokenId], owner);
    }

    function setOwnerForEvent(uint256 tokenId, uint256 eventId, address owner) external {
        _setOwnerForEvent(tokenId, eventId, owner);
    }

    function _setOwnerForEvent(uint256 tokenId, uint256 eventId, address owner) internal {
        address previousOwner = owners[tokenId];
        uint256 previousEventId = tokenEventIds[tokenId];

        if (previousOwner != address(0)) {
            ownerTokenCount[previousOwner]--;
            _removeOwnerEventToken(previousOwner, previousEventId, tokenId);
        }

        owners[tokenId] = owner;
        tokenEventIds[tokenId] = eventId;

        if (owner != address(0)) {
            ownerTokenCount[owner]++;
            ownerEventTokens[owner][eventId].push(tokenId);
            ownerEventTokenIndex[tokenId] = ownerEventTokens[owner][eventId].length;
        }
    }

    function _removeOwnerEventToken(address owner, uint256 eventId, uint256 tokenId) internal {
        uint256 indexPlusOne = ownerEventTokenIndex[tokenId];
        if (indexPlusOne == 0) return;

        uint256[] storage tokens = ownerEventTokens[owner][eventId];
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = tokens.length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = tokens[lastIndex];
            tokens[index] = lastTokenId;
            ownerEventTokenIndex[lastTokenId] = index + 1;
        }

        tokens.pop();
        ownerEventTokenIndex[tokenId] = 0;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "POAP: token does not exist");
        return owner;
    }

    /// @dev ERC-721 balanceOf — required by Cookie Jar _validateNftContract()
    function balanceOf(address owner) external view returns (uint256) {
        return ownerTokenCount[owner];
    }

    function tokenDetailsOfOwnerByEvent(address owner, uint256 eventId) external view returns (uint256[] memory) {
        uint256[] storage stored = ownerEventTokens[owner][eventId];
        uint256[] memory tokens = new uint256[](stored.length);
        for (uint256 i = 0; i < stored.length; i++) {
            tokens[i] = stored[i];
        }
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

    /// @dev ERC-1155 balanceOf for Cookie Jar _checkAccess() compatibility.
    /// Hats Protocol implements ERC-1155 and returns 0 or 1 based on hat wearing status.
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return wearerStatus[account][id] ? 1 : 0;
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
    CookieJar public jarPoap;
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
    MockPOAP public mockPoap;
    MockPublicLock public mockUnlock;
    MockHypercertToken public mockHypercert;
    MockHats public mockHats;

    address[] public emptyAddresses;
    address[] public emptyAllowlist;
    string public purpose = "Withdrawal for a legitimate purpose!";
    string public shortPurpose = "Too short";

    uint256 public minEthDeposit = 100 wei;
    uint256 public minErc20Deposit = 100;
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
            CookieJarLib.JarConfig(
                _jarOwner, // jarOwner
                _supportedCurrency, // supportedCurrency
                _feeCollectorAddr, // feeCollector
                _accessType, // accessType
                _withdrawalOption, // withdrawalOption
                _strictPurpose, // strictPurpose
                _emergencyEnabled, // emergencyWithdrawalEnabled
                _oneTimeWithdrawal, // oneTimeWithdrawal
                _fixedAmount, // fixedAmount
                _maxWithdrawal, // maxWithdrawal
                _withdrawalInterval, // withdrawalInterval
                _minDeposit, // minDeposit
                _feePercentage, // feePercentageOnDeposit
                0, // maxWithdrawalPerPeriod (unlimited)
                "Test Protocol Jar", // metadata
                CookieJarLib.MultiTokenConfig({ // multiTokenConfig
                        enabled: false,
                        maxSlippagePercent: 500,
                        minSwapAmount: 0,
                        defaultFee: 3000
                    })
            );
    }

    // Helper: ERC721 access config for POAP event-level gating
    function createPoapAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(mockPoap),
                    tokenId: testEventId,
                    minBalance: 1
                })
            });
    }

    // Helper: ERC721 access config for generic Unlock-style key ownership
    function createUnlockAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(mockPoap),
                    tokenId: 0,
                    minBalance: 0
                })
            });
    }

    // Helper: ERC1155 access config using mockHypercert (Hypercert tests)
    function createHypercertAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(mockHypercert),
                    tokenId: testTokenId,
                    minBalance: testMinBalance
                })
            });
    }

    // Helper: ERC1155 access config using mockHats (Hats Protocol tests)
    function createHatsAccessConfig() internal view returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(mockHats),
                    tokenId: testHatId,
                    minBalance: 1
                })
            });
    }

    function setUp() public {
        dummyToken = new DummyERC20();
        mockPoap = new MockPOAP();
        mockUnlock = new MockPublicLock();
        mockHypercert = new MockHypercertToken();
        mockHats = new MockHats();

        emptyAddresses = new address[](0);
        emptyAllowlist = new address[](0);

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        // Create POAP jar (ERC721, ETH, Fixed) with event-level gate
        jarPoap = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createPoapAccessConfig(),
            address(0) // Superfluid host disabled for testing
        );

        // Create Unlock jar (ERC721, ERC20, Variable) — uses mockPoap
        jarUnlock = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createUnlockAccessConfig(),
            address(0) // Superfluid host disabled for testing
        );

        // Create Hypercert jar (ERC1155, ETH, Fixed) — uses mockHypercert
        jarHypercert = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC1155,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createHypercertAccessConfig(),
            address(0) // Superfluid host disabled for testing
        );

        // Create Hats jar (ERC1155, ERC20, Variable) — uses mockHats with testHatId
        jarHats = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.ERC1155,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createHatsAccessConfig(),
            address(0) // Superfluid host disabled for testing
        );

        // Fund the jars
        jarPoap.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarUnlock), 1000 * 1e18);
        jarUnlock.deposit(1000 * 1e18);
        jarHypercert.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarHats), 1000 * 1e18);
        jarHats.deposit(1000 * 1e18);

        vm.stopPrank();
    }

    // ==== ERC721 Access Tests ====

    function test_ConstructorERC721Access() public {
        assertTrue(jarPoap.ACCESS_TYPE() == CookieJarLib.AccessType.ERC721);
    }

    function test_WithdrawERC721Mode() public {
        // Setup user with POAP for the required event.
        uint256 poapTokenId = 12345001;
        mockPoap.setOwnerForEvent(poapTokenId, testEventId, user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarPoap).balance;
        uint256 currencyHeldByJarBefore = jarPoap.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;

        vm.prank(user);
        jarPoap.withdrawWithErc721(fixedAmount, purpose);

        assertEq(address(jarPoap).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarPoap.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        // assertEq(jarPoap.lastWithdrawalPOAP(poapTokenId), block.timestamp);
    }

    function test_RevertWhen_WithdrawERC721ModeInvalidAccessType() public {
        // Calling withdrawWithErc721 on an ERC1155 jar should revert
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarHypercert.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawERC721ModeNotAuthorized() public {
        // User doesn't own any POAP tokens — balance is 0
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarPoap.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawPOAPModeTooSoon() public {
        // Setup user with POAP for required event.
        uint256 poapTokenId = 12345001;
        mockPoap.setOwnerForEvent(poapTokenId, testEventId, user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarPoap.withdrawWithErc721(fixedAmount, purpose);

        // Second withdrawal too soon — should revert
        uint256 nextAllowed = jarPoap.lastWithdrawalTime(user) + withdrawalInterval;
        skip(100);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarPoap.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawPOAPModeWrongEvent() public {
        // User has a POAP, but for a different event than the jar requires.
        mockPoap.setOwnerForEvent(12345002, testEventId + 1, user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarPoap.withdrawWithErc721(fixedAmount, purpose);
    }

    // ==== Unlock Protocol Tests ====

    function test_ConstructorUnlockAccess() public {
        assertTrue(jarUnlock.ACCESS_TYPE() == CookieJarLib.AccessType.ERC721);
    }

    function test_WithdrawUnlockMode() public {
        // jarUnlock uses generic ERC721 ownership (tokenId=0) — any token works
        mockPoap.setOwner(99999, user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarUnlock));
        uint256 currencyHeldByJarBefore = jarUnlock.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);

        vm.prank(user);
        jarUnlock.withdrawWithErc721(maxWithdrawal, purpose);

        assertEq(dummyToken.balanceOf(address(jarUnlock)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarUnlock.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
    }

    function test_RevertWhen_WithdrawERC1155ModeInvalidAccessType() public {
        // Calling withdrawWithErc1155 on an ERC721 jar should revert
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarPoap.withdrawWithErc1155(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawUnlockModeNotAuthorized() public {
        // User doesn't own any tokens — mockPoap balanceOf returns 0
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarUnlock.withdrawWithErc721(maxWithdrawal, purpose);
    }

    // ==== Hypercert Tests ====

    function test_ConstructorHypercertAccess() public {
        assertTrue(jarHypercert.ACCESS_TYPE() == CookieJarLib.AccessType.ERC1155);
    }

    function test_WithdrawERC1155Mode() public {
        // Setup user with sufficient hypercert balance
        mockHypercert.setBalance(user, testTokenId, testMinBalance + 500);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarHypercert).balance;
        uint256 currencyHeldByJarBefore = jarHypercert.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;

        vm.prank(user);
        jarHypercert.withdrawWithErc1155(fixedAmount, purpose);

        assertEq(address(jarHypercert).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarHypercert.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        // assertEq(jarHypercert.lastWithdrawalProtocol(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawERC1155ModeInsufficientBalance() public {
        // User has less than minimum required balance
        mockHypercert.setBalance(user, testTokenId, testMinBalance - 1);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarHypercert.withdrawWithErc1155(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawERC1155ModeWrongTokenId() public {
        // User has balance but for wrong token ID — jar checks testTokenId, user has testTokenId+1
        mockHypercert.setBalance(user, testTokenId + 1, testMinBalance);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarHypercert.withdrawWithErc1155(fixedAmount, purpose);
    }

    // ==== Hats Protocol Tests ====

    function test_ConstructorHatsAccess() public {
        assertTrue(jarHats.ACCESS_TYPE() == CookieJarLib.AccessType.ERC1155);
    }

    function test_WithdrawHatsMode() public {
        // Setup user wearing the required hat
        mockHats.setWearerStatus(user, testHatId, true);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarHats));
        uint256 currencyHeldByJarBefore = jarHats.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);

        vm.prank(user);
        jarHats.withdrawWithErc1155(maxWithdrawal, purpose);

        assertEq(dummyToken.balanceOf(address(jarHats)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarHats.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        // assertEq(jarHats.lastWithdrawalProtocol(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawHatsModeNotAuthorized() public {
        // User is not wearing the required hat — balanceOf returns 0
        mockHats.setWearerStatus(user, testHatId, false);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarHats.withdrawWithErc1155(maxWithdrawal, purpose);
    }

    function test_RevertWhen_WithdrawHatsModeWrongHatId() public {
        // User wears a DIFFERENT hat — should fail because jar checks testHatId
        uint256 differentHatId = testHatId + 1;
        mockHats.setWearerStatus(user, differentHatId, true);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarHats.withdrawWithErc1155(maxWithdrawal, purpose);
    }

    function test_RevertWhen_HatsRevokedBetweenWithdrawals() public {
        // Grant hat, withdraw, revoke hat, attempt second withdrawal
        mockHats.setWearerStatus(user, testHatId, true);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // Revoke hat (simulates operator removing gardener role)
        mockHats.setWearerStatus(user, testHatId, false);

        // Wait past cooldown — still should fail because hat is revoked
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarHats.withdrawWithErc1155(fixedAmount, purpose);
    }

    function test_HatsMultipleUsersIndependentCooldowns() public {
        // Two users wearing the hat can withdraw independently
        mockHats.setWearerStatus(user, testHatId, true);
        mockHats.setWearerStatus(user2, testHatId, true);

        vm.warp(block.timestamp + withdrawalInterval + 1);

        // User 1 withdraws
        vm.prank(user);
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // User 2 can still withdraw (cooldown is per-user)
        vm.prank(user2);
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // User 1 is on cooldown
        skip(100);
        uint256 nextAllowed = jarHats.lastWithdrawalTime(user) + withdrawalInterval;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // User 2 is also on cooldown
        uint256 nextAllowed2 = jarHats.lastWithdrawalTime(user2) + withdrawalInterval;
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed2));
        jarHats.withdrawWithErc1155(fixedAmount, purpose);
    }

    // ==== Common Validation Tests ====

    function test_RevertWhen_ERC721WithdrawZeroAmount() public {
        mockPoap.setOwnerForEvent(12345, testEventId, user);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarPoap.withdrawWithErc721(0, purpose);
    }

    function test_RevertWhen_ERC721WithdrawShortPurpose() public {
        // Give user access via mockPoap, then test purpose validation
        mockPoap.setOwner(88888, user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarUnlock.withdrawWithErc721(maxWithdrawal, shortPurpose);
    }

    function test_RevertWhen_ERC1155WithdrawInsufficientJarBalance() public {
        mockHypercert.setBalance(user, testTokenId, testMinBalance);

        // Create empty jar using Hypercert access config
        vm.prank(owner);
        CookieJar emptyJar = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC1155,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createHypercertAccessConfig(),
            address(0) // Superfluid host disabled for testing
        );

        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        emptyJar.withdrawWithErc1155(fixedAmount, purpose);
    }

    // ==== Integration Tests ====

    function test_MultipleAccessTypeWithdrawals() public {
        // Setup users for different protocols
        mockPoap.setOwnerForEvent(12345, testEventId, user);
        mockPoap.setOwner(12346, user2);

        vm.warp(block.timestamp + withdrawalInterval + 1);

        // POAP withdrawal (ETH, Fixed)
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarPoap.withdrawWithErc721(fixedAmount, purpose);
        assertEq(user.balance, userBalanceBefore + fixedAmount);

        // Unlock withdrawal (ERC20, Variable) — also uses mockPoap for ERC721 access
        uint256 user2BalanceBefore = dummyToken.balanceOf(user2);
        vm.prank(user2);
        jarUnlock.withdrawWithErc721(maxWithdrawal, purpose);
        assertEq(dummyToken.balanceOf(user2), user2BalanceBefore + maxWithdrawal);
    }

    function test_WithdrawalIntervalEnforcement() public {
        mockHats.setWearerStatus(user, testHatId, true);

        vm.warp(block.timestamp + withdrawalInterval + 1);

        // First withdrawal should succeed
        vm.prank(user);
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // Second withdrawal too soon — should revert
        uint256 nextAllowed = jarHats.lastWithdrawalTime(user) + withdrawalInterval;
        skip(100);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarHats.withdrawWithErc1155(fixedAmount, purpose);

        // Third withdrawal after interval — should succeed
        vm.warp(nextAllowed + 1);
        vm.prank(user);
        jarHats.withdrawWithErc1155(fixedAmount, purpose);
    }
}
