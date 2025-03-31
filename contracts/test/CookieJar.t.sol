// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJarRegistry.sol";
import "../src/CookieJar.sol";
import "../script/HelperConfig.s.sol";
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
    uint256 public nextTokenId;

    constructor() ERC721("Dummy721", "D721") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        nextTokenId++;
        return tokenId;
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
    CookieJar public jarNFTETH;
    CookieJar public jarWhitelistERC20;
    CookieJar public jarNFTERC20;
    address public owner = address(0xABCD);
    address public user = address(0xBEEF);
    address public user2 = address(0xC0DE);
    address public attacker = address(0xBAD);
    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;

    DummyERC20 public token;
    DummyERC721 public dummyERC721;
    DummyERC1155 public dummyERC1155;
    address[] public users;
    bool[] public statuses;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getAnvilConfig();
        // Deploy dummy tokens
        token = new DummyERC20();
        dummyERC721 = new DummyERC721();
        dummyERC1155 = new DummyERC1155();
        users = new address[](2);
        users[0] = user;
        users[1] = user2;
        deal(address(token), address(owner), 100_000 ether);
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
        vm.deal(user, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(owner, 200 ether);
        // --- Create a CookieJar in Whitelist mode ---
        // For Whitelist mode, NFT arrays are ignored.
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        factory.depositMinETH{value: 20e18}();
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
                    "Test Metadata"
                )
            )
        );
        console.log(
            "JAR WHITELIST ETH BALANCE WHILE CREATION",
            address(jarWhitelistETH).balance
        );
        token.approve(address(factory), 1000e18);
        factory.depositMinERC20(1000e18, address(token));
        jarWhitelistERC20 = CookieJar(
            payable(
                factory.createCookieJar(
                    owner,
                    address(token),
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
                    "Test Metadata"
                )
            )
        );
        console.log(
            "JAR WHITELIST ERC20 BALANCE WHILE CREATION",
            ERC20(token).balanceOf(address(jarWhitelistERC20))
        );
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);

        // --- Create a CookieJar in NFTGated mode with one approved NFT gate (ERC721) ---

        factory.depositMinETH{value: 100 ether}();
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
                    "Test Metadata"
                )
            )
        );
        console.log(
            "JAR NFT ETH BALANCE WHILE CREATION",
            address(jarNFTETH).balance
        );

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

    // Test deposit token using DummyERC20 (fee deducted as 1%)
    function testDepositToken() public {
        uint256 depositAmount = 1000 * 1e18;
        deal(address(token), user, depositAmount);
        vm.startPrank(user);

        uint256 feeBalanceBefore = ERC20(token).balanceOf(
            config.defaultFeeCollector
        );
        uint256 currencyHeldByJarBefore = jarWhitelistERC20.currencyHeldByJar();
        uint256 jarBalanceBefore = ERC20(token).balanceOf(
            address(jarWhitelistERC20)
        );
        token.approve(address(jarWhitelistERC20), depositAmount);
        jarWhitelistERC20.depositCurrency(depositAmount);
        assertEq(
            ERC20(token).balanceOf(config.defaultFeeCollector),
            feeBalanceBefore +
                ((jarWhitelistETH.feePercentageOnDeposit() * depositAmount) /
                    100)
        );
        assertEq(
            ERC20(token).balanceOf(address(jarWhitelistERC20)),
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
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAdmin.selector));
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
        address[] memory nftAddresses = new address[](6);
        uint8[] memory nftTypes = new uint8[](6);
        for (uint256 i = 0; i < 6; i++) {
            nftAddresses[i] = address(dummyERC721);
            nftTypes[i] = uint8(CookieJarLib.NFTType.ERC721);
        }
        factory.depositMinETH{value: 20e18}();
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.MaxNFTGatesReached.selector)
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
            "Test Metadata"
        );
    }

    // NFTGated mode: Providing an NFT gate with a zero address should revert.
    function testInvalidNFTGateInConstructor() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJarLib.NFTType.ERC721);

        factory.depositMinETH{value: 20e18}();
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector)
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
            "Test Metadata"
        );
    }

    // ===== New Test Cases for New Validations =====

    // Test that the constructor reverts if an invalid NFT type (>2) is provided.
    function testConstructorInvalidNFTType() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = 3; // Invalid NFT type
        factory.depositMinETH{value: 20e18}();
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

        // Mint an NFT token (ERC1155) for the user.
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
            abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector)
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
        assertEq(token.balanceOf(user), fixedAmount);
        assertEq(
            jarWhitelistERC20.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // ===== Withdrawal Tests (NFTGated Mode) =====

    // Successful ETH withdrawal in NFT mode using an ERC721 token.
    function testWithdrawNFTModeETHFixedERC721() public {
        vm.deal(address(jarNFTETH), 10 ether);
        console.log("Initial jar balance:", address(jarNFTETH).balance);

        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 balanceBefore = address(jarNFTETH).balance;
        uint256 currencyHeldByJarBefore = jarNFTETH.currencyHeldByJar();
        vm.prank(user);
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC721),
            tokenId
        );
        assertEq(address(jarNFTETH).balance, balanceBefore - fixedAmount);
        assertEq(
            jarNFTETH.currencyHeldByJar(),
            currencyHeldByJarBefore - fixedAmount
        );
    }

    // Revert if the caller does not own the NFT (ERC721).
    function testWithdrawNFTModeNotOwnerERC721() public {
        uint256 tokenId = dummyERC721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            tokenId
        );
    }

    // Revert if the purpose string is too short in NFT mode.
    function testWithdrawNFTModeShortPurpose() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "short purpose",
            address(dummyERC721),
            tokenId
        );
    }

    // Revert if the NFT withdrawal is attempted before the timelock expires.
    function testWithdrawNFTModeTooSoon() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            purpose,
            address(dummyERC721),
            tokenId
        );
        bytes32 key = keccak256(abi.encodePacked(dummyERC721, tokenId));
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
            tokenId
        );
    }

    // Revert if the withdrawal amount does not match the fixed amount in NFT mode.
    function testWithdrawNFTModeWrongAmountFixed() public {
        vm.deal(address(jarNFTETH), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
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
            tokenId
        );
    }

    // Revert if the jarNFTETH does not have enough ETH.
    function testWithdrawNFTModeInsufficientBalance() public {
        vm.deal(address(jarNFTETH), fixedAmount - 0.1 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector)
        );
        jarNFTETH.withdrawNFTMode(
            fixedAmount,
            "Valid purpose description exceeding 20.",
            address(dummyERC721),
            tokenId
        );
    }

    // // Successful ERC20 withdrawal in NFT mode.
    // function testWithdrawNFTModeERC20() public {
    //     uint256 tokenAmount = 1000 * 1e18;
    //     token.mint(address(jarNFTETH), tokenAmount);
    //     uint256 tokenId = dummyERC721.mint(user);
    //     vm.warp(block.timestamp + withdrawalInterval + 1);
    //     vm.prank(user);
    //     jarNFTERC20.withdrawNFTMode(
    //         fixedAmount,
    //         "Valid purpose description exceeding 20.",
    //         address(dummyERC721),
    //         tokenId
    //     );
    //     assertEq(token.balanceOf(user), fixedAmount);
    // }

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

    //     // Emergency withdrawal of ERC20 tokens by admin in Whitelist mode.
    //     function testEmergencyWithdrawERC20Whitelist() public {
    //         uint256 tokenFund = 1000 * 1e18;
    //         token.mint(address(jarWhitelistETH), tokenFund);
    //         assertEq(token.balanceOf(address(jarWhitelistETH)), tokenFund);
    //         uint256 withdrawAmount = 200 * 1e18;
    //         vm.prank(admin);
    //         jarWhitelistETH.emergencyWithdraw(address(token), withdrawAmount);
    //         assertEq(
    //             token.balanceOf(address(jarWhitelistETH)),
    //             tokenFund - withdrawAmount
    //         );
    //         assertEq(token.balanceOf(admin), withdrawAmount);
    //     }

    //     // Emergency withdrawal should revert when called by a non-admin.
    //     function testEmergencyWithdrawNonAdmin() public {
    //         vm.deal(address(jarWhitelistETH), 5 ether);
    //         vm.prank(attacker);
    //         vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
    //         jarWhitelistETH.emergencyWithdraw(address(0), 1 ether);

    //         token.mint(address(jarWhitelistETH), 1000 * 1e18);
    //         vm.prank(attacker);
    //         vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
    //         jarWhitelistETH.emergencyWithdraw(address(token), 100 * 1e18);
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

    //     // Revert if ERC20 token balance is insufficient in NFT-gated mode.
    //     function testWithdrawNFTModeERC20InsufficientBalance() public {
    //         uint256 tokenFund = fixedAmount - 100;
    //         token.mint(address(jarNFTETH), tokenFund);
    //         uint256 tokenId = dummyERC721.mint(user);
    //         vm.warp(block.timestamp + withdrawalInterval + 1);
    //         string memory purpose = "Valid purpose description exceeding 20.";
    //         vm.prank(user);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.InsufficientBalance.selector)
    //         );
    //         jarNFTETH.withdrawNFTMode(
    //             address(token),
    //             fixedAmount,
    //             purpose,
    //             address(dummyERC721),
    //             tokenId
    //         );
    //     }

    //     // Revert if zero ETH withdrawal is attempted in NFT-gated mode.
    //     function testWithdrawNFTModeZeroAmountETH() public {
    //         vm.deal(address(jarNFTETH), 10 ether);
    //         uint256 tokenId = dummyERC721.mint(user);
    //         vm.warp(block.timestamp + withdrawalInterval + 1);
    //         vm.prank(user);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //         );
    //         jarNFTETH.withdrawNFTMode(
    //             address(0),
    //             0,
    //             "Valid purpose description exceeding 20.",
    //             address(dummyERC721),
    //             tokenId
    //         );
    //     }

    //     // Revert if zero ERC20 withdrawal is attempted in NFT-gated mode.
    //     function testWithdrawNFTModeZeroAmountERC20() public {
    //         uint256 tokenAmount = 1000 * 1e18;
    //         token.mint(address(jarNFTETH), tokenAmount);
    //         uint256 tokenId = dummyERC721.mint(user);
    //         vm.warp(block.timestamp + withdrawalInterval + 1);
    //         vm.prank(user);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //         );
    //         jarNFTETH.withdrawNFTMode(
    //             address(token),
    //             0,
    //             "Valid purpose description exceeding 20.",
    //             address(dummyERC721),
    //             tokenId
    //         );
    //     }

    //     // Emergency withdrawal should revert if jar balance is insufficient (ERC20).
    //     function testEmergencyWithdrawInsufficientBalanceERC20() public {
    //         uint256 tokenFund = 500 * 1e18;
    //         token.mint(address(jarWhitelistETH), tokenFund);
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.InsufficientBalance.selector)
    //         );
    //         jarWhitelistETH.emergencyWithdraw(address(token), 600 * 1e18);
    //     }

    //     // ===== Emergency Withdrawal Zero Amount Tests =====

    //     // Revert if zero ETH emergency withdrawal is attempted.
    //     function testEmergencyWithdrawZeroAmountETH() public {
    //         vm.deal(address(jarWhitelistETH), 5 ether);
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //         );
    //         jarWhitelistETH.emergencyWithdraw(address(0), 0);
    //     }

    //     // Revert if zero ERC20 emergency withdrawal is attempted.
    //     function testEmergencyWithdrawZeroAmountERC20() public {
    //         uint256 tokenFund = 1000 * 1e18;
    //         token.mint(address(jarWhitelistETH), tokenFund);
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector)
    //         );
    //         jarWhitelistETH.emergencyWithdraw(address(token), 0);
    //     }

    //     // ===== Duplicate NFT Gate Tests =====

    //     // Test that the constructor reverts if duplicate NFT addresses are provided.
    //     function testConstructorDuplicateNFTGates() public {
    //         address[] memory nftAddresses = new address[](2);
    //         nftAddresses[0] = address(dummyERC721);
    //         nftAddresses[1] = address(dummyERC721); // duplicate
    //         uint8[] memory nftTypes = new uint8[](2);
    //         nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
    //         nftTypes[1] = uint8(CookieJar.NFTType.ERC721);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.DuplicateNFTGate.selector)
    //         );
    //         new CookieJar{value: 100 ether}(
    //             admin,
    //             CookieJar.AccessType.NFTGated,
    //             nftAddresses,
    //             nftTypes,
    //             CookieJar.WithdrawalTypeOptions.Fixed,
    //             fixedAmount,
    //             maxWithdrawal,
    //             withdrawalInterval,
    //             strictPurpose,
    //             feeCollector,
    //             true
    //         );
    //     }

    //     // Test that addNFTGate reverts if the NFT address is already added.
    //     function testAddDuplicateNFTGate() public {
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(CookieJar.DuplicateNFTGate.selector)
    //         );
    //         jarNFTETH.addNFTGate(
    //             address(dummyERC721),
    //             uint8(CookieJar.NFTType.ERC721)
    //         );
    //     }

    //     // ===== Admin Transfer Tests =====

    //     // Test that the admin can update their address.
    //     function testUpdateAdmin() public {
    //         address newAdmin = address(0xC0DE);
    //         vm.prank(admin);
    //         jarWhitelistETH.updateAdmin(newAdmin);
    //         assertEq(jarWhitelistETH.admin(), newAdmin);
    //     }

    //     // Test that non-admin cannot update admin.
    //     function testUpdateAdminNotAuthorized() public {
    //         address newAdmin = address(0xC0DE);
    //         vm.prank(attacker);
    //         vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
    //         jarWhitelistETH.updateAdmin(newAdmin);
    //     }

    //     // ===== New Test: Emergency Withdrawal Disabled =====

    //     // Test that emergency withdrawal reverts when the feature is disabled.
    //     function testEmergencyWithdrawDisabled() public {
    //         // Create a jar with emergency withdrawal disabled.
    //         address[] memory emptyAddresses = new address[](0);
    //         uint8[] memory emptyTypes = new uint8[](0);
    //         CookieJar jarDisabled = new CookieJar{value: 100 wei}(
    //             admin,
    //             CookieJar.AccessType.Whitelist,
    //             emptyAddresses,
    //             emptyTypes,
    //             CookieJar.WithdrawalTypeOptions.Fixed,
    //             fixedAmount,
    //             maxWithdrawal,
    //             withdrawalInterval,
    //             strictPurpose,
    //             feeCollector,
    //             false // emergencyWithdrawalEnabled disabled
    //         );
    //         vm.deal(address(jarDisabled), 5 ether);
    //         vm.prank(admin);
    //         vm.expectRevert(
    //             abi.encodeWithSelector(
    //                 CookieJar.EmergencyWithdrawalDisabled.selector
    //             )
    //         );
    //         jarDisabled.emergencyWithdraw(address(0), 1 ether);
    //     }
}
