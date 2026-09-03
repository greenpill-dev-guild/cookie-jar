// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {CreateJar} from "../../script/CreateJar.s.sol";
import {CookieJar} from "../../src/CookieJar.sol";
import {CookieJarFactory} from "../../src/CookieJarFactory.sol";
import {CookieJarLib} from "../../src/libraries/CookieJarLib.sol";
import {DummyERC1155} from "../../src/tokens/TestERC1155.sol";

/// @dev USDC-like token: 6 decimals, open mint.
contract SixDecimalToken is ERC20 {
    constructor() ERC20("USD Coin (mock)", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Tests feed inputs to planFrom() directly. vm.setEnv is process-wide and Forge runs tests in
///      parallel, so only one test touches the environment and it sets every variable it reads.
contract CreateJarTest is Test, ERC1155Holder {
    uint256 internal constant MIN_ERC20_DEPOSIT = 1e6; // 1 USDC
    uint128 internal constant MIN_ETH_DEPOSIT = 1e14;
    uint256 internal constant TEAM_HAT_ID = 0x0000005c00010000000000000000000000000000000000000000000000000000;

    address internal feeCollector = address(0xFEE);
    address internal factoryOwner = address(0xF0);
    address internal jarOwner = address(0xA11CE);
    address internal holder = address(0xB0B);
    address internal outsider = address(0xCAFE);

    CookieJarFactory internal factory;
    SixDecimalToken internal usdc;
    DummyERC1155 internal badge;
    CreateJar internal script;

    string internal constant METADATA =
        '{"name":"Greenpill Dev Guild Contributor Stipend","description":"Monthly stipend.","image":"","link":"https://example.org"}';
    string internal constant PURPOSE = "Claim for July 2026: https://linear.app/greenpill-dev-guild/issue/PRD-718";

    function setUp() public {
        factory = new CookieJarFactory(feeCollector, factoryOwner, 100, MIN_ETH_DEPOSIT, uint128(MIN_ERC20_DEPOSIT));
        usdc = new SixDecimalToken();
        badge = new DummyERC1155();
        badge.mint(holder, 1, 1, "");
        script = new CreateJar();
    }

    /// @dev The stipend jar shape from the deployment plan, pointed at the local factory.
    function _stipendInputs() internal view returns (CreateJar.RawInputs memory r) {
        r.factory = address(factory);
        r.dryRun = false;
        r.jarOwner = jarOwner;
        r.currency = address(usdc);
        r.accessType = "ERC1155";
        r.allowlist = "";
        r.nftContract = address(badge);
        r.nftTokenId = 1;
        r.nftMinBalance = 1;
        r.poapEventGate = false;
        r.withdrawalOption = "Variable";
        r.fixedAmount = 0;
        r.maxWithdrawal = 800_000_000;
        r.withdrawalInterval = 28 days;
        r.maxWithdrawalPerPeriod = 0;
        r.strictPurpose = true;
        r.emergencyWithdrawalEnabled = true;
        r.oneTimeWithdrawal = false;
        r.feePercentageOnDeposit = 0;
        r.metadata = string.concat(METADATA, "\n");
    }

    function test_PlanFrom_ReadsTheStipendShape() public view {
        CreateJar.JarPlan memory plan = script.planFrom(_stipendInputs());

        assertEq(plan.factory, address(factory));
        assertEq(plan.config.jarOwner, jarOwner);
        assertEq(plan.config.supportedCurrency, address(usdc));
        assertEq(uint8(plan.config.accessType), uint8(CookieJarLib.AccessType.ERC1155));
        assertEq(uint8(plan.config.withdrawalOption), uint8(CookieJarLib.WithdrawalTypeOptions.Variable));
        assertEq(plan.config.maxWithdrawal, 800_000_000);
        assertEq(plan.config.withdrawalInterval, 28 days);
        assertTrue(plan.config.strictPurpose);
        assertTrue(plan.config.emergencyWithdrawalEnabled);
        assertFalse(plan.config.oneTimeWithdrawal);
        assertEq(plan.config.feePercentageOnDeposit, 0);
        assertEq(plan.config.metadata, METADATA); // trailing newline trimmed
        assertEq(plan.access.allowlist.length, 0);
        assertEq(plan.access.nftRequirement.nftContract, address(badge));
        assertEq(plan.access.nftRequirement.tokenId, 1);
        assertEq(plan.access.nftRequirement.minBalance, 1);
        assertFalse(plan.dryRun);
    }

    function test_PlanFrom_ParsesAllowlistWithSpaces() public view {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.accessType = "Allowlist";
        r.nftContract = address(0);
        r.nftTokenId = 0;
        r.nftMinBalance = 0;
        r
            .allowlist = " 0x0000000000000000000000000000000000000001, 0x0000000000000000000000000000000000000002 ,0x0000000000000000000000000000000000000003";

        CreateJar.JarPlan memory plan = script.planFrom(r);

        assertEq(plan.access.allowlist.length, 3);
        assertEq(plan.access.allowlist[0], address(1));
        assertEq(plan.access.allowlist[1], address(2));
        assertEq(plan.access.allowlist[2], address(3));
    }

    function test_PlanFrom_AcceptsAHatIdAsTokenId() public view {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.nftTokenId = TEAM_HAT_ID;
        CreateJar.JarPlan memory plan = script.planFrom(r);
        assertEq(plan.access.nftRequirement.tokenId, TEAM_HAT_ID);
    }

    function test_PlanFrom_RejectsNftGateWithoutContract() public {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.nftContract = address(0);
        vm.expectRevert(
            abi.encodeWithSelector(CreateJar.InvalidPlan.selector, "NFT_CONTRACT is required for ERC721/ERC1155 jars")
        );
        script.planFrom(r);
    }

    function test_PlanFrom_RejectsVariableJarWithoutMax() public {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.maxWithdrawal = 0;
        vm.expectRevert(
            abi.encodeWithSelector(CreateJar.InvalidPlan.selector, "MAX_WITHDRAWAL must be > 0 for Variable jars")
        );
        script.planFrom(r);
    }

    function test_PlanFrom_RejectsAllowlistOnNftJar() public {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.allowlist = vm.toString(holder);
        vm.expectRevert(abi.encodeWithSelector(CreateJar.InvalidPlan.selector, "ALLOWLIST is set on an NFT-gated jar"));
        script.planFrom(r);
    }

    function test_FeeSentinelUsesFactoryDefault() public {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.feePercentageOnDeposit = type(uint256).max;
        CreateJar.JarPlan memory plan = script.planFrom(r);
        address jar = script.createFromPlan(plan);
        script.verify(plan, jar);
        assertEq(CookieJar(payable(jar)).FEE_PERCENTAGE_ON_DEPOSIT(), factory.DEFAULT_FEE_PERCENTAGE());
    }

    function test_CreateStipendJar_EndToEnd() public {
        CreateJar.JarPlan memory plan = script.planFrom(_stipendInputs());
        address jarAddress = script.createFromPlan(plan);
        script.verify(plan, jarAddress);
        CookieJar jar = CookieJar(payable(jarAddress));

        assertEq(factory.getJarCount(), 1);
        assertEq(jar.FEE_PERCENTAGE_ON_DEPOSIT(), 0);
        assertEq(jar.MIN_DEPOSIT(), MIN_ERC20_DEPOSIT);
        assertTrue(jar.hasRole(CookieJarLib.JAR_OWNER, jarOwner));

        // Funding: a 1 USDC deposit passes the factory minimum, 0.999999 USDC does not
        usdc.mint(address(this), 10_000e6);
        usdc.approve(jarAddress, 10_000e6);
        vm.expectRevert(CookieJarLib.LessThanMinimumDeposit.selector);
        jar.deposit(MIN_ERC20_DEPOSIT - 1);
        jar.deposit(4_800e6);
        assertEq(jar.currencyHeldByJar(), 4_800e6);
        assertEq(usdc.balanceOf(feeCollector), 0);

        // A badge holder can claim with a Linear-linked purpose
        vm.prank(holder);
        jar.withdrawWithErc1155(500e6, PURPOSE);
        assertEq(usdc.balanceOf(holder), 500e6);
        assertEq(jar.currencyHeldByJar(), 4_300e6);

        // The interval blocks a second claim right away
        vm.prank(holder);
        vm.expectRevert(abi.encodeWithSelector(CookieJarLib.WithdrawalTooSoon.selector, block.timestamp + 28 days));
        jar.withdrawWithErc1155(1e6, PURPOSE);

        // Someone without the badge cannot claim
        vm.prank(outsider);
        vm.expectRevert(CookieJarLib.InsufficientNFTBalance.selector);
        jar.withdrawWithErc1155(1e6, PURPOSE);
    }

    function test_CreateAllowlistJar_Verifies() public {
        CreateJar.RawInputs memory r = _stipendInputs();
        r.accessType = "Allowlist";
        r.nftContract = address(0);
        r.nftTokenId = 0;
        r.nftMinBalance = 0;
        r.allowlist = string.concat(vm.toString(holder), ",", vm.toString(outsider));

        CreateJar.JarPlan memory plan = script.planFrom(r);
        address jarAddress = script.createFromPlan(plan);
        script.verify(plan, jarAddress);

        CookieJar jar = CookieJar(payable(jarAddress));
        assertEq(jar.getAllowlist().length, 2);
        assertTrue(jar.hasRole(CookieJarLib.JAR_ALLOWLISTED, holder));
    }

    /// @dev The only environment-backed test: sets every variable it reads and runs a dry run.
    function test_Env_BuildPlanAndDryRun() public {
        vm.setEnv("FACTORY_ADDRESS", vm.toString(address(factory)));
        vm.setEnv("JAR_OWNER", vm.toString(jarOwner));
        vm.setEnv("CURRENCY", vm.toString(address(usdc)));
        vm.setEnv("ACCESS_TYPE", "ERC1155");
        vm.setEnv("ALLOWLIST", "");
        vm.setEnv("NFT_CONTRACT", vm.toString(address(badge)));
        vm.setEnv("NFT_TOKEN_ID", "0x0000005c00010000000000000000000000000000000000000000000000000000");
        vm.setEnv("NFT_MIN_BALANCE", "1");
        vm.setEnv("POAP_EVENT_GATE", "false");
        vm.setEnv("WITHDRAWAL_OPTION", "Variable");
        vm.setEnv("FIXED_AMOUNT", "0");
        vm.setEnv("MAX_WITHDRAWAL", "800000000");
        vm.setEnv("WITHDRAWAL_INTERVAL", "2419200");
        vm.setEnv("MAX_WITHDRAWAL_PER_PERIOD", "0");
        vm.setEnv("STRICT_PURPOSE", "true");
        vm.setEnv("EMERGENCY_WITHDRAWAL_ENABLED", "true");
        vm.setEnv("ONE_TIME_WITHDRAWAL", "false");
        vm.setEnv("FEE_PERCENTAGE_ON_DEPOSIT", "0");
        vm.setEnv("METADATA_FILE", "config/jars/arbitrum-stipend.json");
        vm.setEnv("DRY_RUN", "true");

        CreateJar.JarPlan memory plan = script.buildPlan();
        assertEq(plan.access.nftRequirement.tokenId, TEAM_HAT_ID);
        assertEq(plan.config.maxWithdrawal, 800_000_000);
        assertTrue(plan.dryRun);
        // The checked-in metadata file is a single JSON object
        bytes memory metadata = bytes(plan.config.metadata);
        assertEq(metadata[0], bytes1("{"));
        assertEq(metadata[metadata.length - 1], bytes1("}"));

        address jar = script.run();
        assertEq(jar, address(0));
        assertEq(factory.getJarCount(), 0);
    }
}
