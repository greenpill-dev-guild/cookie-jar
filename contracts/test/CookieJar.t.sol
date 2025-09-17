// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CookieJar.sol";
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
    CookieJar public jarAllowlistETHFixed;
    CookieJar public jarAllowlistERC20Fixed;
    CookieJar public jarNFTETHFixed;
    CookieJar public jarNFTERC20Variable;
    CookieJar public jarAllowlistETHOneTimeWithdrawal;
    CookieJar public jarNFTERC20OneTimeWithdrawal;
    CookieJar public jarAllowlistETHVariable;
    CookieJar public jarAllowlistERC20Variable;
    CookieJar public jarNFTETHVariable;
    CookieJar public jarNFTERC20Fixed;

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
    address[] public emptyAllowlist;
    string public purpose = "Withdrawal for a legitimate purpose!";
    string public shortPurpose = "Too short";

    uint256 public minETHDeposit = 100 wei;
    uint256 public minERC20Deposit = 100;
    uint256 public feePercentageOnDeposit = 1000;
    address public feeCollector = address(0xFEE);

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

    // Helper function to create AccessConfig struct
    function createAccessConfig(
        address[] memory _nftAddresses,
        CookieJarLib.NFTType[] memory _nftTypes,
        address[] memory _allowlist
    ) internal pure returns (CookieJarLib.AccessConfig memory) {
        return CookieJarLib.AccessConfig({
            nftAddresses: _nftAddresses,
            nftTypes: _nftTypes,
            allowlist: _allowlist,
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
    }

    function setUp() public {
        dummyToken = new DummyERC20();
        dummyERC721 = new DummyERC721();
        dummyERC1155 = new DummyERC1155();

        users = new address[](2);
        users[0] = user;
        users[1] = user2;

        emptyAddresses = new address[](0);
        emptyTypes = new CookieJarLib.NFTType[](0);
        emptyAllowlist = new address[](0);

        nftAddresses = new address[](2);
        nftAddresses[0] = address(dummyERC721);
        nftAddresses[1] = address(dummyERC1155);
        nftTypes = new CookieJarLib.NFTType[](2);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        nftTypes[1] = CookieJarLib.NFTType.ERC1155;

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        jarAllowlistETHFixed = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawalEnabled
            ),
            createAccessConfig(emptyAddresses, emptyTypes, emptyAllowlist)
        );

        jarAllowlistERC20Fixed = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawalEnabled
            ),
            createAccessConfig(emptyAddresses, emptyTypes, emptyAllowlist)
        );

        jarNFTETHFixed = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
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
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarNFTERC20Variable = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                false, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarAllowlistETHVariable = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Variable,
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
            createAccessConfig(emptyAddresses, emptyTypes, emptyAllowlist)
        );

        jarAllowlistERC20Variable = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Allowlist,
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
            createAccessConfig(emptyAddresses, emptyTypes, emptyAllowlist)
        );

        jarNFTETHVariable = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Variable,
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
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarAllowlistETHOneTimeWithdrawal = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                true // oneTimeWithdrawal
            ),
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarNFTERC20OneTimeWithdrawal = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // emergencyWithdrawalEnabled
                true // oneTimeWithdrawal
            ),
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarNFTERC20Fixed = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
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
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );

        jarAllowlistETHFixed.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarAllowlistERC20Fixed), 1000 * 1e18);
        jarAllowlistERC20Fixed.depositCurrency(1000 * 1e18);
        jarNFTETHFixed.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20Variable), 1000 * 1e18);
        jarNFTERC20Variable.depositCurrency(1000 * 1e18);
        jarAllowlistETHOneTimeWithdrawal.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20OneTimeWithdrawal), 1000 * 1e18);
        jarNFTERC20OneTimeWithdrawal.depositCurrency(1000 * 1e18);
        jarAllowlistETHVariable.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarAllowlistERC20Variable), 1000 * 1e18);
        jarAllowlistERC20Variable.depositCurrency(1000 * 1e18);
        jarNFTETHVariable.depositETH{value: 1000 ether}();
        dummyToken.approve(address(jarNFTERC20Fixed), 1000 * 1e18);
        jarNFTERC20Fixed.depositCurrency(1000 * 1e18);
        vm.stopPrank();
    }

    // ==== constructor tests ====

    function test_ConstructorAllowlistETHFixed() public {
        CookieJar newJarAllowlistETHFixed = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(emptyAddresses, emptyTypes, users)
        );

        assertEq(newJarAllowlistETHFixed.feeCollector(), feeCollector);
        assertEq(newJarAllowlistETHFixed.feePercentageOnDeposit(), feePercentageOnDeposit);
        assertEq(newJarAllowlistETHFixed.minDeposit(), minETHDeposit);
        assertEq(newJarAllowlistETHFixed.withdrawalInterval(), withdrawalInterval);
        assertFalse(newJarAllowlistETHFixed.strictPurpose());
        assertTrue(newJarAllowlistETHFixed.emergencyWithdrawalEnabled());
        assertFalse(newJarAllowlistETHFixed.oneTimeWithdrawal());
        assertEq(newJarAllowlistETHFixed.getAllowlist().length, 2);
        assertEq(newJarAllowlistETHFixed.getAllowlist()[0], user);
        assertEq(newJarAllowlistETHFixed.getAllowlist()[1], user2);
        assertEq(newJarAllowlistETHFixed.getNFTGatesArray().length, 0);
        assertEq(newJarAllowlistETHFixed.getWithdrawalDataArray().length, 0);
        assertEq(newJarAllowlistETHFixed.currency(), CookieJarLib.ETH_ADDRESS);
        assertTrue(newJarAllowlistETHFixed.accessType() == CookieJarLib.AccessType.Allowlist);
        assertTrue(newJarAllowlistETHFixed.withdrawalOption() == CookieJarLib.WithdrawalTypeOptions.Fixed);
        assertEq(newJarAllowlistETHFixed.fixedAmount(), fixedAmount);
        assertEq(newJarAllowlistETHFixed.maxWithdrawal(), maxWithdrawal);
        assertEq(newJarAllowlistETHFixed.currencyHeldByJar(), 0);
        assertTrue(newJarAllowlistETHFixed.hasRole(keccak256("JAR_OWNER"), owner));
    }

    function test_ConstructorNFTGatedERC20Variable() public {
        CookieJar newJarNFTGatedERC20Variable = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minERC20Deposit,
                feePercentageOnDeposit,
                true, // strictPurpose
                feeCollector,
                false, // emergencyWithdrawalEnabled
                true // oneTimeWithdrawal
            ),
            createAccessConfig(nftAddresses, nftTypes, emptyAddresses)
        );

        assertEq(newJarNFTGatedERC20Variable.feeCollector(), feeCollector);
        assertEq(newJarNFTGatedERC20Variable.feePercentageOnDeposit(), feePercentageOnDeposit);
        assertEq(newJarNFTGatedERC20Variable.minDeposit(), minERC20Deposit);
        assertEq(newJarNFTGatedERC20Variable.withdrawalInterval(), withdrawalInterval);
        assertTrue(newJarNFTGatedERC20Variable.strictPurpose());
        assertFalse(newJarNFTGatedERC20Variable.emergencyWithdrawalEnabled());
        assertTrue(newJarNFTGatedERC20Variable.oneTimeWithdrawal());
        assertEq(newJarNFTGatedERC20Variable.getAllowlist().length, 0);
        assertEq(newJarNFTGatedERC20Variable.getNFTGatesArray().length, 2);
        assertEq(newJarNFTGatedERC20Variable.getNFTGatesArray()[0].nftAddress, address(dummyERC721));
        assertTrue(newJarNFTGatedERC20Variable.getNFTGatesArray()[0].nftType == CookieJarLib.NFTType.ERC721);
        assertEq(newJarNFTGatedERC20Variable.getNFTGatesArray()[1].nftAddress, address(dummyERC1155));
        assertTrue(newJarNFTGatedERC20Variable.getNFTGatesArray()[1].nftType == CookieJarLib.NFTType.ERC1155);
        assertEq(newJarNFTGatedERC20Variable.getWithdrawalDataArray().length, 0);
        assertEq(newJarNFTGatedERC20Variable.currency(), address(dummyToken));
        assertTrue(newJarNFTGatedERC20Variable.accessType() == CookieJarLib.AccessType.NFTGated);
        assertTrue(newJarNFTGatedERC20Variable.withdrawalOption() == CookieJarLib.WithdrawalTypeOptions.Variable);
        assertEq(newJarNFTGatedERC20Variable.fixedAmount(), fixedAmount);
        assertEq(newJarNFTGatedERC20Variable.maxWithdrawal(), maxWithdrawal);
        assertEq(newJarNFTGatedERC20Variable.currencyHeldByJar(), 0);
        assertTrue(newJarNFTGatedERC20Variable.hasRole(keccak256("JAR_OWNER"), owner));
    }

    function test_RevertWhen_ConstructorWithInvalidOwner() public {
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.AdminCannotBeZeroAddress.selector));
        new CookieJar(
            createJarConfig(
                address(0), // invalid owner
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(emptyAddresses, emptyTypes, users)
        );
    }

    function test_RevertWhen_ConstructorWithInvalidFeeCollector() public {
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.FeeCollectorAddressCannotBeZeroAddress.selector));
        new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                address(0), // invalid fee collector
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(emptyAddresses, emptyTypes, users)
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithEmptyNFTAddresses() public {
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NoNFTAddressesProvided.selector));
        new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(emptyAddresses, nftTypes, users) // empty NFT addresses
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithEmptyNFTTypes() public {
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTArrayLengthMismatch.selector));
        new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(nftAddresses, emptyTypes, users) // mismatched arrays
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithInvalidNFTGate() public {
        address[] memory invalidAddresses = new address[](2);
        invalidAddresses[0] = address(0);
        invalidAddresses[1] = address(dummyERC1155);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                false // oneTimeWithdrawal
            ),
            createAccessConfig(invalidAddresses, nftTypes, emptyAddresses) // invalid NFT addresses
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithDuplicateNFTGates() public {
        address[] memory dupAddresses = new address[](2);
        dupAddresses[0] = address(dummyERC721);
        dupAddresses[1] = address(dummyERC721);
        CookieJarLib.NFTType[] memory dupTypes = new CookieJarLib.NFTType[](2);
        dupTypes[0] = CookieJarLib.NFTType.ERC721;
        dupTypes[1] = CookieJarLib.NFTType.ERC721;
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector));
        new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minETHDeposit,
                feePercentageOnDeposit,
                true, // strictPurpose
                feeCollector,
                true, // emergencyWithdrawalEnabled
                true // oneTimeWithdrawal
            ),
            createAccessConfig(dupAddresses, dupTypes, emptyAllowlist) // duplicate NFT addresses
        );
    }

    // ==== admin functions tests ====

    function test_grantJarAllowlistRole() public {
        assertFalse(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertFalse(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        assertTrue(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertTrue(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        assertEq(jarAllowlistETHFixed.getAllowlist().length, 2);
        assertEq(jarAllowlistETHFixed.getAllowlist()[0], user);
        assertEq(jarAllowlistETHFixed.getAllowlist()[1], user2);
    }

    function test_RevertWhen_grantJarAllowlistRoleCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
    }

    function test_RevertWhen_grantJarAllowlistRoleCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNFTETHFixed.grantJarAllowlistRole(users);
    }

    function test_revokeJarAllowlistRole() public {
        vm.startPrank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        jarAllowlistETHFixed.revokeJarAllowlistRole(users);
        assertFalse(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertFalse(jarAllowlistETHFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        assertEq(jarAllowlistETHFixed.getAllowlist().length, 0);
    }

    function test_RevertWhen_revokeJarAllowlistRoleCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarAllowlistETHFixed.revokeJarAllowlistRole(users);
    }

    function test_RevertWhen_revokeJarAllowlistRoleCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNFTETHFixed.revokeJarAllowlistRole(users);
    }

    function test_updateFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(feeCollector);
        jarAllowlistETHFixed.updateFeeCollector(newCollector);
        assertEq(jarAllowlistETHFixed.feeCollector(), newCollector);
    }

    function test_RevertWhen_updateFeeCollectorCalledByNonFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotFeeCollector.selector));
        jarAllowlistETHFixed.updateFeeCollector(newCollector);
    }

    function test_RevertWhen_updateFeeCollectorCalledWithInvalidFeeCollector() public {
        vm.prank(feeCollector);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.FeeCollectorAddressCannotBeZeroAddress.selector));
        jarAllowlistETHFixed.updateFeeCollector(address(0));
    }

    function test_addNFTGate() public {
        uint256 nftGatesLengthBefore = jarNFTETHFixed.getNFTGatesArray().length;
        vm.startPrank(owner);
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.addNFTGate(address(2), CookieJarLib.NFTType.ERC721);
        jarNFTETHFixed.addNFTGate(CookieJarLib.ETH_ADDRESS, CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.addNFTGate(address(4), CookieJarLib.NFTType.ERC721);
        assertEq(jarNFTETHFixed.getNFTGatesArray().length, nftGatesLengthBefore + 4);
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore].nftAddress, address(1));
        assertTrue(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore].nftType == CookieJarLib.NFTType.ERC1155);
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 1].nftAddress, address(2));
        assertTrue(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 1].nftType == CookieJarLib.NFTType.ERC721);
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 2].nftAddress, CookieJarLib.ETH_ADDRESS);
        assertTrue(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 2].nftType == CookieJarLib.NFTType.ERC1155);
        assertEq(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 3].nftAddress, address(4));
        assertTrue(jarNFTETHFixed.getNFTGatesArray()[nftGatesLengthBefore + 3].nftType == CookieJarLib.NFTType.ERC721);
        vm.stopPrank();
    }

    function test_RevertWhen_addNFTGateCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
    }

    function test_RevertWhen_addNFTGateCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
    }

    function test_RevertWhen_addNFTGateCalledWithInvalidNFTType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTType.selector));
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.None);
    }

    function test_RevertWhen_addNFTGateCalledWithInvalidNFTAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        jarNFTETHFixed.addNFTGate(address(0), CookieJarLib.NFTType.ERC1155);
    }

    function test_RevertWhen_addNFTGateCalledWithDuplicateNFTGate() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector));
        jarNFTETHFixed.addNFTGate(address(dummyERC721), CookieJarLib.NFTType.ERC721);
    }

    function test_RemoveNFTGate() public {
        uint256 nftGatesLengthBefore = jarNFTETHFixed.getNFTGatesArray().length;
        vm.startPrank(owner);
        jarNFTETHFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
        jarNFTETHFixed.removeNFTGate(address(1));
        assertEq(jarNFTETHFixed.getNFTGatesArray().length, nftGatesLengthBefore);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector));
        jarNFTETHFixed.removeNFTGate(address(1));
    }

    function test_RevertWhen_RemoveNFTGateCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarNFTETHFixed.removeNFTGate(address(1));
    }

    function test_RevertWhen_RemoveNFTGateCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistETHFixed.removeNFTGate(address(1));
    }

    function test_RevertWhen_RemoveNFTGateCalledWithInvalidNFTAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector));
        jarNFTETHFixed.removeNFTGate(address(1));
    }

    function test_updateMaxWithdrawalAmount() public {
        vm.prank(owner);
        jarNFTERC20Variable.updateMaxWithdrawalAmount(1000 * 1e18);
        assertEq(jarNFTERC20Variable.maxWithdrawal(), 1000 * 1e18);
    }

    function test_RevertWhen_updateMaxWithdrawalAmountCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarNFTERC20Variable.updateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_RevertWhen_updateMaxWithdrawalAmountCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTERC20Variable.updateMaxWithdrawalAmount(0);
    }

    function test_RevertWhen_updateMaxWithdrawalAmountCalledWithFixedWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNFTETHFixed.updateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_UpdateFixedWithdrawalAmount() public {
        vm.prank(owner);
        jarNFTETHFixed.updateFixedWithdrawalAmount(1000 * 1e18);
        assertEq(jarNFTETHFixed.fixedAmount(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledWithVariableWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNFTERC20Variable.updateFixedWithdrawalAmount(1000 * 1e18);
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
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
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
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarNFTETHFixed.updateWithdrawalInterval(1000 * 1e18);
    }

    function test_emergencyWithdrawETH() public {
        uint256 jarBalanceBefore = address(jarNFTETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHFixed.currencyHeldByJar();
        assertEq(currencyHeldByJarBefore, jarBalanceBefore);
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarNFTETHFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, fixedAmount);
        assertEq(address(jarNFTETHFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNFTETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(owner.balance, ownerBalanceBefore + fixedAmount);
    }

    function test_emergencyWithdrawERC20() public {
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistERC20Fixed));
        uint256 currencyHeldByJarBefore = jarAllowlistERC20Fixed.currencyHeldByJar();
        assertEq(currencyHeldByJarBefore, jarBalanceBefore);
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarAllowlistERC20Fixed.emergencyWithdraw(address(dummyToken), fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistERC20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarAllowlistERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(owner), ownerBalanceBefore + fixedAmount);
    }

    function test_emergencyWithdrawERC20NotJarToken() public {
        dummyToken.mint(address(jarAllowlistETHFixed), fixedAmount);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistETHFixed));
        uint256 ownerBalanceBefore = dummyToken.balanceOf(owner);
        uint256 currencyHeldByJarBefore = jarAllowlistETHFixed.currencyHeldByJar();
        vm.prank(owner);
        jarAllowlistETHFixed.emergencyWithdraw(address(dummyToken), fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistETHFixed)), jarBalanceBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(owner), ownerBalanceBefore + fixedAmount);
        assertEq(jarAllowlistETHFixed.currencyHeldByJar(), currencyHeldByJarBefore);
    }

    function test_emergencyWithdrawETHNotJarToken() public {
        vm.deal(address(jarNFTERC20Fixed), fixedAmount);
        uint256 jarBalanceBefore = address(jarNFTERC20Fixed).balance;
        uint256 currencyHeldByJarBefore = jarNFTERC20Fixed.currencyHeldByJar();
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarNFTERC20Fixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, fixedAmount);
        assertEq(address(jarNFTERC20Fixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNFTERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore);
        assertEq(owner.balance, ownerBalanceBefore + fixedAmount);
    }

    function test_RevertWhen_emergencyWithdrawCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarAllowlistETHFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, 1e18);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithEmergencyWithdrawalDisabled() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.EmergencyWithdrawalDisabled.selector));
        jarNFTERC20Variable.emergencyWithdraw(address(dummyToken), 1e18);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithInsufficientBalance() public {
        uint256 jarBalanceBefore = address(jarNFTETHFixed).balance;
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        jarNFTETHFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, jarBalanceBefore + 1);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, 0);
    }

    // ===== Deposit Tests =====

    function test_DepositETH() public {
        uint256 feeBalanceBefore = feeCollector.balance;
        uint256 jarwhitebalanceBefore = address(jarAllowlistETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarAllowlistETHFixed.currencyHeldByJar();
        vm.deal(user, minETHDeposit);
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistETHFixed.depositETH{value: minETHDeposit}();
        uint256 fee = ((jarAllowlistETHFixed.feePercentageOnDeposit() * minETHDeposit) / CookieJarLib.PERCENTAGE_BASE);
        uint256 amountMinusFee = minETHDeposit - fee;
        assertEq(address(jarAllowlistETHFixed).balance, jarwhitebalanceBefore + amountMinusFee);
        assertEq(feeCollector.balance, feeBalanceBefore + fee);
        assertEq(jarAllowlistETHFixed.currencyHeldByJar(), currencyHeldByJarBefore + amountMinusFee);
        assertEq(user.balance, userBalanceBefore - minETHDeposit);
    }

    function test_RevertWhen_DepositETHWithLessThanMinAmount() public {
        vm.deal(user, minETHDeposit - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.LessThanMinimumDeposit.selector));
        jarAllowlistETHFixed.depositETH{value: minETHDeposit - 1}();
    }

    function test_RevertWhen_DepositETHWithZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistETHFixed.depositETH{value: 0}();
    }

    function test_RevertWhen_DepositETHWithInvalidTokenAddress() public {
        vm.deal(user, 10 ether);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidTokenAddress.selector));
        jarAllowlistERC20Fixed.depositETH{value: 10 ether}();
    }

    function test_DepositCurrency() public {
        dummyToken.mint(user, fixedAmount);

        uint256 feeBalanceBefore = dummyToken.balanceOf(feeCollector);
        uint256 currencyHeldByJarBefore = jarAllowlistERC20Fixed.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistERC20Fixed));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.startPrank(user);
        dummyToken.approve(address(jarAllowlistERC20Fixed), fixedAmount);
        jarAllowlistERC20Fixed.depositCurrency(fixedAmount);
        vm.stopPrank();
        uint256 fee = ((jarAllowlistERC20Fixed.feePercentageOnDeposit() * fixedAmount) / CookieJarLib.PERCENTAGE_BASE);
        uint256 amountMinusFee = fixedAmount - fee;
        assertEq(dummyToken.balanceOf(feeCollector), feeBalanceBefore + fee);
        assertEq(dummyToken.balanceOf(address(jarAllowlistERC20Fixed)), jarBalanceBefore + amountMinusFee);
        assertEq(jarAllowlistERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore + amountMinusFee);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore - fixedAmount);
    }

    function test_RevertWhen_DepositCurrencyWithLessThanMinAmount() public {
        dummyToken.mint(user, minERC20Deposit - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.LessThanMinimumDeposit.selector));
        jarAllowlistERC20Fixed.depositCurrency(minERC20Deposit - 1);
    }

    function test_RevertWhen_DepositCurrencyWithZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistERC20Fixed.depositCurrency(0);
    }

    function test_RevertWhen_DepositCurrencyWithInvalidTokenAddress() public {
        deal(address(dummyToken), user, fixedAmount);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidTokenAddress.selector));
        jarAllowlistETHFixed.depositCurrency(fixedAmount);
    }

    // ===== Withdrawal Tests (Allowlist Mode) =====

    function test_WithdrawAllowlistETHFixed() public {
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistETHFixed.currencyHeldByJar();
        uint256 initialBalance = address(jarAllowlistETHFixed).balance;
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistETHFixed.withdrawAllowlistMode(fixedAmount, purpose);
        assertEq(address(jarAllowlistETHFixed).balance, initialBalance - fixedAmount);
        assertEq(jarAllowlistETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        assertEq(jarAllowlistETHFixed.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistERC20Fixed() public {
        vm.prank(owner);
        jarAllowlistERC20Fixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistERC20Fixed.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistERC20Fixed));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarAllowlistERC20Fixed.withdrawAllowlistMode(fixedAmount, purpose);
        assertEq(jarAllowlistERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistERC20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarAllowlistERC20Fixed.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistETHVariable() public {
        vm.prank(owner);
        jarAllowlistETHVariable.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistETHVariable.currencyHeldByJar();
        uint256 initialBalance = address(jarAllowlistETHVariable).balance;
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistETHVariable.withdrawAllowlistMode(maxWithdrawal, purpose);
        assertEq(address(jarAllowlistETHVariable).balance, initialBalance - maxWithdrawal);
        assertEq(jarAllowlistETHVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        assertEq(jarAllowlistETHVariable.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistERC20Variable() public {
        vm.prank(owner);
        jarAllowlistERC20Variable.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistERC20Variable.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistERC20Variable));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarAllowlistERC20Variable.withdrawAllowlistMode(maxWithdrawal, purpose);
        assertEq(jarAllowlistERC20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(dummyToken.balanceOf(address(jarAllowlistERC20Variable)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarAllowlistERC20Variable.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawAllowlistWrongAccessType() public {
        vm.prank(owner);
        jarNFTETHFixed.grantRole(CookieJarLib.JAR_ALLOWLISTED, user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNFTETHFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNotAllowlisted() public {
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_ALLOWLISTED
            )
        );
        jarAllowlistETHFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistAmountZero() public {
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistETHFixed.withdrawAllowlistMode(0, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistShortPurpose() public {
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarAllowlistETHFixed.withdrawAllowlistMode(fixedAmount, shortPurpose);
    }

    function test_RevertWhen_WithdrawAllowlistAlreadyWithdrawn() public {
        vm.prank(owner);
        jarAllowlistETHOneTimeWithdrawal.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarAllowlistETHOneTimeWithdrawal.withdrawAllowlistMode(fixedAmount, purpose);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarAllowlistETHOneTimeWithdrawal.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistTooSoon() public {
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarAllowlistETHFixed.withdrawAllowlistMode(fixedAmount, purpose);
        uint256 nextAllowed = jarAllowlistETHFixed.lastWithdrawalAllowlist(user) + withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarAllowlistETHFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistWrongAmountFixed() public {
        vm.prank(owner);
        jarAllowlistETHFixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarAllowlistETHFixed.withdrawAllowlistMode(wrongAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistInsufficientBalance() public {
        vm.prank(owner);
        CookieJar newJar = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Variable,
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
            createAccessConfig(emptyAddresses, emptyTypes, emptyAllowlist)
        );
        vm.prank(owner);
        newJar.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        newJar.withdrawAllowlistMode(maxWithdrawal, purpose);
    }

    // ===== Withdrawal Tests (NFTGated Mode) =====

    function test_WithdrawNFTModeETHFixedERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNFTETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHFixed.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        assertEq(address(jarNFTETHFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNFTETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        assertEq(jarNFTETHFixed.lastWithdrawalNFT(address(dummyERC721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeETHFixedERC1155() public {
        uint256 dummyTokenId = 1;
        dummyERC1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNFTETHFixed).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHFixed.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC1155), dummyTokenId);
        assertEq(address(jarNFTETHFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNFTETHFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        assertEq(jarNFTETHFixed.lastWithdrawalNFT(address(dummyERC1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeETHVariableERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNFTETHVariable).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHVariable.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNFTETHVariable.withdrawNFTMode(maxWithdrawal, purpose, address(dummyERC721), dummyTokenId);
        assertEq(address(jarNFTETHVariable).balance, jarBalanceBefore - maxWithdrawal);
        assertEq(jarNFTETHVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        assertEq(jarNFTETHVariable.lastWithdrawalNFT(address(dummyERC721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeETHVariableERC1155() public {
        uint256 dummyTokenId = 1;
        dummyERC1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNFTETHVariable).balance;
        uint256 currencyHeldByJarBefore = jarNFTETHVariable.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNFTETHVariable.withdrawNFTMode(maxWithdrawal, purpose, address(dummyERC1155), dummyTokenId);
        assertEq(address(jarNFTETHVariable).balance, jarBalanceBefore - maxWithdrawal);
        assertEq(jarNFTETHVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        assertEq(jarNFTETHVariable.lastWithdrawalNFT(address(dummyERC1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20FixedERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNFTERC20Fixed));
        uint256 currencyHeldByJarBefore = jarNFTERC20Fixed.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNFTERC20Fixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        assertEq(dummyToken.balanceOf(address(jarNFTERC20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarNFTERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        assertEq(jarNFTERC20Fixed.lastWithdrawalNFT(address(dummyERC721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20FixedERC1155() public {
        uint256 dummyTokenId = 1;
        dummyERC1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNFTERC20Fixed));
        uint256 currencyHeldByJarBefore = jarNFTERC20Fixed.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNFTERC20Fixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC1155), dummyTokenId);
        assertEq(dummyToken.balanceOf(address(jarNFTERC20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarNFTERC20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        assertEq(jarNFTERC20Fixed.lastWithdrawalNFT(address(dummyERC1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20VariableERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNFTERC20Variable));
        uint256 currencyHeldByJarBefore = jarNFTERC20Variable.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNFTERC20Variable.withdrawNFTMode(maxWithdrawal, purpose, address(dummyERC721), dummyTokenId);
        assertEq(dummyToken.balanceOf(address(jarNFTERC20Variable)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarNFTERC20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(jarNFTERC20Variable.lastWithdrawalNFT(address(dummyERC721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20VariableERC1155() public {
        uint256 dummyTokenId = 1;
        dummyERC1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNFTERC20Variable));
        uint256 currencyHeldByJarBefore = jarNFTERC20Variable.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNFTERC20Variable.withdrawNFTMode(maxWithdrawal, purpose, address(dummyERC1155), dummyTokenId);
        assertEq(dummyToken.balanceOf(address(jarNFTERC20Variable)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarNFTERC20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(jarNFTERC20Variable.lastWithdrawalNFT(address(dummyERC1155), dummyTokenId), block.timestamp);
    }

    function test_RevertWhen_WithdrawNFTModeInvalidAccessType() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), 1);
    }

    function test_RevertWhen_WithdrawNFTModeInvalidNFTGate() public {
        DummyERC721 newDummyERC721 = new DummyERC721();
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        jarNFTERC20Fixed.withdrawNFTMode(fixedAmount, purpose, address(newDummyERC721), 1);
    }

    function test_RevertWhen_WithdrawNFTModeNotOwnerERC721() public {
        uint256 dummyTokenId = dummyERC721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarNFTETHFixed.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeNotOwnerERC1155() public {
        uint256 dummyTokenId = 1;
        dummyERC1155.mint(attacker, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarNFTETHVariable.withdrawNFTMode(fixedAmount, purpose, address(dummyERC1155), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeAmountZero() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNFTETHFixed.withdrawNFTMode(0, purpose, address(dummyERC721), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeShortPurpose() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarNFTERC20Fixed.withdrawNFTMode(fixedAmount, shortPurpose, address(dummyERC721), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeAlreadyWithdrawn() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarNFTERC20OneTimeWithdrawal.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawNFTModeTooSoon() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarNFTERC20Variable.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
        uint256 nextAllowed = jarNFTERC20Variable.lastWithdrawalNFT(address(dummyERC721), dummyTokenId) +
            withdrawalInterval;
        vm.prank(user);
        skip(100);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarNFTERC20Variable.withdrawNFTMode(fixedAmount, purpose, address(dummyERC721), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeWrongAmountFixed() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarNFTERC20Fixed.withdrawNFTMode(wrongAmount, purpose, address(dummyERC721), dummyTokenId);
    }

    function test_RevertWhen_WithdrawNFTModeInsufficientBalance() public {
        uint256 dummyTokenId = dummyERC721.mint(user);
        vm.prank(owner);
        CookieJar newJar = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.NFTGated,
                CookieJarLib.WithdrawalTypeOptions.Variable,
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
            createAccessConfig(nftAddresses, nftTypes, emptyAllowlist)
        );
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        newJar.withdrawNFTMode(maxWithdrawal, purpose, address(dummyERC721), dummyTokenId);
    }
}
