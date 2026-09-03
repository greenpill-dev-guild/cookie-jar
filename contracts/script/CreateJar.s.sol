// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {CookieJarLib} from "../src/libraries/CookieJarLib.sol";

/// @title CreateJar
/// @notice Creates one CookieJar on an existing factory from environment variables, then reads the
///         jar back and reverts if anything differs from the plan.
/// @dev Inputs (all read from the environment; deploy.sh loads .env.local):
///        FACTORY_ADDRESS            factory to create the jar on (required)
///        JAR_OWNER                  address that receives JAR_OWNER (required; use the multi-sig)
///        CURRENCY                   ERC20 address, default ETH sentinel
///        ACCESS_TYPE                Allowlist | ERC721 | ERC1155 (default Allowlist)
///        ALLOWLIST                  comma separated addresses (Allowlist jars)
///        NFT_CONTRACT, NFT_TOKEN_ID, NFT_MIN_BALANCE, POAP_EVENT_GATE   gate for ERC721/ERC1155 jars
///        WITHDRAWAL_OPTION          Fixed | Variable (default Variable)
///        FIXED_AMOUNT, MAX_WITHDRAWAL, WITHDRAWAL_INTERVAL, MAX_WITHDRAWAL_PER_PERIOD
///        STRICT_PURPOSE, EMERGENCY_WITHDRAWAL_ENABLED, ONE_TIME_WITHDRAWAL (booleans)
///        FEE_PERCENTAGE_ON_DEPOSIT  bps; default type(uint256).max = factory default; 0 = no fee
///        METADATA_FILE              JSON file relative to contracts/ (see config/jars/README.md)
///        DRY_RUN                    true prints the plan and sends nothing
contract CreateJar is Script {
    struct JarPlan {
        address factory;
        bool dryRun;
        CookieJarLib.JarConfig config;
        CookieJarLib.AccessConfig access;
        CookieJarLib.MultiTokenConfig multiToken;
    }

    /// @notice Raw inputs exactly as they arrive from the environment (strings still unparsed).
    struct RawInputs {
        address factory;
        bool dryRun;
        address jarOwner;
        address currency;
        string accessType;
        string allowlist;
        address nftContract;
        uint256 nftTokenId;
        uint256 nftMinBalance;
        bool poapEventGate;
        string withdrawalOption;
        uint256 fixedAmount;
        uint256 maxWithdrawal;
        uint256 withdrawalInterval;
        uint256 maxWithdrawalPerPeriod;
        bool strictPurpose;
        bool emergencyWithdrawalEnabled;
        bool oneTimeWithdrawal;
        uint256 feePercentageOnDeposit;
        string metadata;
    }

    error ConfigMismatch(string field);
    error InvalidPlan(string reason);

    function run() external returns (address jar) {
        JarPlan memory plan = buildPlan();
        logPlan(plan);

        if (plan.dryRun) {
            console.log("DRY_RUN=true: nothing was sent");
            return address(0);
        }

        vm.startBroadcast();
        jar = createFromPlan(plan);
        vm.stopBroadcast();

        verify(plan, jar);
        console.log("SUCCESS: CookieJar created at:", jar);
        console.log("NEXT: verify on the explorer, fund through deposit(), set NEXT_PUBLIC_FEATURED_JAR_ADDRESS");
    }

    /// @notice Reads every input from the environment (see the contract doc for the variable list).
    function readEnv() public view returns (RawInputs memory r) {
        r.factory = vm.envAddress("FACTORY_ADDRESS");
        r.dryRun = vm.envOr("DRY_RUN", false);
        r.jarOwner = vm.envAddress("JAR_OWNER");
        r.currency = vm.envOr("CURRENCY", CookieJarLib.ETH_ADDRESS);
        r.accessType = vm.envOr("ACCESS_TYPE", string("Allowlist"));
        r.allowlist = vm.envOr("ALLOWLIST", string(""));
        r.nftContract = vm.envOr("NFT_CONTRACT", address(0));
        r.nftTokenId = vm.envOr("NFT_TOKEN_ID", uint256(0));
        r.nftMinBalance = vm.envOr("NFT_MIN_BALANCE", uint256(0));
        r.poapEventGate = vm.envOr("POAP_EVENT_GATE", false);
        r.withdrawalOption = vm.envOr("WITHDRAWAL_OPTION", string("Variable"));
        r.fixedAmount = vm.envOr("FIXED_AMOUNT", uint256(0));
        r.maxWithdrawal = vm.envOr("MAX_WITHDRAWAL", uint256(0));
        r.withdrawalInterval = vm.envOr("WITHDRAWAL_INTERVAL", uint256(0));
        r.maxWithdrawalPerPeriod = vm.envOr("MAX_WITHDRAWAL_PER_PERIOD", uint256(0));
        r.strictPurpose = vm.envOr("STRICT_PURPOSE", true);
        r.emergencyWithdrawalEnabled = vm.envOr("EMERGENCY_WITHDRAWAL_ENABLED", true);
        r.oneTimeWithdrawal = vm.envOr("ONE_TIME_WITHDRAWAL", false);
        r.feePercentageOnDeposit = vm.envOr("FEE_PERCENTAGE_ON_DEPOSIT", type(uint256).max);
        r.metadata = vm.readFile(vm.envString("METADATA_FILE"));
    }

    /// @notice Environment-backed plan used by run().
    function buildPlan() public view returns (JarPlan memory) {
        return planFrom(readEnv());
    }

    /// @notice Turns raw inputs into a validated plan. Pure with respect to the environment so tests
    ///         can feed inputs directly.
    function planFrom(RawInputs memory r) public view returns (JarPlan memory plan) {
        plan.factory = r.factory;
        plan.dryRun = r.dryRun;

        plan.multiToken = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500,
            minSwapAmount: 0,
            defaultFee: 3000
        });

        plan.config = CookieJarLib.JarConfig({
            jarOwner: r.jarOwner,
            supportedCurrency: r.currency,
            feeCollector: address(0), // the factory sets its default fee collector
            accessType: parseAccessType(r.accessType),
            withdrawalOption: parseWithdrawalOption(r.withdrawalOption),
            strictPurpose: r.strictPurpose,
            emergencyWithdrawalEnabled: r.emergencyWithdrawalEnabled,
            oneTimeWithdrawal: r.oneTimeWithdrawal,
            fixedAmount: r.fixedAmount,
            maxWithdrawal: r.maxWithdrawal,
            withdrawalInterval: r.withdrawalInterval,
            minDeposit: 0, // the factory enforces MIN_ETH_DEPOSIT / MIN_ERC20_DEPOSIT
            feePercentageOnDeposit: r.feePercentageOnDeposit,
            maxWithdrawalPerPeriod: r.maxWithdrawalPerPeriod,
            metadata: trim(r.metadata),
            multiTokenConfig: plan.multiToken
        });

        plan.access = CookieJarLib.AccessConfig({
            allowlist: parseAddressList(r.allowlist),
            nftRequirement: CookieJarLib.NftRequirement({
                nftContract: r.nftContract,
                tokenId: r.nftTokenId,
                minBalance: r.nftMinBalance,
                isPoapEventGate: r.poapEventGate
            })
        });

        validatePlan(plan);
    }

    /// @notice Sends the creation transaction. Separate from run() so tests can call it without broadcasting.
    function createFromPlan(JarPlan memory plan) public returns (address jar) {
        jar = CookieJarFactory(plan.factory).createCookieJar(plan.config, plan.access, plan.multiToken);
    }

    /// @notice Reads the jar back and reverts on the first field that differs from the plan.
    function verify(JarPlan memory plan, address jarAddress) public view {
        CookieJar jar = CookieJar(payable(jarAddress));
        CookieJarFactory factory = CookieJarFactory(plan.factory);

        if (jar.CURRENCY() != plan.config.supportedCurrency) revert ConfigMismatch("CURRENCY");
        if (uint8(jar.ACCESS_TYPE()) != uint8(plan.config.accessType)) revert ConfigMismatch("ACCESS_TYPE");
        if (uint8(jar.WITHDRAWAL_OPTION()) != uint8(plan.config.withdrawalOption)) {
            revert ConfigMismatch("WITHDRAWAL_OPTION");
        }
        if (jar.STRICT_PURPOSE() != plan.config.strictPurpose) revert ConfigMismatch("STRICT_PURPOSE");
        if (jar.EMERGENCY_WITHDRAWAL_ENABLED() != plan.config.emergencyWithdrawalEnabled) {
            revert ConfigMismatch("EMERGENCY_WITHDRAWAL_ENABLED");
        }
        if (jar.ONE_TIME_WITHDRAWAL() != plan.config.oneTimeWithdrawal) revert ConfigMismatch("ONE_TIME_WITHDRAWAL");
        if (jar.fixedAmount() != plan.config.fixedAmount) revert ConfigMismatch("fixedAmount");
        if (jar.maxWithdrawal() != plan.config.maxWithdrawal) revert ConfigMismatch("maxWithdrawal");
        if (jar.withdrawalInterval() != plan.config.withdrawalInterval) revert ConfigMismatch("withdrawalInterval");
        if (jar.MAX_WITHDRAWAL_PER_PERIOD() != plan.config.maxWithdrawalPerPeriod) {
            revert ConfigMismatch("MAX_WITHDRAWAL_PER_PERIOD");
        }
        if (!jar.hasRole(CookieJarLib.JAR_OWNER, plan.config.jarOwner)) revert ConfigMismatch("JAR_OWNER");
        if (jar.feeCollector() != factory.DEFAULT_FEE_COLLECTOR()) revert ConfigMismatch("feeCollector");

        uint256 expectedFee = plan.config.feePercentageOnDeposit == type(uint256).max
            ? factory.DEFAULT_FEE_PERCENTAGE()
            : plan.config.feePercentageOnDeposit;
        if (expectedFee > CookieJarLib.PERCENTAGE_BASE) expectedFee = CookieJarLib.PERCENTAGE_BASE;
        if (jar.FEE_PERCENTAGE_ON_DEPOSIT() != expectedFee) revert ConfigMismatch("FEE_PERCENTAGE_ON_DEPOSIT");

        uint256 expectedMinDeposit = plan.config.supportedCurrency == CookieJarLib.ETH_ADDRESS
            ? uint256(factory.MIN_ETH_DEPOSIT())
            : uint256(factory.MIN_ERC20_DEPOSIT());
        if (jar.MIN_DEPOSIT() != expectedMinDeposit) revert ConfigMismatch("MIN_DEPOSIT");

        if (jar.getAllowlist().length != plan.access.allowlist.length) revert ConfigMismatch("allowlist");
        if (plan.config.accessType != CookieJarLib.AccessType.Allowlist) {
            (address nftContract, uint256 tokenId, uint256 minBalance, bool isPoapEventGate) = jar.nftRequirement();
            if (nftContract != plan.access.nftRequirement.nftContract)
                revert ConfigMismatch("nftRequirement.nftContract");
            if (tokenId != plan.access.nftRequirement.tokenId) revert ConfigMismatch("nftRequirement.tokenId");
            if (minBalance != plan.access.nftRequirement.minBalance) revert ConfigMismatch("nftRequirement.minBalance");
            if (isPoapEventGate != plan.access.nftRequirement.isPoapEventGate) {
                revert ConfigMismatch("nftRequirement.isPoapEventGate");
            }
        }

        (, , string memory metadata) = factory.getJarInfo(jarAddress);
        if (keccak256(bytes(metadata)) != keccak256(bytes(plan.config.metadata))) revert ConfigMismatch("metadata");
    }

    function validatePlan(JarPlan memory plan) public pure {
        if (plan.config.jarOwner == address(0)) revert InvalidPlan("JAR_OWNER is zero");
        if (plan.config.withdrawalOption == CookieJarLib.WithdrawalTypeOptions.Fixed) {
            if (plan.config.fixedAmount == 0) revert InvalidPlan("FIXED_AMOUNT must be > 0 for Fixed jars");
        } else if (plan.config.maxWithdrawal == 0) {
            revert InvalidPlan("MAX_WITHDRAWAL must be > 0 for Variable jars");
        }
        if (plan.config.accessType == CookieJarLib.AccessType.Allowlist) {
            if (plan.access.nftRequirement.nftContract != address(0)) {
                revert InvalidPlan("NFT_CONTRACT is set on an Allowlist jar");
            }
        } else {
            if (plan.access.nftRequirement.nftContract == address(0)) {
                revert InvalidPlan("NFT_CONTRACT is required for ERC721/ERC1155 jars");
            }
            if (plan.access.allowlist.length != 0) revert InvalidPlan("ALLOWLIST is set on an NFT-gated jar");
        }
        if (bytes(plan.config.metadata).length == 0) revert InvalidPlan("METADATA_FILE is empty");
        if (
            plan.config.feePercentageOnDeposit != type(uint256).max &&
            plan.config.feePercentageOnDeposit > CookieJarLib.PERCENTAGE_BASE
        ) revert InvalidPlan("FEE_PERCENTAGE_ON_DEPOSIT above 100%");
    }

    function logPlan(JarPlan memory plan) public view {
        console.log("=== Cookie Jar creation plan ===");
        console.log("Chain ID:", block.chainid);
        console.log("Factory:", plan.factory);
        console.log("Jar owner:", plan.config.jarOwner);
        console.log("Currency:", plan.config.supportedCurrency);
        console.log("Access type (0 Allowlist, 1 ERC721, 2 ERC1155):", uint8(plan.config.accessType));
        console.log("Withdrawal option (0 Fixed, 1 Variable):", uint8(plan.config.withdrawalOption));
        console.log("Fixed amount:", plan.config.fixedAmount);
        console.log("Max withdrawal:", plan.config.maxWithdrawal);
        console.log("Withdrawal interval (s):", plan.config.withdrawalInterval);
        console.log("Max withdrawal per period:", plan.config.maxWithdrawalPerPeriod);
        console.log("Strict purpose:", plan.config.strictPurpose);
        console.log("Emergency withdrawal enabled:", plan.config.emergencyWithdrawalEnabled);
        console.log("One-time withdrawal:", plan.config.oneTimeWithdrawal);
        if (plan.config.feePercentageOnDeposit == type(uint256).max) {
            console.log("Fee on deposit: factory default");
        } else {
            console.log("Fee on deposit (bps):", plan.config.feePercentageOnDeposit);
        }
        console.log("Allowlist size:", plan.access.allowlist.length);
        console.log("NFT contract:", plan.access.nftRequirement.nftContract);
        console.log("NFT token id:", plan.access.nftRequirement.tokenId);
        console.log("NFT min balance:", plan.access.nftRequirement.minBalance);
        console.log("Metadata:", plan.config.metadata);
        console.log("Dry run:", plan.dryRun);
        console.log("================================");
    }

    function parseAccessType(string memory value) public pure returns (CookieJarLib.AccessType) {
        bytes32 key = keccak256(bytes(value));
        if (key == keccak256("Allowlist") || key == keccak256("allowlist")) return CookieJarLib.AccessType.Allowlist;
        if (key == keccak256("ERC721") || key == keccak256("erc721")) return CookieJarLib.AccessType.ERC721;
        if (key == keccak256("ERC1155") || key == keccak256("erc1155")) return CookieJarLib.AccessType.ERC1155;
        revert InvalidPlan("ACCESS_TYPE must be Allowlist, ERC721 or ERC1155");
    }

    function parseWithdrawalOption(string memory value) public pure returns (CookieJarLib.WithdrawalTypeOptions) {
        bytes32 key = keccak256(bytes(value));
        if (key == keccak256("Fixed") || key == keccak256("fixed")) return CookieJarLib.WithdrawalTypeOptions.Fixed;
        if (key == keccak256("Variable") || key == keccak256("variable")) {
            return CookieJarLib.WithdrawalTypeOptions.Variable;
        }
        revert InvalidPlan("WITHDRAWAL_OPTION must be Fixed or Variable");
    }

    /// @notice Splits "0xabc,0xdef" (spaces tolerated) into addresses. Empty input yields an empty list.
    function parseAddressList(string memory value) public pure returns (address[] memory list) {
        bytes memory raw = bytes(value);
        uint256 count = 0;
        uint256 start = 0;
        address[] memory buffer = new address[](raw.length / 42 + 1);
        for (uint256 i = 0; i <= raw.length; i++) {
            if (i == raw.length || raw[i] == ",") {
                string memory token = trim(slice(raw, start, i));
                if (bytes(token).length != 0) {
                    buffer[count++] = vm.parseAddress(token);
                }
                start = i + 1;
            }
        }
        list = new address[](count);
        for (uint256 j = 0; j < count; j++) {
            list[j] = buffer[j];
        }
    }

    function slice(bytes memory raw, uint256 start, uint256 end) internal pure returns (string memory) {
        bytes memory out = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            out[i - start] = raw[i];
        }
        return string(out);
    }

    /// @notice Trims spaces, tabs and newlines from both ends.
    function trim(string memory value) public pure returns (string memory) {
        bytes memory raw = bytes(value);
        uint256 start = 0;
        uint256 end = raw.length;
        while (start < end && isWhitespace(raw[start])) start++;
        while (end > start && isWhitespace(raw[end - 1])) end--;
        return slice(raw, start, end);
    }

    function isWhitespace(bytes1 c) internal pure returns (bool) {
        return c == 0x20 || c == 0x09 || c == 0x0a || c == 0x0d;
    }
}
