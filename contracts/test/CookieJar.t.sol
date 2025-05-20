// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJar.sol";
import "../script/HelperConfig.s.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

// --- Mock ERC20 ---
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyERC20 is ERC20 {
    constructor() ERC20("Dummy", "DUM") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// --- Mock ERC721 ---
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DummyERC721 is ERC721 {
    uint256 public nextdummyTokenId;

    constructor() ERC721("Dummy721", "D721") {}

    function mint(address to) external returns (uint256) {
        uint256 dummyTokenId = nextdummyTokenId;
        _mint(to, dummyTokenId);
        nextdummyTokenId++;
        return dummyTokenId;
    }
}

// --- Mock ERC1155 ---
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract DummyERC1155 is ERC1155 {
    constructor() ERC1155("https://dummy.uri/") {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }
}

contract CookieJarTest is Test {
    HelperConfig public helperConfig;
    HelperConfig.NetworkConfig config;

    CookieJarFactory public factory;

    CookieJar public jarWhitelistETHFixed;
    CookieJar public jarWhitelistERC20Fixed;
    CookieJar public jarNFTETHFixed;
    CookieJar public jarNFTERC20Var;
    CookieJar public jarWhitelistETHOneTimeWithdrawal;
    CookieJar public jarNFTERC20OneTimeWithdrawal;

    address public owner = address(0xABCD);
    address public user = address(0xBEEF);
    address public user2 = address(0xC0DE);
    address public attacker = address(0xBAD);

    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;

    DummyERC20 public dummyToken;
    DummyERC721 public dummyERC721;
    DummyERC1155 public dummyERC1155;

    address[] public users;
    address[] public emptyAddresses;
    CookieJarLib.NFTType[] public emptyTypes;
    address[] public nftAddresses;
    CookieJarLib.NFTType[] public nftTypes;
    address[] public emptyWhitelist;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();

        // Deploy dummy dummyTokens
        dummyToken = new DummyERC20();
        dummyERC721 = new DummyERC721();
        dummyERC1155 = new DummyERC1155();

        users = new address[](2);
        users[0] = user;
        users[1] = user2;

        emptyAddresses = new address[](0);
        emptyTypes = new CookieJarLib.NFTType[](0);
        emptyWhitelist = new address[](0);

        nftAddresses = new address[](2);
        nftAddresses[0] = address(dummyERC721);
        nftAddresses[1] = address(dummyERC1155);
        nftTypes = new CookieJarLib.NFTType[](2);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        nftTypes[1] = CookieJarLib.NFTType.ERC1155;

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        factory = new CookieJarFactory(
            config.defaultFeeCollector,
            owner,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );

        // --- Create a CookieJar in Whitelist mode ---
        // For Whitelist mode, NFT arrays are ignored.
        jarWhitelistETHFixed = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
                    CookieJarLib.AccessType.Whitelist,
                    emptyAddresses,
                    emptyTypes,
                    CookieJarLib.WithdrawalTypeOptions.Fixed,
                    fixedAmount,
                    maxWithdrawal,
                    withdrawalInterval,
                    strictPurpose,
                    true, // emergencyWithdrawalEnabled
                    false, // oneTimeWithdrawalEnabled
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        jarWhitelistERC20Fixed = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(dummyToken),
                    CookieJarLib.AccessType.Whitelist,
                    emptyAddresses,
                    emptyTypes,
                    CookieJarLib.WithdrawalTypeOptions.Fixed,
                    fixedAmount,
                    maxWithdrawal,
                    withdrawalInterval,
                    strictPurpose,
                    true, // emergencyWithdrawalEnabled
                    false,
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        // --- Create a CookieJar in NFTGated mode with one approved NFT gate (ERC721) ---
        jarNFTETHFixed = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
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
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        jarNFTERC20Var = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(dummyToken),
                    CookieJarLib.AccessType.NFTGated,
                    nftAddresses,
                    nftTypes,
                    CookieJarLib.WithdrawalTypeOptions.Variable,
                    fixedAmount,
                    maxWithdrawal,
                    withdrawalInterval,
                    strictPurpose,
                    true, // emergencyWithdrawalEnabled
                    false,
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        jarWhitelistETHOneTimeWithdrawal = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
                    CookieJarLib.AccessType.Whitelist,
                    nftAddresses,
                    nftTypes,
                    CookieJarLib.WithdrawalTypeOptions.Fixed,
                    fixedAmount,
                    maxWithdrawal,
                    withdrawalInterval,
                    strictPurpose,
                    true, // emergencyWithdrawalEnabled
                    true,
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        jarNFTERC20OneTimeWithdrawal = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(dummyToken),
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
                    true,
                    emptyWhitelist,
                    "Test Metadata"
                )
            )
        );

        jarWhitelistETHFixed.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarWhitelistERC20Fixed), 1000 * 1e18);
        jarWhitelistERC20Fixed.depositCurrency(1000 * 1e18);
        jarNFTETHFixed.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20Var), 1000 * 1e18);
        jarNFTERC20Var.depositCurrency(1000 * 1e18);
        jarWhitelistETHOneTimeWithdrawal.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20OneTimeWithdrawal), 1000 * 1e18);
        jarNFTERC20OneTimeWithdrawal.depositCurrency(1000 * 1e18);
        vm.stopPrank();
    }

    //     // ===== Existing Tests =====

    // Test deposit ETH with fee deduction (1% fee)
    function test_DepositETH() public {
        uint256 depositValue = 100 wei;
        uint256 feeBalanceBefore = config.defaultFeeCollector.balance;
        uint256 jarwhitebalanceBefore = address(jarWhitelistETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarWhitelistETHFixed.currencyHeldByJar();
        vm.deal(user, depositValue);
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarWhitelistETHFixed.depositETH{value: depositValue}();
        uint256 fee = ((jarWhitelistETHFixed.feePercentageOnDeposit() * depositValue) / 10000);
        uint256 amountMinusFee = depositValue - fee;
        assertEq(
            address(jarWhitelistETHFixed).balance,
            jarwhitebalanceBefore + amountMinusFee
        );
        assertEq(config.defaultFeeCollector.balance, feeBalanceBefore + fee);
        assertEq(jarWhitelistETHFixed.currencyHeldByJar(), currencyHeldByJarBefore + amountMinusFee);
        assertEq(user.balance, userBalanceBefore - depositValue);
    }

    function test_RevertWhen_DepositETHWithLessThanMinAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.LessThanMinimumDeposit.selector));
        jarWhitelistETHFixed.depositETH{value: 0}();
    }

    function test_RevertWhen_DepositETHWithInvalidTokenAddress() public {
        vm.deal(user, 10 ether);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidTokenAddress.selector));
        jarWhitelistERC20Fixed.depositETH{value: 10 ether}();
    }

    // Test deposit dummyToken using DummyERC20 (fee deducted as 1%)
    function testDepositdummyToken() public {
        uint256 depositAmount = 1000 * 1e18;
        deal(address(dummyToken), user, depositAmount);
        vm.startPrank(user);

        uint256 feeBalanceBefore = ERC20(dummyToken).balanceOf(config.defaultFeeCollector);
        uint256 currencyHeldByJarBefore = jarWhitelistERC20Fixed.currencyHeldByJar();
        uint256 jarBalanceBefore = ERC20(dummyToken).balanceOf(address(jarWhitelistERC20Fixed));
        dummyToken.approve(address(jarWhitelistERC20Fixed), depositAmount);
        jarWhitelistERC20Fixed.depositCurrency(depositAmount);
        assertEq(
            ERC20(dummyToken).balanceOf(config.defaultFeeCollector),
            feeBalanceBefore + ((jarWhitelistETHFixed.feePercentageOnDeposit() * depositAmount) / 10000)
        );
        assertEq(
            ERC20(dummyToken).balanceOf(address(jarWhitelistERC20Fixed)),
            jarBalanceBefore
                + (depositAmount - ((jarWhitelistETHFixed.feePercentageOnDeposit() * depositAmount) / 10000))
        );
        assertEq(
            jarWhitelistERC20Fixed.currencyHeldByJar(),
            currencyHeldByJarBefore
                + (depositAmount - ((jarWhitelistETHFixed.feePercentageOnDeposit() * depositAmount) / 10000))
        );
        vm.stopPrank();
    }

    // ===== Admin Function Tests =====

    // updateWhitelist (only admin, in Whitelist mode)
    function testUpdateWhitelist() public {
        vm.prank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        assertTrue(jarWhitelistETHFixed.hasRole(keccak256("JAR_WHITELISTED"), user));
        assertTrue(jarWhitelistETHFixed.hasRole(keccak256("JAR_WHITELISTED"), user2));
        assertEq(jarWhitelistETHFixed.getWhitelist().length, 2);
        assertEq(jarWhitelistETHFixed.getWhitelist()[0], user);
        assertEq(jarWhitelistETHFixed.getWhitelist()[1], user2);
    }

    function testRevokeWhitelist() public {
        vm.startPrank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        jarWhitelistETHFixed.revokeJarWhitelistRole(users);
        assertFalse(jarWhitelistETHFixed.hasRole(keccak256("JAR_WHITELISTED"), user));
        assertFalse(jarWhitelistETHFixed.hasRole(keccak256("JAR_WHITELISTED"), user2));
        assertEq(jarWhitelistETHFixed.getWhitelist().length, 0);
    }

    // updateWhitelist should revert if called by non-admin.
    function testUpdateWhitelistNonAdmin() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, CookieJarLib.JAR_OWNER
            )
        );
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
    }

    // In NFT mode, updateWhitelist should revert (invalid access type).
    function testUpdateWhitelistNFTMode() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNFTETHFixed.grantJarWhitelistRole(users);
    }

    // updateFeeCollector: only feeCollector can update.
    function testUpdateFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(config.defaultFeeCollector);
        jarWhitelistETHFixed.updateFeeCollector(newCollector);
        assertEq(jarWhitelistETHFixed.feeCollector(), newCollector);
    }

    // updateFeeCollector should revert when not called by feeCollector.
    function testUpdateFeeCollectorNotAuthorized() public {
        address newCollector = address(0x1234);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotFeeCollector.selector));
        jarWhitelistETHFixed.updateFeeCollector(newCollector);
    }

    // addNFTGate in NFTGated mode works and limits maximum gates.
    function testAddNFTGate() public {
        uint256 nftGatesLengthBefore = jarNFTETHFixed.getNFTGatesArray().length;
        vm.startPrank(owner);
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.addNFTGate(address(2), CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.addNFTGate(address(3), CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.addNFTGate(address(4), CookieJarLib.NFTType.ERC1155);
        assertEq(jarNFTETHFixed.getNFTGatesArray().length, nftGatesLengthBefore + 4);
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore].nftAddress, address(1));
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 1].nftAddress, address(2));
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 2].nftAddress, address(3));
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 3].nftAddress, address(4));
        vm.stopPrank();
    }

    function testRemovingNFT() public {
        // Ensure first gate addition is by admin
        vm.prank(owner);
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);

        // Potential issue: this subsequent call might not have admin context
        // Either prank again or ensure this is called within admin context
        vm.prank(owner); // Add this line to ensure admin context
        jarNFTETHFixed.addNFTGate(address(2), CookieJarLib.NFTType.ERC1155);

        vm.prank(owner);
        jarNFTETHFixed.addNFTGate(address(3), CookieJarLib.NFTType.ERC1155);

        vm.prank(owner);
        jarNFTETHFixed.addNFTGate(address(4), CookieJarLib.NFTType.ERC1155);

        vm.prank(owner);
        jarNFTETHFixed.removeNFTGate(address(2));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector));
        jarNFTETHFixed.removeNFTGate(address(2)); // This should revert
    }

    // ===== Constructor Edge Cases =====

    // NFTGated mode: Providing an NFT gate with a zero address should revert.
    function testInvalidNFTGateInConstructor() public {
        address[] memory invalidAddresses = new address[](2);
        invalidAddresses[0] = address(0);
        invalidAddresses[1] = address(dummyERC1155);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        factory.createCookieJar(
            owner,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            invalidAddresses,
            nftTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true, // emergencyWithdrawalEnabled
            false,
            emptyWhitelist,
            "Test Metadata"
        );
    }

    // ===== New Test Cases for New Validations =====

    function test_UpdateMaxWithdrawalAmount() public {
        vm.prank(owner);
        jarNFTERC20Var.UpdateMaxWithdrawalAmount(1000 * 1e18);
        assertEq(jarNFTERC20Var.maxWithdrawal(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateMaxWithdrawalAmountCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, user, CookieJarLib.JAR_OWNER
            )
        );
        jarNFTERC20Var.UpdateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_RevertWhen_UpdateMaxWithdrawalAmountCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTERC20Var.UpdateMaxWithdrawalAmount(0);
    }

    function test_RevertWhen_UpdateMaxWithdrawalAmountCalledWithFixedWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNFTETHFixed.UpdateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_UpdateFixedWithdrawalAmount() public {
        vm.prank(owner);
        jarNFTETHFixed.updateFixedWithdrawalAmount(1000 * 1e18);
        assertEq(jarNFTETHFixed.fixedAmount(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledWithVariableWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNFTERC20Var.updateFixedWithdrawalAmount(1000 * 1e18);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.updateFixedWithdrawalAmount(0);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, user, CookieJarLib.JAR_OWNER
            )
        );
        jarNFTETHFixed.updateFixedWithdrawalAmount(1000 * 1e18);
    }

    function test_UpdateWithdrawalInterval() public {
        vm.prank(owner);
        jarNFTETHFixed.updateWithdrawalInterval(1000 * 1e18);
        assertEq(jarNFTETHFixed.withdrawalInterval(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateWithdrawalIntervalCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.updateWithdrawalInterval(0);
    }

    function test_RevertWhen_UpdateWithdrawalIntervalCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, user, CookieJarLib.JAR_OWNER
            )
        );
        jarNFTETHFixed.updateWithdrawalInterval(1000 * 1e18);
    }

    // ===== New Test for NFT Gate Mapping Optimization =====

    // Test that after adding a new NFT gate via addNFTGate, the optimized mapping lookup works
    // by performing a withdrawal using the newly added NFT gate.
    function testWithdrawNFTModeAfterAddGateMapping() public {
        // Use dummyERC1155 as a new NFT gate (not present in the constructor)
        DummyERC1155 secondDummyERC1155 = new DummyERC1155();
        vm.prank(owner);
        jarNFTETHFixed.addNFTGate(address(secondDummyERC1155), CookieJarLib.NFTType.ERC1155);

        // Mint an NFT dummyToken (ERC1155) for the user.
        secondDummyERC1155.mint(user, 1, 1);
        // Fund jarNFTETH with ETH.
        vm.deal(address(jarNFTETHFixed), 10 ether);
        // Advance time to satisfy timelock.
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        // Withdrawal should now succeed using dummyERC1155 as the NFT gate.
        uint256 currencyHeldByJarBefore = jarNFTETHFixed.currencyHeldByJar();
        vm.prank(user);
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(secondDummyERC1155), 1);
        assertEq(address(jarNFTETHFixed).balance, 10 ether - fixedAmount);
        assertEq(jarNFTETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
    }

    // ===== Withdrawal Tests (Whitelist Mode) =====

    // Successful ETH withdrawal in fixed mode.
    function testWithdrawWhitelistETHFixed() public {
        vm.prank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Withdrawal for a legitimate purpose!";
        uint256 currencyHeldByJarBefore = jarWhitelistETHFixed.currencyHeldByJar();
        uint256 initialBalance = address(jarWhitelistETHFixed).balance;
        vm.prank(user);
        jarWhitelistETHFixed.withdrawWhitelistMode(fixedAmount, purpose);
        assertEq(address(jarWhitelistETHFixed).balance, initialBalance - fixedAmount);
        assertEq(jarWhitelistETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
    }

    // Revert if user is not whitelisted.
    function testWithdrawWhitelistNotWhitelisted() public {
        vm.deal(address(jarWhitelistETHFixed), 10 ether);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, user, CookieJarLib.JAR_WHITELISTED
            )
        );
        jarWhitelistETHFixed.withdrawWhitelistMode(fixedAmount, purpose);
    }

    // Revert if the purpose string is too short.
    function testWithdrawWhitelistShortPurpose() public {
        vm.prank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory shortPurpose = "Too short";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarWhitelistETHFixed.withdrawWhitelistMode(fixedAmount, shortPurpose);
    }

    // Revert if withdrawal is attempted too soon.
    function testWithdrawWhitelistTooSoon() public {
        vm.deal(address(jarWhitelistETHFixed), 10 ether);
        vm.prank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarWhitelistETHFixed.withdrawWhitelistMode(fixedAmount, purpose);
        uint256 nextAllowed = jarWhitelistETHFixed.lastWithdrawalWhitelist(user) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarWhitelistETHFixed.withdrawWhitelistMode(fixedAmount, purpose);
    }

    // Revert if the withdrawal amount does not match the fixed amount.
    function testWithdrawWhitelistWrongAmountFixed() public {
        vm.deal(address(jarWhitelistETHFixed), 10 ether);
        vm.prank(owner);
        jarWhitelistETHFixed.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarWhitelistETHFixed.withdrawWhitelistMode(wrongAmount, purpose);
    }

    // Successful ERC20 withdrawal in Whitelist mode.
    function testWithdrawWhitelistERC20Fixed() public {
        vm.prank(owner);
        jarWhitelistERC20Fixed.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 currencyHeldByJarBefore = jarWhitelistERC20Fixed.currencyHeldByJar();
        vm.prank(user);
        jarWhitelistERC20Fixed.withdrawWhitelistMode(fixedAmount, purpose);
        assertEq(dummyToken.balanceOf(user), fixedAmount);
        assertEq(jarWhitelistERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
    }

    // ===== Withdrawal Tests (NFTGated Mode) =====

    // Successful ETH withdrawal in NFT mode using an ERC721 dummyToken.
    function testWithdrawNFTModeETHFixedERC721() public {
        vm.deal(address(jarNFTETHFixed), 10 ether);
        console.log("Initial jar balance:", address(jarNFTETHFixed).balance);

        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 balanceBefore = address(jarNFTETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHFixed.currencyHeldByJar();
        vm.prank(user);
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        assertEq(address(jarNFTETHFixed).balance, balanceBefore - fixedAmount);
        assertEq(jarNFTETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
    }

    // Revert if the caller does not own the NFT (ERC721).
    function testWithdrawNFTModeNotOwnerERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarNFTETHFixed.withdrawNFTMode(
            fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId
        );
    }

    // Revert if the purpose string is too short in NFT mode.
    function testWithdrawNFTModeShortPurpose() public {
        vm.deal(address(jarNFTETHFixed), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, "short purpose", address(dummyERC721), dummyTokenId);
    }

    // Revert if the NFT withdrawal is attempted before the timelock expires.
    function testWithdrawNFTModeTooSoon() public {
        vm.deal(address(jarNFTETHFixed), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        uint256 nextAllowed = jarNFTETHFixed.lastWithdrawalNFT(address(dummyERC721), dummyTokenId) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
    }

    // Revert if the withdrawal amount does not match the fixed amount in NFT mode.
    function testWithdrawNFTModeWrongAmountFixed() public {
        vm.deal(address(jarNFTETHFixed), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarNFTETHFixed.withdrawNFTMode(
            wrongAmount, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId
        );
    }

    // Revert if the jarNFTETH does not have enough ETH.
    function testWithdrawNFTModeInsufficientBalance() public {
        vm.deal(address(jarNFTETHFixed), fixedAmount - 0.1 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.TransferFailed.selector));
        jarNFTETHFixed.withdrawNFTMode(
            fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId
        );
    }

    function testOneTimeWithdrawWhitelistModeETH() public {
        vm.prank(owner);
        jarWhitelistETHOneTimeWithdrawal.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarWhitelistETHOneTimeWithdrawal.withdrawWhitelistMode(
            fixedAmount, "Valid purpose string exceeding 20 characters"
        );
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarWhitelistETHOneTimeWithdrawal.withdrawWhitelistMode(
            fixedAmount, "Valid purpose string exceeding 20 characters"
        );
        vm.stopPrank();
    }

    function testOneTimeWithdrawNFTModeERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(address(jarNFTERC20OneTimeWithdrawal), dummyTokenAmount);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(
            fixedAmount, "Valid purpose string exceeding 20 characters", address(dummyERC721), dummyTokenId
        );
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(
            fixedAmount, "Valid purpose string exceeding 20 characters", address(dummyERC721), dummyTokenId
        );
        vm.stopPrank();
    }

    function testVariableWithdrawWhitelistModeETH() public {
        vm.startPrank(owner);
        CookieJar variableJar = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
                    /// @dev address(3) for ETH jars.
                    CookieJarLib.AccessType.Whitelist,
                    nftAddresses,
                    nftTypes,
                    CookieJarLib.WithdrawalTypeOptions.Variable,
                    0,
                    maxWithdrawal,
                    withdrawalInterval,
                    strictPurpose,
                    true, // emergencyWithdrawalEnabled
                    true,
                    users,
                    "Test Metadata"
                )
            )
        );
        variableJar.depositETH{value: 3 ether}();
        vm.stopPrank();
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = variableJar.currencyHeldByJar();
        uint256 initialBalance = address(variableJar).balance;
        vm.prank(user);
        variableJar.withdrawWhitelistMode(1.5 ether, "Valid purpose string exceeding 20 characters");
        assertEq(address(variableJar).balance, initialBalance - 1.5 ether);
        assertEq(variableJar.currencyHeldByJar(), currencyHeldByJarBefore - 1.5 ether);
    }

    // Successful ERC20 withdrawal in NFT mode.
    function testWithdrawNFTModeERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(address(jarNFTETHFixed), dummyTokenAmount);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarNFTERC20Var.withdrawNFTMode(
            fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId
        );
        assertEq(dummyToken.balanceOf(user), fixedAmount);
    }

    //     // ===== Emergency Withdrawal Tests =====

    //     // Emergency withdrawal of ETH by admin in Whitelist mode.
    //     function testEmergencyWithdrawETHWhitelist() public {
    //         uint256 fundAmount = 5 ether;
    //         vm.deal(address(jarWhitelistETH), fundAmount);
    //         vm.deal(admin, 0);
    //         uint256 withdrawAmount = 2 ether;
    //         vm.prank(admin);
    //         jarWhitelistETH.emergencyWithdraw(address(0), withdrawAmount);
    //         assertEq(address(jarWhitelistETH).balance, fundAmount - withdrawAmount);
    //         assertEq(admin.balance, withdrawAmount);
    //     }

    //     // Emergency withdrawal of ERC20 dummyTokens by admin in Whitelist mode.
    //     function testEmergencyWithdrawERC20Whitelist() public {
    //         uint256 dummyTokenFund = 1000 * 1e18;
    //         dummyToken.mint(address(jarWhitelistETH), dummyTokenFund);
    //         assertEq(dummyToken.balanceOf(address(jarWhitelistETH)), dummyTokenFund);
    //         uint256 withdrawAmount = 200 * 1e18;
    //         vm.prank(admin);
    //         jarWhitelistETH.emergencyWithdraw(address(dummyToken), withdrawAmount);
    //         assertEq(
    //             dummyToken.balanceOf(address(jarWhitelistETH)),
    //             dummyTokenFund - withdrawAmount
    //         );
    //         assertEq(dummyToken.balanceOf(admin), withdrawAmount);
    //     }

    //     // Emergency withdrawal should revert when called by a non-admin.
    //     function testEmergencyWithdrawNonAdmin() public {
    //         vm.deal(address(jarWhitelistETH), 5 ether);
    //         vm.prank(attacker);
    //         vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
    //         jarWhitelistETH.emergencyWithdraw(address(0), 1 ether);

    //         dummyToken.mint(address(jarWhitelistETH), 1000 * 1e18);
    //         vm.prank(attacker);
    //         vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
    //         jarWhitelistETH.emergencyWithdraw(address(dummyToken), 100 * 1e18);
    //     }

    //     // Emergency withdrawal should revert if jar balance is insufficient (ETH).
    //     function testEmergencyWithdrawInsufficientBalanceETH() public {
    //         vm.deal(address(jarWhitelistETH), 1 ether);
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.InsufficientBalance.selector)
    //         );
    //         jarWhitelistETH.emergencyWithdraw(address(0), 2 ether);
    //     }

    // Revert if zero ETH withdrawal is attempted in NFT-gated mode.
    function testWithdrawNFTModeZeroAmountETH() public {
        vm.deal(address(jarNFTETHFixed), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.withdrawNFTMode(0, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId);
    }

    // Revert if zero ERC20 withdrawal is attempted in NFT-gated mode.
    function testWithdrawNFTModeZeroAmountERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(address(jarNFTETHFixed), dummyTokenAmount);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.withdrawNFTMode(0, "Valid purpose description exceeding 20.", address(dummyERC721), dummyTokenId);
    }

    // Emergency withdrawal should revert if jar balance is insufficient (ERC20).
    function testEmergencyWithdrawInsufficientBalanceERC20() public {
        uint256 dummyTokenFund = 500 * 1e18;
        dummyToken.mint(address(jarWhitelistETHFixed), dummyTokenFund);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientBalance.selector, address(jarWhitelistETHFixed), 500 * 1e18, 600 * 1e18
            )
        );
        jarWhitelistETHFixed.emergencyWithdraw(address(dummyToken), 600 * 1e18);
    }

    function testEmergencyWithdrawInsufficientBalanceETH() public {
        uint256 dummyTokenFund = 500 * 1e18;
        vm.deal(address(jarWhitelistETHFixed), dummyTokenFund);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.TransferFailed.selector));
        jarWhitelistETHFixed.emergencyWithdraw(address(3), 600 * 1e18);
    }

    // // ===== Emergency Withdrawal Zero Amount Tests =====

    // // Revert if zero ETH emergency withdrawal is attempted.
    // function testEmergencyWithdrawZeroAmountETH() public {
    //     vm.deal(address(jarWhitelistETH), 5 ether);
    //     vm.prank(admin);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(CookieJar.ZeroAmount.selector)
    //     );
    //     jarWhitelistETH.emergencyWithdraw(address(0), 0);
    // }

    // // Revert if zero ERC20 emergency withdrawal is attempted.
    // function testEmergencyWithdrawZeroAmountERC20() public {
    //     uint256 dummyTokenFund = 1000 * 1e18;
    //     dummyToken.mint(address(jarWhitelistETH), dummyTokenFund);
    //     vm.prank(admin);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(CookieJar.ZeroAmount.selector)
    //     );
    //     jarWhitelistETH.emergencyWithdraw(address(dummyToken), 0);
    // }

    // ===== Duplicate NFT Gate Tests =====

    // Test that the constructor reverts if duplicate NFT addresses are provided.
    function testConstructorDuplicateNFTGates() public {
        address[] memory dupAddresses = new address[](2);
        dupAddresses[0] = address(dummyERC721);
        dupAddresses[1] = address(dummyERC721); // duplicate
        CookieJarLib.NFTType[] memory dupTypes = new CookieJarLib.NFTType[](2);
        dupTypes[0] = CookieJarLib.NFTType.ERC721;
        dupTypes[1] = CookieJarLib.NFTType.ERC721;
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector));
        new CookieJar(
            owner,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            dupAddresses,
            dupTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            config.minETHDeposit,
            config.feePercentageOnDeposit,
            true,
            config.defaultFeeCollector,
            true, // emergencyWithdrawalEnabled
            true,
            emptyWhitelist
        );
    }

    // Test that addNFTGate reverts if the NFT address is already added.
    function testAddDuplicateNFTGate() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector));
        jarNFTETHFixed.addNFTGate(address(dummyERC721), CookieJarLib.NFTType.ERC721);
    }

    // // ===== New Test: Emergency Withdrawal Disabled =====

    // // Test that emergency withdrawal reverts when the feature is disabled.
    // function testEmergencyWithdrawDisabled() public {
    //     // Create a jar with emergency withdrawal disabled.
    //     CookieJar jarDisabled = new CookieJar(
    //         owner,
    //         address(3),
    //         /// @dev address(3) for ETH jars.
    //         CookieJarLib.AccessType.Whitelist,
    //         emptyAddresses,
    //         emptyTypes,
    //         CookieJarLib.WithdrawalTypeOptions.Variable,
    //         0,
    //         maxWithdrawal,
    //         withdrawalInterval,
    //         strictPurpose,
    //         true, // emergencyWithdrawalEnabled
    //         true,
    //         "Test Metadata"
    //     );

    //     vm.deal(address(jarDisabled), 5 ether);
    //     vm.prank(owner);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             CookieJarLib.EmergencyWithdrawalDisabled.selector
    //         )
    //     );
    //     jarDisabled.emergencyWithdraw(address(0), 1 ether);
    // }
}
