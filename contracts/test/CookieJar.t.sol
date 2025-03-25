// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJar.sol";

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
    CookieJar public jarWhitelist;
    CookieJar public jarNFT;
    address public admin = address(0xABCD);
    address public feeCollector = address(0xFEED);
    address public user = address(0xBEEF);
    address public attacker = address(0xBAD);
    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;

    DummyERC20 public token;
    DummyERC721 public dummyERC721;
    DummyERC1155 public dummyERC1155;

    function setUp() public {
        // Deploy dummy tokens
        token = new DummyERC20();
        dummyERC721 = new DummyERC721();
        dummyERC1155 = new DummyERC1155();

        // --- Create a CookieJar in Whitelist mode ---
        // For Whitelist mode, NFT arrays are ignored.
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        jarWhitelist = new CookieJar(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true // emergencyWithdrawalEnabled
        );

        // --- Create a CookieJar in NFTGated mode with one approved NFT gate (ERC721) ---
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        jarNFT = new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true // emergencyWithdrawalEnabled
        );
    }

    // ===== Existing Tests =====

    // Test deposit ETH with fee deduction (1% fee)
    function testDepositETH() public {
        uint256 depositValue = 1 ether;
        vm.deal(user, 10 ether);
        vm.prank(user);
        uint256 feeBalanceBefore = feeCollector.balance;
        jarWhitelist.deposit{value: depositValue}();
        // Contract receives deposit minus fee
        assertEq(address(jarWhitelist).balance, depositValue - (depositValue / 100));
        // Fee collector gets fee
        assertEq(feeCollector.balance, feeBalanceBefore + depositValue / 100);
    }

    // Zero-value ETH deposit should do nothing.
    function testDepositETHZero() public {
        vm.prank(user);
        jarWhitelist.deposit{value: 0}();
        assertEq(address(jarWhitelist).balance, 0);
    }

    // Test deposit token using DummyERC20 (fee deducted as 1%)
    function testDepositToken() public {
        uint256 depositAmount = 1000 * 1e18;
        token.mint(user, depositAmount);
        vm.prank(user);
        token.approve(address(jarWhitelist), depositAmount);
        uint256 fee = depositAmount / 100;
        uint256 expectedDeposit = depositAmount - fee;
        uint256 feeCollectorBalanceBefore = token.balanceOf(feeCollector);
        vm.prank(user);
        jarWhitelist.depositToken(address(token), depositAmount);
        assertEq(token.balanceOf(feeCollector), feeCollectorBalanceBefore + fee);
        assertEq(token.balanceOf(address(jarWhitelist)), expectedDeposit);
    }

    // ===== Admin Function Tests =====

    // updateWhitelist (only admin, in Whitelist mode)
    function testUpdateWhitelist() public {
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        bool allowed = jarWhitelist.whitelist(user);
        assertTrue(allowed);
    }

    // updateWhitelist should revert if called by non-admin.
    function testUpdateWhitelistNonAdmin() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
        jarWhitelist.updateWhitelist(user, true);
    }

    // In NFT mode, updateWhitelist should revert (invalid access type).
    function testUpdateWhitelistNFTMode() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidAccessType.selector));
        jarNFT.updateWhitelist(user, true);
    }

    // updateBlacklist (only admin)
    function testUpdateBlacklist() public {
        vm.prank(admin);
        jarWhitelist.updateBlacklist(user, true);
        bool isBlacklisted = jarWhitelist.blacklist(user);
        assertTrue(isBlacklisted);
    }

    // updateFeeCollector: only feeCollector can update.
    function testUpdateFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(feeCollector);
        jarWhitelist.updateFeeCollector(newCollector);
        assertEq(jarWhitelist.feeCollector(), newCollector);
    }

    // updateFeeCollector should revert when not called by feeCollector.
    function testUpdateFeeCollectorNotAuthorized() public {
        address newCollector = address(0x1234);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotFeeCollector.selector));
        jarWhitelist.updateFeeCollector(newCollector);
    }

    // addNFTGate in NFTGated mode works and limits maximum gates.
    function testAddNFTGate() public {
        // In jarNFT (NFT mode) add a new NFT gate using dummyERC1155.
        vm.prank(admin);
        jarNFT.addNFTGate(address(1), uint8(CookieJar.NFTType.ERC1155));
        // Add additional NFT gates to reach the limit.
        vm.prank(admin);
        jarNFT.addNFTGate(address(2), uint8(CookieJar.NFTType.ERC1155));
        vm.prank(admin);
        jarNFT.addNFTGate(address(3), uint8(CookieJar.NFTType.ERC1155));
        vm.prank(admin);
        jarNFT.addNFTGate(address(4), uint8(CookieJar.NFTType.ERC1155));
        // This would be the 6th gate so it must revert.
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.MaxNFTGatesReached.selector));
        jarNFT.addNFTGate(address(5), uint8(CookieJar.NFTType.ERC1155));
    }

    // ===== Constructor Edge Cases =====

    // NFTGated mode: Mismatched NFT arrays should revert.
    function testNFTArrayLengthMismatch() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](2);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        nftTypes[1] = uint8(CookieJar.NFTType.ERC1155);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NFTArrayLengthMismatch.selector));
        new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // NFTGated mode: More than 5 NFT addresses should revert.
    function testMaxNFTGatesReachedInConstructor() public {
        address[] memory nftAddresses = new address[](6);
        uint8[] memory nftTypes = new uint8[](6);
        for (uint256 i = 0; i < 6; i++) {
            nftAddresses[i] = address(dummyERC721);
            nftTypes[i] = uint8(CookieJar.NFTType.ERC721);
        }
        vm.expectRevert(abi.encodeWithSelector(CookieJar.MaxNFTGatesReached.selector));
        new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // NFTGated mode: Providing an NFT gate with a zero address should revert.
    function testInvalidNFTGateInConstructor() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(0);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidNFTGate.selector));
        new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // ===== New Test Cases for New Validations =====

    // Test that the constructor reverts if admin is the zero address.
    function testConstructorInvalidAdmin() public {
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.AdminCannotBeZeroAddress.selector));
        new CookieJar(
            address(0),
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // Test that the constructor reverts if an invalid NFT type (>2) is provided.
    function testConstructorInvalidNFTType() public {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = 3; // Invalid NFT type
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidNFTType.selector));
        new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // Test that addNFTGate reverts if an invalid NFT type (>2) is provided.
    function testAddNFTGateInvalidNFTType() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidNFTType.selector));
        jarNFT.addNFTGate(address(0xDEAD), 3);
    }

    // Test that updateAdmin reverts if the new admin address is zero.
    function testUpdateAdminWithZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.AdminCannotBeZeroAddress.selector));
        jarWhitelist.updateAdmin(address(0));
    }

    // ===== New Test for NFT Gate Mapping Optimization =====

    // Test that after adding a new NFT gate via addNFTGate, the optimized mapping lookup works
    // by performing a withdrawal using the newly added NFT gate.
    function testWithdrawNFTModeAfterAddGateMapping() public {
        // Use dummyERC1155 as a new NFT gate (not present in the constructor)
        vm.prank(admin);
        jarNFT.addNFTGate(address(dummyERC1155), uint8(CookieJar.NFTType.ERC1155));
        // Mint an NFT token (ERC1155) for the user.
        dummyERC1155.mint(user, 1, 1);
        // Fund jarNFT with ETH.
        vm.deal(address(jarNFT), 10 ether);
        // Advance time to satisfy timelock.
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        // Withdrawal should now succeed using dummyERC1155 as the NFT gate.
        vm.prank(user);
        jarNFT.withdrawNFTMode(address(0), fixedAmount, purpose, address(dummyERC1155), 1);
        assertEq(address(jarNFT).balance, 10 ether - fixedAmount);
    }

    // ===== Withdrawal Tests (Whitelist Mode) =====

    // Successful ETH withdrawal in fixed mode.
    function testWithdrawWhitelistETHFixed() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Withdrawal for a legitimate purpose!";
        vm.prank(user);
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
        assertEq(address(jarWhitelist).balance, 10 ether - fixedAmount);
    }

    // Revert if user is not whitelisted.
    function testWithdrawWhitelistNotWhitelisted() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAuthorized.selector));
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
    }

    // Revert if user is blacklisted.
    function testWithdrawWhitelistBlacklisted() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.prank(admin);
        jarWhitelist.updateBlacklist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.Blacklisted.selector));
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
    }

    // Revert if the purpose string is too short.
    function testWithdrawWhitelistShortPurpose() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory shortPurpose = "Too short";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidPurpose.selector));
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, shortPurpose);
    }

    // Revert if withdrawal is attempted too soon.
    function testWithdrawWhitelistTooSoon() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
        uint nextAllowed = jarWhitelist.lastWithdrawalWhitelist(user) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.WithdrawalTooSoon.selector, nextAllowed));
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
    }

    // Revert if the withdrawal amount does not match the fixed amount.
    function testWithdrawWhitelistWrongAmountFixed() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount));
        jarWhitelist.withdrawWhitelistMode(address(0), wrongAmount, purpose);
    }

    // Revert if contract balance is insufficient.
    function testWithdrawWhitelistInsufficientBalance() public {
        vm.deal(address(jarWhitelist), fixedAmount - 0.1 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarWhitelist.withdrawWhitelistMode(address(0), fixedAmount, purpose);
    }

    // Revert if ERC20 token balance is insufficient in Whitelist mode.
    function testWithdrawWhitelistERC20InsufficientBalance() public {
        uint256 tokenFund = fixedAmount - 100;
        token.mint(address(jarWhitelist), tokenFund);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarWhitelist.withdrawWhitelistMode(address(token), fixedAmount, purpose);
    }

    // Successful ERC20 withdrawal in Whitelist mode.
    function testWithdrawWhitelistERC20Fixed() public {
        uint256 tokenAmount = 1000 * 1e18;
        token.mint(address(jarWhitelist), tokenAmount);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarWhitelist.withdrawWhitelistMode(address(token), fixedAmount, purpose);
        assertEq(token.balanceOf(user), fixedAmount);
    }

    // ===== Zero Amount Withdrawal Tests =====

    // Revert if zero ETH withdrawal is attempted in Whitelist mode.
    function testWithdrawWhitelistZeroAmountETH() public {
        vm.deal(address(jarWhitelist), 10 ether);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarWhitelist.withdrawWhitelistMode(address(0), 0, "Valid purpose description exceeding 20.");
    }

    // Revert if zero ERC20 withdrawal is attempted in Whitelist mode.
    function testWithdrawWhitelistZeroAmountERC20() public {
        uint256 tokenAmount = 1000 * 1e18;
        token.mint(address(jarWhitelist), tokenAmount);
        vm.prank(admin);
        jarWhitelist.updateWhitelist(user, true);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarWhitelist.withdrawWhitelistMode(address(token), 0, "Valid purpose description exceeding 20.");
    }

    // ===== Withdrawal Tests (NFTGated Mode) =====

    // Successful ETH withdrawal in NFT mode using an ERC721 token.
    function testWithdrawNFTModeETHFixedERC721() public {
        vm.deal(address(jarNFT), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarNFT.withdrawNFTMode(address(0), fixedAmount, purpose, address(dummyERC721), tokenId);
        assertEq(address(jarNFT).balance, 10 ether - fixedAmount);
    }

    // Calling withdrawNFTMode on a Whitelist-mode jar should revert.
    function testWithdrawNFTModeInvalidAccessType() public {
        uint256 tokenId = 0;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidAccessType.selector));
        jarWhitelist.withdrawNFTMode(address(0), fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Revert if an unapproved NFT gate address is provided.
    function testWithdrawNFTModeInvalidNFTGate() public {
        uint256 tokenId = 0;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidNFTGate.selector));
        jarNFT.withdrawNFTMode(address(0), fixedAmount, "Valid purpose description exceeding 20.", attacker, tokenId);
    }

    // Revert if the caller does not own the NFT (ERC721).
    function testWithdrawNFTModeNotOwnerERC721() public {
        uint256 tokenId = dummyERC721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAuthorized.selector));
        jarNFT.withdrawNFTMode(address(0), fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Revert if the purpose string is too short in NFT mode.
    function testWithdrawNFTModeShortPurpose() public {
        vm.deal(address(jarNFT), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InvalidPurpose.selector));
        jarNFT.withdrawNFTMode(address(0), fixedAmount, "short purpose", address(dummyERC721), tokenId);
    }

    // Revert if the NFT withdrawal is attempted before the timelock expires.
    function testWithdrawNFTModeTooSoon() public {
        vm.deal(address(jarNFT), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        jarNFT.withdrawNFTMode(address(0), fixedAmount, purpose, address(dummyERC721), tokenId);
        bytes32 key = keccak256(abi.encodePacked(dummyERC721, tokenId));
        uint nextAllowed = jarNFT.lastWithdrawalNFT(key) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.WithdrawalTooSoon.selector, nextAllowed));
        jarNFT.withdrawNFTMode(address(0), fixedAmount, purpose, address(dummyERC721), tokenId);
    }

    // Revert if the withdrawal amount does not match the fixed amount in NFT mode.
    function testWithdrawNFTModeWrongAmountFixed() public {
        vm.deal(address(jarNFT), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount));
        jarNFT.withdrawNFTMode(address(0), wrongAmount, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Revert if the jarNFT does not have enough ETH.
    function testWithdrawNFTModeInsufficientBalance() public {
        vm.deal(address(jarNFT), fixedAmount - 0.1 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarNFT.withdrawNFTMode(address(0), fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Successful ERC20 withdrawal in NFT mode.
    function testWithdrawNFTModeERC20() public {
        uint256 tokenAmount = 1000 * 1e18;
        token.mint(address(jarNFT), tokenAmount);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarNFT.withdrawNFTMode(address(token), fixedAmount, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
        assertEq(token.balanceOf(user), fixedAmount);
    }

    // ===== Emergency Withdrawal Tests =====

    // Emergency withdrawal of ETH by admin in Whitelist mode.
    function testEmergencyWithdrawETHWhitelist() public {
        uint256 fundAmount = 5 ether;
        vm.deal(address(jarWhitelist), fundAmount);
        vm.deal(admin, 0);
        uint256 withdrawAmount = 2 ether;
        vm.prank(admin);
        jarWhitelist.emergencyWithdraw(address(0), withdrawAmount);
        assertEq(address(jarWhitelist).balance, fundAmount - withdrawAmount);
        assertEq(admin.balance, withdrawAmount);
    }

    // Emergency withdrawal of ERC20 tokens by admin in Whitelist mode.
    function testEmergencyWithdrawERC20Whitelist() public {
        uint256 tokenFund = 1000 * 1e18;
        token.mint(address(jarWhitelist), tokenFund);
        assertEq(token.balanceOf(address(jarWhitelist)), tokenFund);
        uint256 withdrawAmount = 200 * 1e18;
        vm.prank(admin);
        jarWhitelist.emergencyWithdraw(address(token), withdrawAmount);
        assertEq(token.balanceOf(address(jarWhitelist)), tokenFund - withdrawAmount);
        assertEq(token.balanceOf(admin), withdrawAmount);
    }

    // Emergency withdrawal should revert when called by a non-admin.
    function testEmergencyWithdrawNonAdmin() public {
        vm.deal(address(jarWhitelist), 5 ether);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
        jarWhitelist.emergencyWithdraw(address(0), 1 ether);

        token.mint(address(jarWhitelist), 1000 * 1e18);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
        jarWhitelist.emergencyWithdraw(address(token), 100 * 1e18);
    }

    // Emergency withdrawal should revert if jar balance is insufficient (ETH).
    function testEmergencyWithdrawInsufficientBalanceETH() public {
        vm.deal(address(jarWhitelist), 1 ether);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarWhitelist.emergencyWithdraw(address(0), 2 ether);
    }

    // Revert if ERC20 token balance is insufficient in NFT-gated mode.
    function testWithdrawNFTModeERC20InsufficientBalance() public {
        uint256 tokenFund = fixedAmount - 100;
        token.mint(address(jarNFT), tokenFund);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        string memory purpose = "Valid purpose description exceeding 20.";
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarNFT.withdrawNFTMode(address(token), fixedAmount, purpose, address(dummyERC721), tokenId);
    }

    // Revert if zero ETH withdrawal is attempted in NFT-gated mode.
    function testWithdrawNFTModeZeroAmountETH() public {
        vm.deal(address(jarNFT), 10 ether);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarNFT.withdrawNFTMode(address(0), 0, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Revert if zero ERC20 withdrawal is attempted in NFT-gated mode.
    function testWithdrawNFTModeZeroAmountERC20() public {
        uint256 tokenAmount = 1000 * 1e18;
        token.mint(address(jarNFT), tokenAmount);
        uint256 tokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarNFT.withdrawNFTMode(address(token), 0, "Valid purpose description exceeding 20.", address(dummyERC721), tokenId);
    }

    // Emergency withdrawal should revert if jar balance is insufficient (ERC20).
    function testEmergencyWithdrawInsufficientBalanceERC20() public {
        uint256 tokenFund = 500 * 1e18;
        token.mint(address(jarWhitelist), tokenFund);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.InsufficientBalance.selector));
        jarWhitelist.emergencyWithdraw(address(token), 600 * 1e18);
    }

    // ===== Emergency Withdrawal Zero Amount Tests =====

    // Revert if zero ETH emergency withdrawal is attempted.
    function testEmergencyWithdrawZeroAmountETH() public {
        vm.deal(address(jarWhitelist), 5 ether);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarWhitelist.emergencyWithdraw(address(0), 0);
    }

    // Revert if zero ERC20 emergency withdrawal is attempted.
    function testEmergencyWithdrawZeroAmountERC20() public {
        uint256 tokenFund = 1000 * 1e18;
        token.mint(address(jarWhitelist), tokenFund);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.ZeroWithdrawal.selector));
        jarWhitelist.emergencyWithdraw(address(token), 0);
    }

    // ===== Duplicate NFT Gate Tests =====

    // Test that the constructor reverts if duplicate NFT addresses are provided.
    function testConstructorDuplicateNFTGates() public {
        address[] memory nftAddresses = new address[](2);
        nftAddresses[0] = address(dummyERC721);
        nftAddresses[1] = address(dummyERC721); // duplicate
        uint8[] memory nftTypes = new uint8[](2);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        nftTypes[1] = uint8(CookieJar.NFTType.ERC721);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.DuplicateNFTGate.selector));
        new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true
        );
    }

    // Test that addNFTGate reverts if the NFT address is already added.
    function testAddDuplicateNFTGate() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.DuplicateNFTGate.selector));
        jarNFT.addNFTGate(address(dummyERC721), uint8(CookieJar.NFTType.ERC721));
    }

    // ===== Admin Transfer Tests =====

    // Test that the admin can update their address.
    function testUpdateAdmin() public {
        address newAdmin = address(0xC0DE);
        vm.prank(admin);
        jarWhitelist.updateAdmin(newAdmin);
        assertEq(jarWhitelist.admin(), newAdmin);
    }

    // Test that non-admin cannot update admin.
    function testUpdateAdminNotAuthorized() public {
        address newAdmin = address(0xC0DE);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.NotAdmin.selector));
        jarWhitelist.updateAdmin(newAdmin);
    }

    // ===== New Test: Emergency Withdrawal Disabled =====

    // Test that emergency withdrawal reverts when the feature is disabled.
    function testEmergencyWithdrawDisabled() public {
        // Create a jar with emergency withdrawal disabled.
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        CookieJar jarDisabled = new CookieJar(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            false // emergencyWithdrawalEnabled disabled
        );
        vm.deal(address(jarDisabled), 5 ether);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(CookieJar.EmergencyWithdrawalDisabled.selector));
        jarDisabled.emergencyWithdraw(address(0), 1 ether);
    }
}
