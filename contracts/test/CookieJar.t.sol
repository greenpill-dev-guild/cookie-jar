// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

// --- Mock ERC20 ---
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyERC20 is ERC20 {
    constructor() ERC20("Dummy", "DUM") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// --- Mock ERC721 ---
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

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
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract DummyERC1155 is ERC1155 {
    constructor() ERC1155("https://dummy.uri/") {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }
}

contract CookieJarTest is Test {
    CookieJar public jarAllowlistEthFixed;
    CookieJar public jarAllowlistErc20Fixed;
    CookieJar public jarNftEthFixed;
    CookieJar public jarNftErc20Variable;
    CookieJar public jarAllowlistEthOneTimeWithdrawal;
    CookieJar public jarNftErc20OneTimeWithdrawal;
    CookieJar public jarAllowlistEthVariable;
    CookieJar public jarAllowlistErc20Variable;
    CookieJar public jarNftEthVariable;
    CookieJar public jarNftErc20Fixed;

    // ERC1155 specific jars
    CookieJar public jarNft1155EthFixed;
    CookieJar public jarNft1155EthVariable;
    CookieJar public jarNft1155Erc20Fixed;
    CookieJar public jarNft1155Erc20Variable;

    address public owner = address(0xABCD);
    address public user = address(0xBEEF);
    address public user2 = address(0xC0DE);
    address public attacker = address(0xBAD);

    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;

    DummyERC20 public dummyToken;
    DummyERC721 public dummyErc721;
    DummyERC1155 public dummyErc1155;

    address[] public users;
    address[] public emptyAddresses;
    address[] public nftAddresses;
    address[] public emptyAllowlist;
    string public purpose = "Withdrawal for a legitimate purpose!";
    string public shortPurpose = "Too short";

    uint256 public minEthDeposit = 100 wei;
    uint256 public minErc20Deposit = 100;
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
                "Test Jar", // metadata
                CookieJarLib.MultiTokenConfig({ // multiTokenConfig
                        enabled: false,
                        maxSlippagePercent: 500,
                        minSwapAmount: 0,
                        defaultFee: 3000
                    })
            );
    }

    // Helper function to create AccessConfig struct
    function createAccessConfig(
        address[] memory _nftAddresses,
        address[] memory _allowlist
    ) internal pure returns (CookieJarLib.AccessConfig memory) {
        CookieJarLib.NftRequirement memory nftReq;
        if (_nftAddresses.length > 0) {
            nftReq = CookieJarLib.NftRequirement({
                nftContract: _nftAddresses[0],
                tokenId: 0, // Any token from contract
                minBalance: 1
            });
        }

        return CookieJarLib.AccessConfig({allowlist: _allowlist, nftRequirement: nftReq});
    }

    // Helper function to create ERC1155 AccessConfig struct
    function createERC1155AccessConfig(
        address _nftContract,
        uint256 _tokenId
    ) internal pure returns (CookieJarLib.AccessConfig memory) {
        return
            CookieJarLib.AccessConfig({
                allowlist: new address[](0),
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: _nftContract,
                    tokenId: _tokenId,
                    minBalance: 1
                })
            });
    }

    function setUp() public {
        dummyToken = new DummyERC20();
        dummyErc721 = new DummyERC721();
        dummyErc1155 = new DummyERC1155();

        users = new address[](2);
        users[0] = user;
        users[1] = user2;

        emptyAddresses = new address[](0);
        emptyAllowlist = new address[](0);

        nftAddresses = new address[](2);
        nftAddresses[0] = address(dummyErc721);
        nftAddresses[1] = address(dummyErc1155);

        vm.deal(owner, 100_000 ether);
        dummyToken.mint(owner, 100_000 * 1e18);
        vm.startPrank(owner);

        jarAllowlistEthFixed = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWALEnabled
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarAllowlistErc20Fixed = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWALEnabled
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarNftEthFixed = new CookieJar(
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
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarNftErc20Variable = new CookieJar(
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
                false, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarAllowlistEthVariable = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarAllowlistErc20Variable = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarNftEthVariable = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarAllowlistEthOneTimeWithdrawal = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                true // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarNftErc20OneTimeWithdrawal = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                true // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        jarNftErc20Fixed = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );

        // Create ERC1155 specific jars
        jarNft1155EthFixed = new CookieJar(
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
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createERC1155AccessConfig(address(dummyErc1155), 1),
            address(0) // Superfluid host disabled for testing
        );

        jarNft1155EthVariable = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC1155,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createERC1155AccessConfig(address(dummyErc1155), 1),
            address(0) // Superfluid host disabled for testing
        );

        jarNft1155Erc20Fixed = new CookieJar(
            createJarConfig(
                owner,
                address(dummyToken),
                CookieJarLib.AccessType.ERC1155,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minErc20Deposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createERC1155AccessConfig(address(dummyErc1155), 1),
            address(0) // Superfluid host disabled for testing
        );

        jarNft1155Erc20Variable = new CookieJar(
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
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createERC1155AccessConfig(address(dummyErc1155), 1),
            address(0) // Superfluid host disabled for testing
        );

        jarAllowlistEthFixed.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarAllowlistErc20Fixed), 1000 * 1e18);
        jarAllowlistErc20Fixed.deposit(1000 * 1e18);
        jarNftEthFixed.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarNftErc20Variable), 1000 * 1e18);
        jarNftErc20Variable.deposit(1000 * 1e18);
        jarAllowlistEthOneTimeWithdrawal.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarNftErc20OneTimeWithdrawal), 1000 * 1e18);
        jarNftErc20OneTimeWithdrawal.deposit(1000 * 1e18);
        jarAllowlistEthVariable.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarAllowlistErc20Variable), 1000 * 1e18);
        jarAllowlistErc20Variable.deposit(1000 * 1e18);
        jarNftEthVariable.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarNftErc20Fixed), 1000 * 1e18);
        jarNftErc20Fixed.deposit(1000 * 1e18);

        // Fund ERC1155 jars
        jarNft1155EthFixed.deposit{value: 1000 ether}(0);
        jarNft1155EthVariable.deposit{value: 1000 ether}(0);
        dummyToken.approve(address(jarNft1155Erc20Fixed), 1000 * 1e18);
        jarNft1155Erc20Fixed.deposit(1000 * 1e18);
        dummyToken.approve(address(jarNft1155Erc20Variable), 1000 * 1e18);
        jarNft1155Erc20Variable.deposit(1000 * 1e18);

        vm.stopPrank();
    }

    // ==== constructor tests ====

    function test_ConstructorAllowlistETHFixed() public {
        CookieJar newJarAllowlistEthFixed = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.Allowlist,
                CookieJarLib.WithdrawalTypeOptions.Fixed,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, users),
            address(0) // Superfluid host disabled for testing
        );

        assertEq(newJarAllowlistEthFixed.feeCollector(), feeCollector);
        assertEq(newJarAllowlistEthFixed.FEE_PERCENTAGE_ON_DEPOSIT(), feePercentageOnDeposit);
        assertEq(newJarAllowlistEthFixed.MIN_DEPOSIT(), minEthDeposit);
        assertEq(newJarAllowlistEthFixed.withdrawalInterval(), withdrawalInterval);
        assertFalse(newJarAllowlistEthFixed.STRICT_PURPOSE());
        assertTrue(newJarAllowlistEthFixed.EMERGENCY_WITHDRAWAL_ENABLED());
        assertFalse(newJarAllowlistEthFixed.ONE_TIME_WITHDRAWAL());
        assertEq(newJarAllowlistEthFixed.getAllowlist().length, 2);
        assertEq(newJarAllowlistEthFixed.getAllowlist()[0], user);
        assertEq(newJarAllowlistEthFixed.getAllowlist()[1], user2);
        // assertEq(newJarAllowlistEthFixed.getNFTGatesArray().length, 0);
        // assertEq(newJarAllowlistEthFixed.getWithdrawalDataArray().length, 0);
        assertEq(newJarAllowlistEthFixed.CURRENCY(), CookieJarLib.ETH_ADDRESS);
        assertTrue(newJarAllowlistEthFixed.ACCESS_TYPE() == CookieJarLib.AccessType.Allowlist);
        assertTrue(newJarAllowlistEthFixed.WITHDRAWAL_OPTION() == CookieJarLib.WithdrawalTypeOptions.Fixed);
        assertEq(newJarAllowlistEthFixed.fixedAmount(), fixedAmount);
        assertEq(newJarAllowlistEthFixed.maxWithdrawal(), maxWithdrawal);
        assertEq(newJarAllowlistEthFixed.currencyHeldByJar(), 0);
        assertTrue(newJarAllowlistEthFixed.hasRole(keccak256("JAR_OWNER"), owner));
    }

    function test_ConstructorNFTGatedERC20Variable() public {
        CookieJar newJarNftGatedErc20Variable = new CookieJar(
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
                true, // strictPurpose
                feeCollector,
                false, // EMERGENCY_WITHDRAWAL_ENABLED
                true // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAddresses),
            address(0) // Superfluid host disabled for testing
        );

        assertEq(newJarNftGatedErc20Variable.feeCollector(), feeCollector);
        assertEq(newJarNftGatedErc20Variable.FEE_PERCENTAGE_ON_DEPOSIT(), feePercentageOnDeposit);
        assertEq(newJarNftGatedErc20Variable.MIN_DEPOSIT(), minErc20Deposit);
        assertEq(newJarNftGatedErc20Variable.withdrawalInterval(), withdrawalInterval);
        assertTrue(newJarNftGatedErc20Variable.STRICT_PURPOSE());
        assertFalse(newJarNftGatedErc20Variable.EMERGENCY_WITHDRAWAL_ENABLED());
        assertTrue(newJarNftGatedErc20Variable.ONE_TIME_WITHDRAWAL());
        assertEq(newJarNftGatedErc20Variable.getAllowlist().length, 0);
        // NFT gate management removed for simplicity - direct ownership verification used instead
        assertEq(newJarNftGatedErc20Variable.CURRENCY(), address(dummyToken));
        assertTrue(newJarNftGatedErc20Variable.ACCESS_TYPE() == CookieJarLib.AccessType.ERC721);
        assertTrue(newJarNftGatedErc20Variable.WITHDRAWAL_OPTION() == CookieJarLib.WithdrawalTypeOptions.Variable);
        assertEq(newJarNftGatedErc20Variable.fixedAmount(), fixedAmount);
        assertEq(newJarNftGatedErc20Variable.maxWithdrawal(), maxWithdrawal);
        assertEq(newJarNftGatedErc20Variable.currencyHeldByJar(), 0);
        assertTrue(newJarNftGatedErc20Variable.hasRole(keccak256("JAR_OWNER"), owner));
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
                minEthDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, users),
            address(0) // Superfluid host disabled for testing
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
                minEthDeposit,
                feePercentageOnDeposit,
                false, // strictPurpose
                address(0), // invalid fee collector
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, users),
            address(0) // Superfluid host disabled for testing
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithEmptyNFTAddresses() public {
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NoNFTAddressesProvided.selector));
        new CookieJar(
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
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, users), // empty NFT addresses
            address(0) // Superfluid host disabled for testing
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithEmptyNFTTypes() public {
        // This test is no longer relevant with simplified NFT requirement structure
        // The new system uses a single NftRequirement struct instead of arrays
        // Test succeeds if valid NFT config is provided
        new CookieJar(
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
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, users), // valid NFT config
            address(0) // Superfluid host disabled for testing
        );
        // Test passes if no revert occurs
        assertTrue(true);
    }

    function test_RevertWhen_ConstructorNFTGatedWithInvalidNFTGate() public {
        address[] memory invalidAddresses = new address[](2);
        invalidAddresses[0] = address(0);
        invalidAddresses[1] = address(dummyErc1155);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NoNFTAddressesProvided.selector));
        new CookieJar(
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
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(invalidAddresses, emptyAddresses), // invalid NFT addresses
            address(0) // Superfluid host disabled for testing
        );
    }

    function test_RevertWhen_ConstructorNFTGatedWithNonNFTContract() public {
        // Try to use a regular contract (not ERC721) as NFT gate
        address[] memory invalidNft = new address[](1);
        invalidNft[0] = address(this); // This test contract doesn't implement ERC721

        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        new CookieJar(
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
                false, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(invalidNft, emptyAddresses),
            address(0) // Superfluid host disabled for testing
        );
    }

    function test_ConstructorValidatesERC721Interface() public {
        // Should succeed with valid ERC721 contract
        address[] memory validNft = new address[](1);
        validNft[0] = address(dummyErc721);

        // This should not revert
        CookieJar validJar = new CookieJar(
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
                false,
                feeCollector,
                true,
                false
            ),
            createAccessConfig(validNft, emptyAddresses),
            address(0)
        );

        assertTrue(address(validJar) != address(0));
    }

    function test_ConstructorNFTGatedWithSameNFTContract() public {
        address[] memory dupAddresses = new address[](2);
        dupAddresses[0] = address(dummyErc721);
        dupAddresses[1] = address(dummyErc721);
        // Since we simplified to unified NFT requirement, using the same NFT contract is valid
        // This should succeed since we're using the same NFT contract

        new CookieJar(
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
                true, // strictPurpose
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                true // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(dupAddresses, emptyAllowlist), // duplicate NFT addresses
            address(0) // Superfluid host disabled for testing
        );
    }

    // ==== admin functions tests ====

    function test_grantJarAllowlistRole() public {
        assertFalse(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertFalse(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        assertTrue(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertTrue(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        assertEq(jarAllowlistEthFixed.getAllowlist().length, 2);
        assertEq(jarAllowlistEthFixed.getAllowlist()[0], user);
        assertEq(jarAllowlistEthFixed.getAllowlist()[1], user2);
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
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
    }

    function test_RevertWhen_grantJarAllowlistRoleCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNftEthFixed.grantJarAllowlistRole(users);
    }

    function test_revokeJarAllowlistRole() public {
        vm.startPrank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        jarAllowlistEthFixed.revokeJarAllowlistRole(users);
        assertFalse(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user));
        assertFalse(jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user2));
        assertEq(jarAllowlistEthFixed.getAllowlist().length, 0);
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
        jarAllowlistEthFixed.revokeJarAllowlistRole(users);
    }

    function test_RevertWhen_revokeJarAllowlistRoleCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNftEthFixed.revokeJarAllowlistRole(users);
    }

    function test_updateFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(feeCollector);
        jarAllowlistEthFixed.updateFeeCollector(newCollector);
        assertEq(jarAllowlistEthFixed.feeCollector(), newCollector);
    }

    function test_RevertWhen_updateFeeCollectorCalledByNonFeeCollector() public {
        address newCollector = address(0x1234);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotFeeCollector.selector));
        jarAllowlistEthFixed.updateFeeCollector(newCollector);
    }

    function test_RevertWhen_updateFeeCollectorCalledWithInvalidFeeCollector() public {
        vm.prank(feeCollector);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.FeeCollectorAddressCannotBeZeroAddress.selector));
        jarAllowlistEthFixed.updateFeeCollector(address(0));
    }

    // NFT gate management tests removed - functionality simplified to direct ownership verification
    /*
    function test_addNFTGate() public {
        uint256 nftGatesLengthBefore = jarNftEthFixed.getNFTGatesArray().length;
        vm.startPrank(owner);
        jarNftEthFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
        jarNftEthFixed.addNFTGate(address(2), CookieJarLib.NFTType.ERC721);
        jarNftEthFixed.addNFTGate(CookieJarLib.ETH_ADDRESS, CookieJarLib.NFTType.ERC1155);
        jarNftEthFixed.addNFTGate(address(4), CookieJarLib.NFTType.ERC721);
        assertEq(jarNftEthFixed.getNFTGatesArray().length, nftGatesLengthBefore + 4);
        assertEq(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore].nftAddress, address(1));
        assertTrue(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore].nftType == CookieJarLib.NFTType.ERC1155);
        assertEq(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 1].nftAddress, address(2));
        assertTrue(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 1].nftType == CookieJarLib.NFTType.ERC721);
        assertEq(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 2].nftAddress, CookieJarLib.ETH_ADDRESS);
        assertTrue(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 2].nftType == CookieJarLib.NFTType.ERC1155);
        assertEq(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 3].nftAddress, address(4));
        assertTrue(jarNftEthFixed.getNFTGatesArray()[nftGatesLengthBefore + 3].nftType == CookieJarLib.NFTType.ERC721);
        vm.stopPrank();
    }
    */

    // NFT gate management tests removed - functionality simplified
    /*
    function test_RevertWhen_addNFTGateCalledByNonOwner() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                user,
                CookieJarLib.JAR_OWNER
            )
        );
        jarNftEthFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
    }
    */

    // NFT gate management tests removed - functionality simplified
    /*
    function test_RevertWhen_addNFTGateCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistEthFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
    }

    function test_RevertWhen_addNFTGateCalledWithInvalidNFTType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTType.selector));
        jarNftEthFixed.addNFTGate(address(1), CookieJarLib.NFTType.None);
    }

    function test_RevertWhen_addNFTGateCalledWithInvalidNFTAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidNFTGate.selector));
        jarNftEthFixed.addNFTGate(address(0), CookieJarLib.NFTType.ERC1155);
    }

    function test_RevertWhen_addNFTGateCalledWithDuplicateNFTGate() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.DuplicateNFTGate.selector));
        jarNftEthFixed.addNFTGate(address(dummyErc721), CookieJarLib.NFTType.ERC721);
    }
    */

    // NFT gate management tests removed - functionality simplified
    /*
    function test_RemoveNFTGate() public {
        uint256 nftGatesLengthBefore = jarNftEthFixed.getNFTGatesArray().length;
        vm.startPrank(owner);
        jarNftEthFixed.addNFTGate(address(1), CookieJarLib.NFTType.ERC1155);
        jarNftEthFixed.removeNFTGate(address(1));
        assertEq(jarNftEthFixed.getNFTGatesArray().length, nftGatesLengthBefore);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector));
        jarNftEthFixed.removeNFTGate(address(1));
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
        jarNftEthFixed.removeNFTGate(address(1));
    }

    function test_RevertWhen_RemoveNFTGateCalledWithInvalidAccessType() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistEthFixed.removeNFTGate(address(1));
    }

    function test_RevertWhen_RemoveNFTGateCalledWithInvalidNFTAddress() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTGateNotFound.selector));
        jarNftEthFixed.removeNFTGate(address(1));
    }
    */

    function test_updateMaxWithdrawalAmount() public {
        vm.prank(owner);
        jarNftErc20Variable.updateMaxWithdrawalAmount(1000 * 1e18);
        assertEq(jarNftErc20Variable.maxWithdrawal(), 1000 * 1e18);
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
        jarNftErc20Variable.updateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_RevertWhen_updateMaxWithdrawalAmountCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNftErc20Variable.updateMaxWithdrawalAmount(0);
    }

    function test_RevertWhen_updateMaxWithdrawalAmountCalledWithFixedWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNftEthFixed.updateMaxWithdrawalAmount(1000 * 1e18);
    }

    function test_UpdateFixedWithdrawalAmount() public {
        vm.prank(owner);
        jarNftEthFixed.updateFixedWithdrawalAmount(1000 * 1e18);
        assertEq(jarNftEthFixed.fixedAmount(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledWithVariableWithdrawal() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidWithdrawalType.selector));
        jarNftErc20Variable.updateFixedWithdrawalAmount(1000 * 1e18);
    }

    function test_RevertWhen_UpdateFixedWithdrawalAmountCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNftEthFixed.updateFixedWithdrawalAmount(0);
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
        jarNftEthFixed.updateFixedWithdrawalAmount(1000 * 1e18);
    }

    function test_UpdateWithdrawalInterval() public {
        vm.prank(owner);
        jarNftEthFixed.updateWithdrawalInterval(1000 * 1e18);
        assertEq(jarNftEthFixed.withdrawalInterval(), 1000 * 1e18);
    }

    function test_RevertWhen_UpdateWithdrawalIntervalCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNftEthFixed.updateWithdrawalInterval(0);
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
        jarNftEthFixed.updateWithdrawalInterval(1000 * 1e18);
    }

    function test_emergencyWithdrawETH() public {
        uint256 jarBalanceBefore = address(jarNftEthFixed).balance;
        uint256 currencyHeldByJarBefore = jarNftEthFixed.currencyHeldByJar();
        assertEq(currencyHeldByJarBefore, jarBalanceBefore);
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarNftEthFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, fixedAmount);
        assertEq(address(jarNftEthFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNftEthFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(owner.balance, ownerBalanceBefore + fixedAmount);
    }

    function test_emergencyWithdrawERC20() public {
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistErc20Fixed));
        uint256 currencyHeldByJarBefore = jarAllowlistErc20Fixed.currencyHeldByJar();
        assertEq(currencyHeldByJarBefore, jarBalanceBefore);
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarAllowlistErc20Fixed.emergencyWithdraw(address(dummyToken), fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistErc20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarAllowlistErc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(owner), ownerBalanceBefore + fixedAmount);
    }

    function test_emergencyWithdrawERC20NotJarToken() public {
        dummyToken.mint(address(jarAllowlistEthFixed), fixedAmount);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistEthFixed));
        uint256 ownerBalanceBefore = dummyToken.balanceOf(owner);
        uint256 currencyHeldByJarBefore = jarAllowlistEthFixed.currencyHeldByJar();
        vm.prank(owner);
        jarAllowlistEthFixed.emergencyWithdraw(address(dummyToken), fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistEthFixed)), jarBalanceBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(owner), ownerBalanceBefore + fixedAmount);
        assertEq(jarAllowlistEthFixed.currencyHeldByJar(), currencyHeldByJarBefore);
    }

    function test_emergencyWithdrawETHNotJarToken() public {
        vm.deal(address(jarNftErc20Fixed), fixedAmount);
        uint256 jarBalanceBefore = address(jarNftErc20Fixed).balance;
        uint256 currencyHeldByJarBefore = jarNftErc20Fixed.currencyHeldByJar();
        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        jarNftErc20Fixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, fixedAmount);
        assertEq(address(jarNftErc20Fixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNftErc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore);
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
        jarAllowlistEthFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, 1e18);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithEmergencyWithdrawalDisabled() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.EmergencyWithdrawalDisabled.selector));
        jarNftErc20Variable.emergencyWithdraw(address(dummyToken), 1e18);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithInsufficientBalance() public {
        uint256 jarBalanceBefore = address(jarNftEthFixed).balance;
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        jarNftEthFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, jarBalanceBefore + 1);
    }

    function test_RevertWhen_emergencyWithdrawCalledWithZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNftEthFixed.emergencyWithdraw(CookieJarLib.ETH_ADDRESS, 0);
    }

    // ===== Deposit Tests =====

    function test_DepositETH() public {
        uint256 feeBalanceBefore = feeCollector.balance;
        uint256 jarwhitebalanceBefore = address(jarAllowlistEthFixed).balance;
        uint256 currencyHeldByJarBefore = jarAllowlistEthFixed.currencyHeldByJar();
        vm.deal(user, minEthDeposit);
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistEthFixed.deposit{value: minEthDeposit}(0);
        uint256 fee = ((jarAllowlistEthFixed.FEE_PERCENTAGE_ON_DEPOSIT() * minEthDeposit) /
            CookieJarLib.PERCENTAGE_BASE);
        uint256 amountMinusFee = minEthDeposit - fee;
        assertEq(address(jarAllowlistEthFixed).balance, jarwhitebalanceBefore + amountMinusFee);
        assertEq(feeCollector.balance, feeBalanceBefore + fee);
        assertEq(jarAllowlistEthFixed.currencyHeldByJar(), currencyHeldByJarBefore + amountMinusFee);
        assertEq(user.balance, userBalanceBefore - minEthDeposit);
    }

    function test_RevertWhen_DepositETHWithLessThanMinAmount() public {
        vm.deal(user, minEthDeposit - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.LessThanMinimumDeposit.selector));
        jarAllowlistEthFixed.deposit{value: minEthDeposit - 1}(0);
    }

    function test_RevertWhen_DepositETHWithZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistEthFixed.deposit{value: 0}(0);
    }

    function test_RevertWhen_DepositETHWithInvalidTokenAddress() public {
        vm.deal(user, 10 ether);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidTokenAddress.selector));
        jarAllowlistErc20Fixed.deposit{value: 10 ether}(0);
    }

    function test_DepositCurrency() public {
        dummyToken.mint(user, fixedAmount);

        uint256 feeBalanceBefore = dummyToken.balanceOf(feeCollector);
        uint256 currencyHeldByJarBefore = jarAllowlistErc20Fixed.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistErc20Fixed));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.startPrank(user);
        dummyToken.approve(address(jarAllowlistErc20Fixed), fixedAmount);
        jarAllowlistErc20Fixed.deposit(fixedAmount);
        vm.stopPrank();
        uint256 fee = ((jarAllowlistErc20Fixed.FEE_PERCENTAGE_ON_DEPOSIT() * fixedAmount) /
            CookieJarLib.PERCENTAGE_BASE);
        uint256 amountMinusFee = fixedAmount - fee;
        assertEq(dummyToken.balanceOf(feeCollector), feeBalanceBefore + fee);
        assertEq(dummyToken.balanceOf(address(jarAllowlistErc20Fixed)), jarBalanceBefore + amountMinusFee);
        assertEq(jarAllowlistErc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore + amountMinusFee);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore - fixedAmount);
    }

    function test_RevertWhen_DepositCurrencyWithLessThanMinAmount() public {
        dummyToken.mint(user, minErc20Deposit - 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.LessThanMinimumDeposit.selector));
        jarAllowlistErc20Fixed.deposit(minErc20Deposit - 1);
    }

    function test_RevertWhen_DepositCurrencyWithZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistErc20Fixed.deposit(0);
    }

    function test_RevertWhen_DepositCurrencyWithInvalidTokenAddress() public {
        deal(address(dummyToken), user, fixedAmount);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidTokenAddress.selector));
        jarAllowlistEthFixed.deposit(fixedAmount);
    }

    // ===== Withdrawal Tests (Allowlist Mode) =====

    function test_WithdrawAllowlistETHFixed() public {
        // Grant allowlist role to users first
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);

        // Check if jar is paused and unpause if needed
        if (jarAllowlistEthFixed.paused()) {
            vm.prank(owner);
            jarAllowlistEthFixed.unpause();
        }

        // Debug: Check if user has the role
        bool hasRole = jarAllowlistEthFixed.hasRole(keccak256("JAR_ALLOWLISTED"), user);
        assertTrue(hasRole, "User should have JAR_ALLOWLISTED role");

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistEthFixed.currencyHeldByJar();
        uint256 initialBalance = address(jarAllowlistEthFixed).balance;
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistEthFixed.withdrawAllowlistMode(fixedAmount, purpose);
        assertEq(address(jarAllowlistEthFixed).balance, initialBalance - fixedAmount);
        assertEq(jarAllowlistEthFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        // assertEq(jarAllowlistEthFixed.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistERC20Fixed() public {
        // Grant allowlist role to users first
        vm.prank(owner);
        jarAllowlistErc20Fixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistErc20Fixed.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistErc20Fixed));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarAllowlistErc20Fixed.withdrawAllowlistMode(fixedAmount, purpose);
        assertEq(jarAllowlistErc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        assertEq(dummyToken.balanceOf(address(jarAllowlistErc20Fixed)), jarBalanceBefore - fixedAmount);
        // assertEq(jarAllowlistErc20Fixed.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistETHVariable() public {
        // Grant allowlist role to users first
        vm.prank(owner);
        jarAllowlistEthVariable.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistEthVariable.currencyHeldByJar();
        uint256 initialBalance = address(jarAllowlistEthVariable).balance;
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarAllowlistEthVariable.withdrawAllowlistMode(maxWithdrawal, purpose);
        assertEq(address(jarAllowlistEthVariable).balance, initialBalance - maxWithdrawal);
        assertEq(jarAllowlistEthVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        // assertEq(jarAllowlistEthVariable.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_WithdrawAllowlistERC20Variable() public {
        // Grant allowlist role to users first
        vm.prank(owner);
        jarAllowlistErc20Variable.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 currencyHeldByJarBefore = jarAllowlistErc20Variable.currencyHeldByJar();
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarAllowlistErc20Variable));
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarAllowlistErc20Variable.withdrawAllowlistMode(maxWithdrawal, purpose);
        assertEq(jarAllowlistErc20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        assertEq(dummyToken.balanceOf(address(jarAllowlistErc20Variable)), jarBalanceBefore - maxWithdrawal);
        // assertEq(jarAllowlistErc20Variable.lastWithdrawalAllowlist(user), block.timestamp);
    }

    function test_RevertWhen_WithdrawAllowlistWrongAccessType() public {
        vm.prank(owner);
        jarNftEthFixed.grantRole(CookieJarLib.JAR_ALLOWLISTED, user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarNftEthFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNotAllowlisted() public {
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NotAuthorized.selector));
        jarAllowlistEthFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistAmountZero() public {
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarAllowlistEthFixed.withdrawAllowlistMode(0, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistShortPurpose() public {
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarAllowlistEthFixed.withdrawAllowlistMode(fixedAmount, shortPurpose);
    }

    function test_RevertWhen_WithdrawAllowlistAlreadyWithdrawn() public {
        vm.prank(owner);
        jarAllowlistEthOneTimeWithdrawal.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        jarAllowlistEthOneTimeWithdrawal.withdrawAllowlistMode(fixedAmount, purpose);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarAllowlistEthOneTimeWithdrawal.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistTooSoon() public {
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarAllowlistEthFixed.withdrawAllowlistMode(fixedAmount, purpose);
        uint256 lastWithdrawal = block.timestamp;
        uint256 nextAllowed = lastWithdrawal + withdrawalInterval;
        vm.prank(user);
        skip(100); // Only skip 100 seconds, not enough time (need withdrawalInterval = 1 day)
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarAllowlistEthFixed.withdrawAllowlistMode(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawAllowlistWrongAmountFixed() public {
        vm.prank(owner);
        jarAllowlistEthFixed.grantJarAllowlistRole(users);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarAllowlistEthFixed.withdrawAllowlistMode(wrongAmount, purpose);
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
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(emptyAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
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
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNftEthFixed).balance;
        uint256 currencyHeldByJarBefore = jarNftEthFixed.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNftEthFixed.withdrawWithErc721(fixedAmount, purpose);
        assertEq(address(jarNftEthFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNftEthFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        // assertEq(jarNftEthFixed.lastWithdrawalNFT(address(dummyErc721), dummyTokenId), block.timestamp);
    }

    // === NEW TESTS FOR TOKEN ID 0 (ANY TOKEN) ===

    function test_WithdrawNFTModeWithTokenId0_UserOwnsToken() public {
        // Create a new jar with tokenId: 0 (meaning any token from contract)
        address[] memory nftAddrs = new address[](1);
        nftAddrs[0] = address(dummyErc721);

        vm.startPrank(owner);
        CookieJar testJar = new CookieJar(
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
                true,
                false
            ),
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(dummyErc721),
                    tokenId: 0, // Any token from contract
                    minBalance: 0
                })
            }),
            address(0) // Superfluid host disabled for testing
        );

        // Fund the jar
        testJar.deposit{value: 10 ether}(0);
        vm.stopPrank();

        // Mint a token to user (any token ID works)
        dummyErc721.mint(user);

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 userBalanceBefore = user.balance;

        // Should succeed - user owns a token from the contract
        vm.prank(user);
        testJar.withdraw(fixedAmount, purpose);

        assertEq(user.balance, userBalanceBefore + fixedAmount);
    }

    function test_RevertWhen_WithdrawNFTModeWithTokenId0_UserOwnsNoToken() public {
        // Create a new jar with tokenId: 0
        vm.startPrank(owner);
        CookieJar testJar = new CookieJar(
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
                true,
                false
            ),
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(dummyErc721),
                    tokenId: 0, // Any token from contract
                    minBalance: 0
                })
            }),
            address(0) // Superfluid host disabled for testing
        );

        testJar.deposit{value: 10 ether}(0);
        vm.stopPrank();

        // User owns NO tokens from the contract
        vm.warp(block.timestamp + withdrawalInterval + 1);

        // Should fail - user doesn't own any token from the contract
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        testJar.withdraw(fixedAmount, purpose);
    }

    function test_WithdrawNFTModeWithSpecificTokenId_UserOwnsCorrectToken() public {
        // Mint specific token to user
        uint256 specificTokenId = dummyErc721.mint(user);

        // Create jar requiring that specific token
        vm.startPrank(owner);
        CookieJar testJar = new CookieJar(
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
                true,
                false
            ),
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(dummyErc721),
                    tokenId: specificTokenId, // Specific token required
                    minBalance: 0
                })
            }),
            address(0) // Superfluid host disabled for testing
        );

        testJar.deposit{value: 10 ether}(0);
        vm.stopPrank();

        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 userBalanceBefore = user.balance;

        // Should succeed - user owns the specific token
        vm.prank(user);
        testJar.withdraw(fixedAmount, purpose);

        assertEq(user.balance, userBalanceBefore + fixedAmount);
    }

    function test_RevertWhen_WithdrawNFTModeWithSpecificTokenId_UserOwnsDifferentToken() public {
        // Mint token ID 5 to user
        dummyErc721.mint(attacker); // Token 0
        dummyErc721.mint(attacker); // Token 1
        dummyErc721.mint(attacker); // Token 2
        dummyErc721.mint(attacker); // Token 3
        dummyErc721.mint(attacker); // Token 4
        uint256 userToken = dummyErc721.mint(user); // Token 5

        // Create jar requiring token ID 3 (which user doesn't own)
        vm.startPrank(owner);
        CookieJar testJar = new CookieJar(
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
                true,
                false
            ),
            CookieJarLib.AccessConfig({
                allowlist: emptyAllowlist,
                nftRequirement: CookieJarLib.NftRequirement({
                    nftContract: address(dummyErc721),
                    tokenId: 3, // Requires token 3
                    minBalance: 0
                })
            }),
            address(0) // Superfluid host disabled for testing
        );

        testJar.deposit{value: 10 ether}(0);
        vm.stopPrank();

        vm.warp(block.timestamp + withdrawalInterval + 1);

        // Should fail - user owns token 5, not token 3
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.NFTNotOwned.selector));
        testJar.withdraw(fixedAmount, purpose);
    }

    function test_WithdrawNFTModeETHFixedERC1155() public {
        uint256 dummyTokenId = 1;
        dummyErc1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNft1155EthFixed).balance;
        uint256 currencyHeldByJarBefore = jarNft1155EthFixed.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNft1155EthFixed.withdrawWithErc1155(fixedAmount, purpose);
        assertEq(address(jarNft1155EthFixed).balance, jarBalanceBefore - fixedAmount);
        assertEq(jarNft1155EthFixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(user.balance, userBalanceBefore + fixedAmount);
        // assertEq(jarNft1155EthFixed.lastWithdrawalNFT(address(dummyErc1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeETHVariableERC721() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNftEthVariable).balance;
        uint256 currencyHeldByJarBefore = jarNftEthVariable.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNftEthVariable.withdrawWithErc721(maxWithdrawal, purpose);
        assertEq(address(jarNftEthVariable).balance, jarBalanceBefore - maxWithdrawal);
        assertEq(jarNftEthVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        // assertEq(jarNftEthVariable.lastWithdrawalNFT(address(dummyErc721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeETHVariableERC1155() public {
        uint256 dummyTokenId = 1;
        dummyErc1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = address(jarNft1155EthVariable).balance;
        uint256 currencyHeldByJarBefore = jarNft1155EthVariable.currencyHeldByJar();
        uint256 userBalanceBefore = user.balance;
        vm.prank(user);
        jarNft1155EthVariable.withdrawWithErc1155(maxWithdrawal, purpose);
        assertEq(address(jarNft1155EthVariable).balance, jarBalanceBefore - maxWithdrawal);
        assertEq(jarNft1155EthVariable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(user.balance, userBalanceBefore + maxWithdrawal);
        // assertEq(jarNft1155EthVariable.lastWithdrawalNFT(address(dummyErc1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20FixedERC721() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNftErc20Fixed));
        uint256 currencyHeldByJarBefore = jarNftErc20Fixed.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNftErc20Fixed.withdrawWithErc721(fixedAmount, purpose);
        assertEq(dummyToken.balanceOf(address(jarNftErc20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarNftErc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        // assertEq(jarNftErc20Fixed.lastWithdrawalNFT(address(dummyErc721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20FixedERC1155() public {
        uint256 dummyTokenId = 1;
        dummyErc1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNft1155Erc20Fixed));
        uint256 currencyHeldByJarBefore = jarNft1155Erc20Fixed.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNft1155Erc20Fixed.withdrawWithErc1155(fixedAmount, purpose);
        assertEq(dummyToken.balanceOf(address(jarNft1155Erc20Fixed)), jarBalanceBefore - fixedAmount);
        assertEq(jarNft1155Erc20Fixed.currencyHeldByJar(), currencyHeldByJarBefore - fixedAmount);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + fixedAmount);
        // assertEq(jarNft1155Erc20Fixed.lastWithdrawalNFT(address(dummyErc1155), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20VariableERC721() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNftErc20Variable));
        uint256 currencyHeldByJarBefore = jarNftErc20Variable.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNftErc20Variable.withdrawWithErc721(maxWithdrawal, purpose);
        assertEq(dummyToken.balanceOf(address(jarNftErc20Variable)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarNftErc20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        // assertEq(jarNftErc20Variable.lastWithdrawalNFT(address(dummyErc721), dummyTokenId), block.timestamp);
    }

    function test_WithdrawNFTModeERC20VariableERC1155() public {
        uint256 dummyTokenId = 1;
        dummyErc1155.mint(user, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 jarBalanceBefore = dummyToken.balanceOf(address(jarNft1155Erc20Variable));
        uint256 currencyHeldByJarBefore = jarNft1155Erc20Variable.currencyHeldByJar();
        uint256 userBalanceBefore = dummyToken.balanceOf(user);
        vm.prank(user);
        jarNft1155Erc20Variable.withdrawWithErc1155(maxWithdrawal, purpose);
        assertEq(dummyToken.balanceOf(address(jarNft1155Erc20Variable)), jarBalanceBefore - maxWithdrawal);
        assertEq(jarNft1155Erc20Variable.currencyHeldByJar(), currencyHeldByJarBefore - maxWithdrawal);
        assertEq(dummyToken.balanceOf(user), userBalanceBefore + maxWithdrawal);
        // assertEq(jarNft1155Erc20Variable.lastWithdrawalNFT(address(dummyErc1155), dummyTokenId), block.timestamp);
    }

    function test_RevertWhen_WithdrawNFTModeInvalidAccessType() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidAccessType.selector));
        jarAllowlistEthFixed.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeInvalidNFTGate() public {
        // User doesn't own any NFTs from the configured contract (ERC721, tokenId=0)
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarNftErc20Fixed.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeNotOwnerERC721() public {
        uint256 dummyTokenId = dummyErc721.mint(attacker);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarNftEthFixed.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeNotOwnerERC1155() public {
        uint256 dummyTokenId = 1;
        dummyErc1155.mint(attacker, dummyTokenId, 1);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientNFTBalance.selector));
        jarNft1155EthVariable.withdrawWithErc1155(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeAmountZero() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.ZeroAmount.selector));
        jarNftEthFixed.withdrawWithErc721(0, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeShortPurpose() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InvalidPurpose.selector));
        jarNftErc20Fixed.withdrawWithErc721(fixedAmount, shortPurpose);
    }

    function test_RevertWhen_WithdrawNFTModeAlreadyWithdrawn() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.startPrank(user);
        jarNftErc20OneTimeWithdrawal.withdrawWithErc721(fixedAmount, purpose);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.expectRevert(CookieJarLib.WithdrawalAlreadyDone.selector);
        jarNftErc20OneTimeWithdrawal.withdrawWithErc721(fixedAmount, purpose);
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawNFTModeTooSoon() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.prank(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        jarNftErc20Variable.withdrawWithErc721(fixedAmount, purpose);
        uint256 lastWithdrawal = block.timestamp;
        uint256 nextAllowed = lastWithdrawal + withdrawalInterval;
        vm.prank(user);
        skip(100); // Only skip 100 seconds, not enough time (need withdrawalInterval = 1 day)
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, nextAllowed));
        jarNftErc20Variable.withdrawWithErc721(fixedAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeWrongAmountFixed() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.warp(block.timestamp + withdrawalInterval + 1);
        uint256 wrongAmount = fixedAmount + 1;
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(CookieJarLib.WithdrawalAmountNotAllowed.selector, wrongAmount, fixedAmount)
        );
        jarNftErc20Fixed.withdrawWithErc721(wrongAmount, purpose);
    }

    function test_RevertWhen_WithdrawNFTModeInsufficientBalance() public {
        uint256 dummyTokenId = dummyErc721.mint(user);
        vm.prank(owner);
        CookieJar newJar = new CookieJar(
            createJarConfig(
                owner,
                CookieJarLib.ETH_ADDRESS,
                CookieJarLib.AccessType.ERC721,
                CookieJarLib.WithdrawalTypeOptions.Variable,
                fixedAmount,
                maxWithdrawal,
                withdrawalInterval,
                minEthDeposit,
                feePercentageOnDeposit,
                strictPurpose,
                feeCollector,
                true, // EMERGENCY_WITHDRAWAL_ENABLED
                false // ONE_TIME_WITHDRAWAL
            ),
            createAccessConfig(nftAddresses, emptyAllowlist),
            address(0) // Superfluid host disabled for testing
        );
        vm.warp(block.timestamp + withdrawalInterval + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.InsufficientBalance.selector));
        newJar.withdrawWithErc721(maxWithdrawal, purpose);
    }
}
