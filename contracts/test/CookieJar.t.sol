// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJarRegistry.sol";
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

    CookieJarRegistry public registry;

    CookieJar public jarWhitelistETH;
    CookieJar public jarWhitelistERC20;
    CookieJar public jarNFTETH;
    CookieJar public jarNFTERC20;
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
    uint8[] public emptyTypes;
    address[] public nftAddresses;
    uint8[] public nftTypes;

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
        emptyTypes = new uint8[](0);

        nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        registry = new CookieJarRegistry();
        factory = new CookieJarFactory(
            config.defaultFeeCollector,
            address(registry),
            owner,
            config.feePercentageOnDeposit,
            config.minETHDeposit,
            config.minERC20Deposit
        );
        // Let the registry know which factory is authorized.
        registry.setCookieJarFactory(address(factory));

        // --- Create a CookieJar in Whitelist mode ---
        // For Whitelist mode, NFT arrays are ignored.
        jarWhitelistETH = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
                    /// @dev address(3) for ETH jars.
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
                    "Test Metadata"
                )
            )
        );

        jarWhitelistERC20 = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(dummyToken),
                    /// @dev address(3) for ETH jars.
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
                    "Test Metadata"
                )
            )
        );

        // --- Create a CookieJar in NFTGated mode with one approved NFT gate (ERC721) ---
        jarNFTETH = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
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
                    false,
                    "Test Metadata"
                )
            )
        );

        jarNFTERC20 = CookieJar(
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
                    false,
                    "Test Metadata"
                )
            )
        );

        jarWhitelistETHOneTimeWithdrawal = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(3),
                    /// @dev address(3) for ETH jars.
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
                    "Test Metadata"
                )
            )
        );

        jarWhitelistETH.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarWhitelistERC20), 1000 * 1e18);
        jarWhitelistERC20.depositCurrency(1000 * 1e18);
        jarNFTETH.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20), 1000 * 1e18);
        jarNFTERC20.depositCurrency(1000 * 1e18);
        jarWhitelistETHOneTimeWithdrawal.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20OneTimeWithdrawal), 1000 * 1e18);
        jarNFTERC20OneTimeWithdrawal.depositCurrency(1000 * 1e18);
        vm.stopPrank();
    }

    //     // ===== Existing Tests =====

    // Test deposit ETH with fee deduction (1% fee)
    function testDepositETH() public {
        uint256 depositValue = 100 wei;
        vm.prank(user);
        uint256 feeBalanceBefore = config.defaultFeeCollector.balance;
        uint256 jarwhitebalanceinit = address(jarWhitelistETH).balance;
        uint256 currencyHeldByJarBefore = jarWhitelistETH.currencyHeldByJar();
        jarWhitelistETH.depositETH{value: depositValue}();
        // Contract receives deposit minus fee
        assertEq(
            address(jarWhitelistETH).balance,
            jarwhitebalanceinit +
                (depositValue -
                    ((jarWhitelistETH.feePercentageOnDeposit() * depositValue) /
                        100)),
            "error in contract recieving money"
        );
        // Fee collector gets fee
        assertEq(
            config.defaultFeeCollector.balance,
            feeBalanceBefore +
                ((jarWhitelistETH.feePercentageOnDeposit() * depositValue) /
                    100),
            "error in fee collector getting fee"
        );
        // Currency held by jar increases
        assertEq(
            jarWhitelistETH.currencyHeldByJar(),
            currencyHeldByJarBefore +
                (depositValue -
                    ((jarWhitelistETH.feePercentageOnDeposit() * depositValue) /
                        100))
        );
    }

    // Test deposit dummyToken using DummyERC20 (fee deducted as 1%)
    function testDepositdummyToken() public {
        uint256 depositAmount = 1000 * 1e18;
        deal(address(dummyToken), user, depositAmount);
        vm.startPrank(user);

        uint256 feeBalanceBefore = ERC20(dummyToken).balanceOf(
            config.defaultFeeCollector
        );
        uint256 currencyHeldByJarBefore = jarWhitelistERC20.currencyHeldByJar();
        uint256 jarBalanceBefore = ERC20(dummyToken).balanceOf(
            address(jarWhitelistERC20)
        );
        dummyToken.approve(address(jarWhitelistERC20), depositAmount);
        jarWhitelistERC20.depositCurrency(depositAmount);
        assertEq(
            ERC20(dummyToken).balanceOf(config.defaultFeeCollector),
            feeBalanceBefore +
                ((jarWhitelistETH.feePercentageOnDeposit() * depositAmount) /
                    100)
        );
        assertEq(
            ERC20(dummyToken).balanceOf(address(jarWhitelistERC20)),
            jarBalanceBefore +
                (depositAmount -
                    ((jarWhitelistETH.feePercentageOnDeposit() *
                        depositAmount) / 100))
        );
        assertEq(
            jarWhitelistERC20.currencyHeldByJar(),
            currencyHeldByJarBefore +
                (depositAmount -
                    ((jarWhitelistETH.feePercentageOnDeposit() *
                        depositAmount) / 100))
        );
        vm.stopPrank();
    }

    // ===== Admin Function Tests =====

    // updateWhitelist (only admin, in Whitelist mode)
    function testUpdateWhitelist() public {
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        bool allowed = jarWhitelistETH.hasRole(
            keccak256("JAR_WHITELISTED"),
            user
        );
        assertTrue(allowed);
    }

    // updateWhitelist should revert if called by non-admin.
    function testUpdateWhitelistNonAdmin() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, CookieJarLib.JAR_OWNER));
        jarWhitelistETH.grantJarWhitelistRole(users);
    }

    // In NFT mode, updateWhitelist should revert (invalid access type).
    function testUpdateWhitelistNFTMode() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector)
        );
        jarNFTETH.grantJarWhitelistRole(users);
    }

    // updateBlacklist (only admin)
    function testUpdateBlacklist() public {
        vm.prank(owner);
        jarWhitelistETH.grantJarBlacklistRole(users);
        bool isBlacklisted = jarWhitelistETH.hasRole(
            keccak256("JAR_BLACKLISTED"),
            user
        );
        assertTrue(isBlacklisted);
    }

    // updateFeeCollector: only feeCollector can update.
    function testUpdateFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(config.defaultFeeCollector);
        jarWhitelistETH.updateFeeCollector(newCollector);
        assertEq(jarWhitelistETH.feeCollector(), newCollector);
    }

    // updateFeeCollector should revert when not called by feeCollector.
    function testUpdateFeeCollectorNotAuthorized() public {
        address newCollector = address(0x1234);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.NotFeeCollector.selector)
        );
        jarWhitelistETH.updateFeeCollector(newCollector);
    }

    // addNFTGate in NFTGated mode works and limits maximum gates.
    function testAddNFTGate() public {
        // In jarNFTETH (NFT mode) add a new NFT gate using dummyERC1155.
        vm.startPrank(owner);
        jarNFTETH.addNFTGate(address(1), uint8(CookieJarLib.NFTType.ERC1155));
        // Add additional NFT gates to reach the limit.
        jarNFTETH.addNFTGate(address(2), uint8(CookieJarLib.NFTType.ERC1155));
        jarNFTETH.addNFTGate(address(3), uint8(CookieJarLib.NFTType.ERC1155));
        jarNFTETH.addNFTGate(address(4), uint8(CookieJarLib.NFTType.ERC1155));
        // This would be the 6th gate so it must revert.

        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.MaxNFTGatesReached.selector)
        );
        jarNFTETH.addNFTGate(address(5), uint8(CookieJarLib.NFTType.ERC1155));
        vm.stopPrank();
    }

    function testRemovingNFT() public {
        // Ensure first gate addition is by admin
        vm.prank(owner);
        jarNFTETH.addNFTGate(address(1), uint8(CookieJarLib.NFTType.ERC1155));

        // Potential issue: this subsequent call might not have admin context
        // Either prank again or ensure this is called within admin context
        vm.prank(owner); // Add this line to ensure admin context
        jarNFTETH.addNFTGate(address(2), uint8(CookieJarLib.NFTType.ERC1155));

        vm.prank(owner);
        jarNFTETH.addNFTGate(address(3), uint8(CookieJarLib.NFTType.ERC1155));

        vm.prank(owner);
        jarNFTETH.addNFTGate(address(4), uint8(CookieJarLib.NFTType.ERC1155));

        vm.prank(owner);
        jarNFTETH.removeNFTGate(address(2));

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector)
        );
        jarNFTETH.removeNFTGate(address(2)); // This should revert
    }

    // ===== Constructor Edge Cases =====

    // NFTGated mode: More than 5 NFT addresses should revert.
    function testMaxNFTGatesReachedInConstructor() public {
        address[] memory invalidAddresses = new address[](6);
        uint8[] memory invalidTypes = new uint8[](6);
        for (uint256 i = 0; i < 6; i++) {
            invalidAddresses[i] = address(dummyERC721);
            invalidTypes[i] = uint8(CookieJarLib.NFTType.ERC721);
        }
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.MaxNFTGatesReached.selector)
        );

        factory.createCookieJar(
            owner,
            address(3),
            /// @dev address(3) for ETH jars.
            CookieJarLib.AccessType.NFTGated,
            invalidAddresses,
            invalidTypes,
            CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            true,
            false,
            "Test Metadata"
        );
    }

    // NFTGated mode: Providing an NFT gate with a zero address should revert.
    function testInvalidNFTGateInConstructor() public {
        address[] memory invalidAddresses = new address[](1);
        invalidAddresses[0] = address(0);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector)
        );
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
            "Test Metadata"
        );
    }

    // ===== New Test Cases for New Validations =====

    // Test that the constructor reverts if an invalid NFT type (>2) is provided.
    function testConstructorInvalidNFTType() public {
        uint8[] memory nftTypesTemp = new uint8[](1);
        nftTypes[0] = 3; // Invalid NFT type
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidNFTType.selector)
        );
        factory.createCookieJar(
            owner,
            address(3),
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
            false,
            "Test Metadata"
        );
    }

    // Test that addNFTGate reverts if an invalid NFT type (>2) is provided.
    function testAddNFTGateInvalidNFTType() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidNFTType.selector)
        );
        jarNFTETH.addNFTGate(address(0xDEAD), 3);
    }

    // Test that updateAdmin reverts if the new admin address is zero.
    function testUpdateAdminWithZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CookieJarLib.AdminCannotBeZeroAddress.selector
            )
        );
        jarWhitelistETH.transferJarOwnership(address(0));
    }

    // ===== New Test for NFT Gate Mapping Optimization =====

    // Test that after adding a new NFT gate via addNFTGate, the optimized mapping lookup works
    // by performing a withdrawal using the newly added NFT gate.
    function testWithdrawNFTModeAfterAddGateMapping() public {
        // Use dummyERC1155 as a new NFT gate (not present in the constructor)
        vm.prank(owner);
        jarNFTETH.addNFTGate(
            address(dummyERC1155),
            uint8(CookieJarLib.NFTType.ERC1155)
        );

        // Mint an NFT dummyToken (ERC1155) for the user.
        dummyERC1155.mint(user, 1, 1);
        // Fund jarNFTETH with ETH.
        vm.deal(address(jarNFTETH), 10 ether);
        // Advance time to satisfy timelock.
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        // Withdrawal should now succeed using dummyERC1155 as the NFT gate.
        uint256 currencyHeldByJarBefore = jarNFTETH.currencyHeldByJar();
        vm.prank(user);
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC1155),
            1
        );
        assertEq(address(jarNFTETH).balance, 10 ether - fixedAmount);
        assertEq(
            jarNFTETH.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // ===== Withdrawal Tests (Whitelist Mode) =====

    // Successful ETH withdrawal in fixed mode.
    function testWithdrawWhitelistETHFixed() public {
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Withdrawal for a legitimate purpose!";
        uint256 currencyHeldByJarBefore = jarWhitelistETH.currencyHeldByJar();
        uint256 initialBalance = address(jarWhitelistETH).balance;
        vm.prank(user);
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, purpose);
        assertEq(
            address(jarWhitelistETH).balance,
            initialBalance - fixedAmount
        );
        assertEq(
            jarWhitelistETH.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // Revert if user is not whitelisted.
    function testWithdrawWhitelistNotWhitelisted() public {
        vm.deal(address(jarWhitelistETH), 10 ether);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, user, CookieJarLib.JAR_WHITELISTED)
        );
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, purpose);
    }

    // Revert if user is blacklisted.
    function testWithdrawWhitelistBlacklisted() public {
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        vm.prank(owner);
        jarWhitelistETH.grantJarBlacklistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.Blacklisted.selector)
        );
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, purpose);
    }

    // Revert if the purpose string is too short.
    function testWithdrawWhitelistShortPurpose() public {
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory shortPurpose = "Too short";
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector)
        );
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, shortPurpose);
    }

    // Revert if withdrawal is attempted too soon.
    function testWithdrawWhitelistTooSoon() public {
        vm.deal(address(jarWhitelistETH), 10 ether);
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, purpose);
        uint nextAllowed = jarWhitelistETH.lastWithdrawalWhitelist(user) +
            withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(
            abi.encodeWithSelector(
                CookieJarLib.WithdrawalTooSoon.selector,
                nextAllowed
            )
        );
        jarWhitelistETH.withdrawWhitelistMode(fixedAmount, purpose);
    }

    // Revert if the withdrawal amount does not match the fixed amount.
    function testWithdrawWhitelistWrongAmountFixed() public {
        vm.deal(address(jarWhitelistETH), 10 ether);
        vm.prank(owner);
        jarWhitelistETH.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                CookieJarLib.WithdrawalAmountNotAllowed.selector,
                wrongAmount,
                fixedAmount
            )
        );
        jarWhitelistETH.withdrawWhitelistMode(wrongAmount, purpose);
    }

    // Successful ERC20 withdrawal in Whitelist mode.
    function testWithdrawWhitelistERC20Fixed() public {
        vm.prank(owner);
        jarWhitelistERC20.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 currencyHeldByJarBefore = jarWhitelistERC20.currencyHeldByJar();
        vm.prank(user);
        jarWhitelistERC20.withdrawWhitelistMode(fixedAmount, purpose);
        assertEq(dummyToken.balanceOf(user), fixedAmount);
        assertEq(
            jarWhitelistERC20.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // ===== Withdrawal Tests (NFTGated Mode) =====

    // Successful ETH withdrawal in NFT mode using an ERC721 dummyToken.
    function testWithdrawNFTModeETHFixedERC721() public {
        vm.deal(address(jarNFTETH), 10 ether);
        console.log("Initial jar balance:", address(jarNFTETH).balance);

        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 balanceBefore = address(jarNFTETH).balance;
        uint256 currencyHeldByJarBefore = jarNFTETH.currencyHeldByJar();
        vm.prank(user);
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC721),
            dummyTokenId
        );
        assertEq(address(jarNFTETH).balance, balanceBefore - fixedAmount);
        assertEq(
            jarNFTETH.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // Revert if the caller does not own the NFT (ERC721).
    function testWithdrawNFTModeNotOwnerERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Revert if the purpose string is too short in NFT mode.
    function testWithdrawNFTModeShortPurpose() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "short purpose",
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Revert if the NFT withdrawal is attempted before the timelock expires.
    function testWithdrawNFTModeTooSoon() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC721),
            dummyTokenId
        );
        bytes32 key = keccak256(abi.encodePacked(dummyERC721, dummyTokenId));
        uint nextAllowed = jarNFTETH.lastWithdrawalNFT(key) +
            withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(
            abi.encodeWithSelector(
                CookieJarLib.WithdrawalTooSoon.selector,
                nextAllowed
            )
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Revert if the withdrawal amount does not match the fixed amount in NFT mode.
    function testWithdrawNFTModeWrongAmountFixed() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                CookieJarLib.WithdrawalAmountNotAllowed.selector,
                wrongAmount,
                fixedAmount
            )
        );
        jarNFTETH.withdrawNFTMode(
            wrongAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Revert if the jarNFTETH does not have enough ETH.
    function testWithdrawNFTModeInsufficientBalance() public {
        vm.deal(address(jarNFTETH), fixedAmount - 0.1 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
        );
    }

    function testOneTimeWithdrawWhitelistModeETH() public {
        vm.prank(owner);
        jarWhitelistETHOneTimeWithdrawal.grantJarWhitelistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarWhitelistETHOneTimeWithdrawal.withdrawWhitelistMode(
            fixedAmount,
            "Valid purpose string exceeding 20 characters"
        );
        vm.expectRevert(CookieJarLib.CookieJar__WithdrawalAlreadyDone.selector);
        jarWhitelistETHOneTimeWithdrawal.withdrawWhitelistMode(
            fixedAmount,
            "Valid purpose string exceeding 20 characters"
        );
        vm.stopPrank();
    }

    function testOneTimeWithdrawNFTModeERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(
            address(jarNFTERC20OneTimeWithdrawal),
            dummyTokenAmount
        );
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(
            fixedAmount,
            "Valid purpose string exceeding 20 characters",
            address(dummyERC721),
            dummyTokenId
        );
        vm.expectRevert(CookieJarLib.CookieJar__WithdrawalAlreadyDone.selector);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(
            fixedAmount,
            "Valid purpose string exceeding 20 characters",
            address(dummyERC721),
            dummyTokenId
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
                    "Test Metadata"
                )
            )
        );
        variableJar.grantJarWhitelistRole(users);
        variableJar.depositETH{value: 3 ether}();
        vm.stopPrank();
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = variableJar.currencyHeldByJar();
        uint256 initialBalance = address(variableJar).balance;
        vm.prank(user);
        variableJar.withdrawWhitelistMode(
            1.5 ether,
            "Valid purpose string exceeding 20 characters"
        );
        assertEq(address(variableJar).balance, initialBalance - 1.5 ether);
        assertEq(
            variableJar.currencyHeldByJar(),
            currencyHeldByJarBefore - 1.5 ether
        );
    }

    // Successful ERC20 withdrawal in NFT mode.
    function testWithdrawNFTModeERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(address(jarNFTETH), dummyTokenAmount);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarNFTERC20.withdrawNFTMode(
            fixedAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
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
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.ZeroWithdrawal.selector)
        );
        jarNFTETH.withdrawNFTMode(
            0,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Revert if zero ERC20 withdrawal is attempted in NFT-gated mode.
    function testWithdrawNFTModeZeroAmountERC20() public {
        uint256 dummyTokenAmount = 1000 * 1e18;
        dummyToken.mint(address(jarNFTETH), dummyTokenAmount);
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.ZeroWithdrawal.selector)
        );
        jarNFTETH.withdrawNFTMode(
            0,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            dummyTokenId
        );
    }

    // Emergency withdrawal should revert if jar balance is insufficient (ERC20).
    function testEmergencyWithdrawInsufficientBalanceERC20() public {
        uint256 dummyTokenFund = 500 * 1e18;
        dummyToken.mint(address(jarWhitelistETH), dummyTokenFund);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, address(jarWhitelistETH), 500 * 1e18, 600 * 1e18)
        );
        jarWhitelistETH.emergencyWithdrawWithoutState(
            address(dummyToken),
            600 * 1e18
        );
    }

    function testEmergencyWithdrawInsufficientBalanceETH() public {
        uint256 dummyTokenFund = 500 * 1e18;
        vm.deal(address(jarWhitelistETH), dummyTokenFund);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector)
        );
        jarWhitelistETH.emergencyWithdrawWithoutState(
            address(3),
            600 * 1e18
        );
    }

    // // ===== Emergency Withdrawal Zero Amount Tests =====

    // // Revert if zero ETH emergency withdrawal is attempted.
    // function testEmergencyWithdrawZeroAmountETH() public {
    //     vm.deal(address(jarWhitelistETH), 5 ether);
    //     vm.prank(admin);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //     );
    //     jarWhitelistETH.emergencyWithdraw(address(0), 0);
    // }

    // // Revert if zero ERC20 emergency withdrawal is attempted.
    // function testEmergencyWithdrawZeroAmountERC20() public {
    //     uint256 dummyTokenFund = 1000 * 1e18;
    //     dummyToken.mint(address(jarWhitelistETH), dummyTokenFund);
    //     vm.prank(admin);
    //     vm.expectRevert(
    //         abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //     );
    //     jarWhitelistETH.emergencyWithdraw(address(dummyToken), 0);
    // }

    // ===== Duplicate NFT Gate Tests =====

    // Test that the constructor reverts if duplicate NFT addresses are provided.
    function testConstructorDuplicateNFTGates() public {
        address[] memory dupAddresses = new address[](2);
        dupAddresses[0] = address(dummyERC721);
        dupAddresses[1] = address(dummyERC721); // duplicate
        uint8[] memory dupTypes = new uint8[](2);
        dupTypes[0] = uint8(CookieJarLib.NFTType.ERC721);
        dupTypes[1] = uint8(CookieJarLib.NFTType.ERC721);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector)
        );
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
            true
        );
    }

    // Test that addNFTGate reverts if the NFT address is already added.
    function testAddDuplicateNFTGate() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector)
        );
        jarNFTETH.addNFTGate(
            address(dummyERC721),
            uint8(CookieJarLib.NFTType.ERC721)
        );
    }

    // ===== Admin Transfer Tests =====

    // Test that the admin can update their address.
    function testTransferOwnership() public {
        address newAdmin = address(0xC0DE);
        vm.prank(owner);
        jarWhitelistETH.transferJarOwnership(newAdmin);
        assertEq(
            jarWhitelistETH.hasRole(keccak256("JAR_OWNER"), newAdmin),
            true
        );
    }

    // Test that non-admin cannot update admin.
    function testUpdateAdminNotAuthorized() public {
        address newAdmin = address(0xC0DE);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, CookieJarLib.JAR_OWNER));
        jarWhitelistETH.transferJarOwnership(newAdmin);
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
