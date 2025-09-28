// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJar.sol";
import "../src/tokens/TestERC20.sol";
import "../src/libraries/CookieJarLib.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CookieMonsterNFT is ERC721, Ownable {
    uint256 public tokenIdCounter;
    
    constructor() ERC721("Cookie Monster Collection", "COOKIE") Ownable(msg.sender) {}
    
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = tokenIdCounter++;
        _mint(to, tokenId);
        return tokenId;
    }
}

contract DeployLocalScript is Script {
    // Pre-funded Anvil addresses 
    address constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant COOKIE_MONSTER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;  // User A
    address constant COOKIE_FAN = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;       // User B

    CookieJarFactory factory;
    CookieMonsterNFT cookieMonsterNFT;
    DummyERC20 demoToken;

    function run() external {
        // HARDCODED for local development only - Anvil Account #0
        // This is the well-known first account that Anvil always generates
        // Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        // ⚠️  NEVER use this key on mainnet or testnets!
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Starting comprehensive local deployment...");
        console.log("Using Anvil Account #0 for deployment");
        console.log("Deployer address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // === STEP 1: Deploy CookieJarFactory ===
        console.log("");
        console.log("[STEP 1] Deploying CookieJarFactory...");
        
        // Deploy CookieJarFactory using CREATE2 for deterministic address
        // Salt ensures same address every time Anvil restarts
        bytes32 salt = keccak256("CookieJarFactory_v2.0.0");
        factory = new CookieJarFactory{salt: salt}(
            deployer,           // _defaultFeeCollector (use deployer for local testing)
            deployer,           // _owner
            100,                // _feePercentage (1% = 100/10000)
            0.01 ether,         // _minETHDeposit
            1000 * 10**18       // _minERC20Deposit (1000 tokens assuming 18 decimals)
        );
        
        console.log("SUCCESS: CookieJarFactory deployed to:", address(factory));
        console.log("   Factory funded by account with 1000 ETH");
        console.log("   CREATE2 Address is deterministic - same on every Anvil restart!");

        // === STEP 2: Deploy Demo Assets ===
        console.log("");
        console.log("[STEP 2] Deploying demo assets...");
        
        // Deploy Cookie Monster NFT collection
        console.log("   Deploying Cookie Monster NFT collection...");
        cookieMonsterNFT = new CookieMonsterNFT();
        
        // Mint Cookie Monster NFTs to test users
        cookieMonsterNFT.mint(COOKIE_MONSTER);  // Token #0 to Cookie Monster
        cookieMonsterNFT.mint(COOKIE_FAN);      // Token #1 to Cookie Fan
        console.log("   SUCCESS: Cookie Monster NFTs minted to special accounts!");
        console.log("      NFT Contract Address:", address(cookieMonsterNFT));
        console.log("      NOTE: NFT address will change on Anvil restart. Use 'pnpm nft:address' to get current address.");
        
        // Deploy demo ERC20 token
        console.log("   Deploying DEMO ERC20 token...");
        demoToken = new DummyERC20();
        
        // Mint demo tokens to test accounts
        demoToken.mint(DEPLOYER, 1000000 * 10**18);        // 1M tokens to deployer
        demoToken.mint(COOKIE_MONSTER, 100000 * 10**18);   // 100K tokens to Cookie Monster
        demoToken.mint(COOKIE_FAN, 100000 * 10**18);       // 100K tokens to Cookie Fan
        console.log("   SUCCESS: DEMO tokens minted to test accounts!");

        // === STEP 3: Create Demo Cookie Jars ===
        console.log("");
        console.log("[STEP 3] Creating 4 demo cookie jars...");

        // 1. Community Stipend (Allowlist, ETH, Fixed withdrawals)
        _createJar1();
        
        // 2. Development Grants (Allowlist, ERC20, Variable withdrawals)  
        _createJar2();
        
        // 3. NFT Holder Rewards (NFT-Gated, ETH, Fixed withdrawals)
        _createJar3();
        
        // 4. NFT Airdrop (NFT-Gated, ERC20, One-time withdrawals)
        _createJar4();

        // === SUMMARY ===
        console.log("");
        console.log("COMPLETE: Local development environment ready!");
        console.log("SUMMARY:");
        console.log("   - CookieJarFactory deployed at:", address(factory));
        console.log("   - 4 Cookie Jars created with different configurations");
        console.log("   - Cookie Monster NFT deployed at:", address(cookieMonsterNFT));
        console.log("   - DEMO ERC20 token deployed at:", address(demoToken));
        console.log("   - NFTs minted to User A (Cookie Monster) and User B (Cookie Fan)");
        console.log("   - Jars funded with ETH and DEMO tokens");
        console.log("");
        console.log("TEST different scenarios:");
        console.log("   - Connect as Cookie Monster (0x70997...dc79C8) to access all jars");
        console.log("   - Connect as Cookie Fan (0x3C44Cd...4293BC) to access allowlist + NFT jars");
        console.log("   - Connect as other address to see access restrictions");
        console.log("   - Try withdrawing with/without purpose descriptions");
        console.log("   - Test one-time withdrawal limits on Jar 4");
        
        // === STEP 4: Update Client Configuration for V2 ===
        console.log("");
        console.log("[STEP 4] Updating client configuration for V2 support...");
        _updateClientConfig(address(factory));
        console.log("SUCCESS: Client configured for V2 contract flow on chain 31337");
        
        vm.stopBroadcast();
    }
    
    function _createJar1() internal {
        // 1. Community Stipend (Allowlist, ETH, Fixed 0.1 ETH)
        address[] memory allowlist1 = new address[](2);
        allowlist1[0] = COOKIE_MONSTER;
        allowlist1[1] = COOKIE_FAN;
        
        // Default configurations
        CookieJarLib.MultiTokenConfig memory defaultMultiToken = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500, // 5%
            minSwapAmount: 0.01 ether,
            defaultFee: 3000 // 0.3%
        });
        
        address[] memory emptyTokens = new address[](0);
        CookieJarLib.StreamingConfig memory defaultStreaming = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens,
            minFlowRate: 1e18 // 1 token per second minimum
        });
        
        CookieJarLib.JarConfig memory params1 = CookieJarLib.JarConfig({
            jarOwner: DEPLOYER,
            supportedCurrency: CookieJarLib.ETH_ADDRESS,
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 0.1 ether,
            maxWithdrawal: 1 ether,
            withdrawalInterval: 7 days,
            minDeposit: 0.01 ether,
            feePercentageOnDeposit: 0,
            strictPurpose: false,
            feeCollector: DEPLOYER,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 0,
            metadata: "Community Stipend - Weekly 0.1 ETH for community members",
            multiTokenConfig: defaultMultiToken,
            streamingConfig: defaultStreaming
        });
        
        CookieJarLib.AccessConfig memory accessConfig1 = CookieJarLib.AccessConfig({
            nftAddresses: new address[](0),
            nftTypes: new CookieJarLib.NFTType[](0),
            nftThresholds: new uint256[](0),
            allowlist: allowlist1,
            poapReq: CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
            unlockReq: CookieJarLib.UnlockRequirement({lockAddress: address(0), requireValidKey: false}),
            hypercertReq: CookieJarLib.HypercertRequirement({
                hypercertContract: address(0), 
                requiredFractions: 0, 
                allowedCreators: new address[](0), 
                tokenId: 0, 
                tokenContract: address(0), 
                minBalance: 0
            }),
            hatsReq: CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
        });
        
        factory.createCookieJar(params1, accessConfig1, defaultMultiToken, defaultStreaming);
        
        // Fund the first jar with 5 ETH
        address[] memory allJars = factory.getAllJars();
        address firstJar = allJars[0];
        CookieJar(payable(firstJar)).depositETH{value: 5 ether}();
        console.log("   SUCCESS: Jar 1: Community Stipend (Allowlist, ETH, Fixed 0.1) - 5 ETH funded");
    }

    /// @notice Creates the second demo jar: Development Grants (Allowlist, ERC20, Variable up to 1000 DEMO)
    function _createJar2() internal {
        address[] memory allowlist2 = new address[](3);
        allowlist2[0] = COOKIE_MONSTER;
        allowlist2[1] = COOKIE_FAN;
        allowlist2[2] = DEPLOYER;
        
        // Default configurations for Jar 2
        CookieJarLib.MultiTokenConfig memory defaultMultiToken2 = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500, // 5%
            minSwapAmount: 1000 * 10**18, // 1000 DEMO tokens
            defaultFee: 3000 // 0.3%
        });

        address[] memory emptyTokens2 = new address[](0);
        CookieJarLib.StreamingConfig memory defaultStreaming2 = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens2,
            minFlowRate: 1e18 // 1 token per second minimum
        });
        
        CookieJarLib.JarConfig memory params2 = CookieJarLib.JarConfig({
            jarOwner: DEPLOYER,
            supportedCurrency: address(demoToken),
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount: 0,
            maxWithdrawal: 1000 * 10**18,
            withdrawalInterval: 30 days,
            minDeposit: 1000 * 10**18,
            feePercentageOnDeposit: 0,
            strictPurpose: true,
            feeCollector: DEPLOYER,
            emergencyWithdrawalEnabled: false,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 0,
            metadata: "Development Grants - Up to 1000 DEMO tokens monthly for contributors",
            multiTokenConfig: defaultMultiToken2,
            streamingConfig: defaultStreaming2
        });
        
        CookieJarLib.AccessConfig memory accessConfig2 = CookieJarLib.AccessConfig({
            nftAddresses: new address[](0),
            nftTypes: new CookieJarLib.NFTType[](0),
            nftThresholds: new uint256[](0),
            allowlist: allowlist2,
            poapReq: CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
            unlockReq: CookieJarLib.UnlockRequirement({lockAddress: address(0), requireValidKey: false}),
            hypercertReq: CookieJarLib.HypercertRequirement({
                hypercertContract: address(0), 
                requiredFractions: 0, 
                allowedCreators: new address[](0), 
                tokenId: 0, 
                tokenContract: address(0), 
                minBalance: 0
            }),
            hatsReq: CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
        });
        
        factory.createCookieJar(params2, accessConfig2, defaultMultiToken2, defaultStreaming2);
        
        // Fund the second jar with 50K DEMO tokens
        address[] memory allJars2 = factory.getAllJars();
        address secondJar = allJars2[1];
        demoToken.approve(secondJar, 50000 * 10**18);
        CookieJar(payable(secondJar)).depositCurrency(50000 * 10**18);
        console.log("   SUCCESS: Jar 2: Development Grants (Allowlist, DEMO, Variable 1000) - 50K DEMO funded");
    }
    
    function _createJar3() internal {
        // 3. NFT Holder Rewards (NFT-Gated, ETH, Fixed 0.05 ETH)
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        // Default configurations for Jar 3
        CookieJarLib.MultiTokenConfig memory defaultMultiToken3 = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500, // 5%
            minSwapAmount: 0.01 ether,
            defaultFee: 3000 // 0.3%
        });
        
        address[] memory emptyTokens3 = new address[](0);
        CookieJarLib.StreamingConfig memory defaultStreaming3 = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens3,
            minFlowRate: 1e18 // 1 token per second minimum
        });
        
        CookieJarLib.JarConfig memory params3 = CookieJarLib.JarConfig({
            jarOwner: DEPLOYER,
            supportedCurrency: CookieJarLib.ETH_ADDRESS,
            accessType: CookieJarLib.AccessType.NFTGated,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 0.05 ether,
            maxWithdrawal: 1 ether,
            withdrawalInterval: 14 days,
            minDeposit: 0.01 ether,
            feePercentageOnDeposit: 0,
            strictPurpose: false,
            feeCollector: DEPLOYER,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            maxWithdrawalPerPeriod: 0,
            metadata: "NFT Holder Rewards - 0.05 ETH bi-weekly for Cookie Monster NFT holders",
            multiTokenConfig: defaultMultiToken3,
            streamingConfig: defaultStreaming3
        });
        
        uint256[] memory nftThresholds = new uint256[](1);
        nftThresholds[0] = 1;
        
        CookieJarLib.AccessConfig memory accessConfig3 = CookieJarLib.AccessConfig({
            nftAddresses: nftAddresses,
            nftTypes: nftTypes,
            nftThresholds: nftThresholds,
            allowlist: new address[](0),
            poapReq: CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
            unlockReq: CookieJarLib.UnlockRequirement({lockAddress: address(0), requireValidKey: false}),
            hypercertReq: CookieJarLib.HypercertRequirement({
                hypercertContract: address(0), 
                requiredFractions: 0, 
                allowedCreators: new address[](0), 
                tokenId: 0, 
                tokenContract: address(0), 
                minBalance: 0
            }),
            hatsReq: CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
        });
        
        factory.createCookieJar(params3, accessConfig3, defaultMultiToken3, defaultStreaming3);
        
        // Fund the third jar with 2 ETH
        address[] memory allJars3 = factory.getAllJars();
        address thirdJar = allJars3[2];
        CookieJar(payable(thirdJar)).depositETH{value: 2 ether}();
        console.log("   SUCCESS: Jar 3: NFT Holder Rewards (NFT-Gated, ETH, Fixed 0.05) - 2 ETH funded");
    }
    
    function _createJar4() internal {
        // 4. NFT Airdrop (NFT-Gated, ERC20, One-time 500 DEMO)
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        // Default configurations for Jar 4
        CookieJarLib.MultiTokenConfig memory defaultMultiToken4 = CookieJarLib.MultiTokenConfig({
            enabled: false,
            maxSlippagePercent: 500, // 5%
            minSwapAmount: 100 * 10**18, // 100 DEMO tokens
            defaultFee: 3000 // 0.3%
        });
        
        address[] memory emptyTokens4 = new address[](0);
        CookieJarLib.StreamingConfig memory defaultStreaming4 = CookieJarLib.StreamingConfig({
            enabled: false,
            autoAcceptStreams: false,
            acceptedSuperTokens: emptyTokens4,
            minFlowRate: 1e18 // 1 token per second minimum
        });
        
        CookieJarLib.JarConfig memory params4 = CookieJarLib.JarConfig({
            jarOwner: DEPLOYER,
            supportedCurrency: address(demoToken),
            accessType: CookieJarLib.AccessType.NFTGated,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 500 * 10**18,
            maxWithdrawal: 500 * 10**18,
            withdrawalInterval: 0,
            minDeposit: 100 * 10**18,
            feePercentageOnDeposit: 0,
            strictPurpose: false,
            feeCollector: DEPLOYER,
            emergencyWithdrawalEnabled: false,
            oneTimeWithdrawal: true,
            maxWithdrawalPerPeriod: 0,
            metadata: "NFT Airdrop - One-time 500 DEMO tokens for Cookie Monster NFT holders",
            multiTokenConfig: defaultMultiToken4,
            streamingConfig: defaultStreaming4
        });
        
        uint256[] memory nftThresholds4 = new uint256[](1);
        nftThresholds4[0] = 1;
        
        CookieJarLib.AccessConfig memory accessConfig4 = CookieJarLib.AccessConfig({
            nftAddresses: nftAddresses,
            nftTypes: nftTypes,
            nftThresholds: nftThresholds4,
            allowlist: new address[](0),
            poapReq: CookieJarLib.POAPRequirement({eventId: 0, poapContract: address(0)}),
            unlockReq: CookieJarLib.UnlockRequirement({lockAddress: address(0), requireValidKey: false}),
            hypercertReq: CookieJarLib.HypercertRequirement({
                hypercertContract: address(0), 
                requiredFractions: 0, 
                allowedCreators: new address[](0), 
                tokenId: 0, 
                tokenContract: address(0), 
                minBalance: 0
            }),
            hatsReq: CookieJarLib.HatsRequirement({hatId: 0, hatsContract: address(0)})
        });
        
        factory.createCookieJar(params4, accessConfig4, defaultMultiToken4, defaultStreaming4);
        
        // Fund the fourth jar with 10K DEMO tokens
        address[] memory allJars4 = factory.getAllJars();
        address fourthJar = allJars4[3];
        demoToken.approve(fourthJar, 10000 * 10**18);
        CookieJar(payable(fourthJar)).depositCurrency(10000 * 10**18);
        console.log("   SUCCESS: Jar 4: NFT Airdrop (NFT-Gated, DEMO, One-time 500) - 10K DEMO funded");
    }

    /// @notice Updates the client configuration file with new local deployment
    /// @param factoryAddress The deployed factory address
    function _updateClientConfig(address factoryAddress) internal {
        // Generate TypeScript configuration
        string memory configContent = _generateLocalConfigFile(factoryAddress);
        
        // Write to client config file
        string memory configPath = "../client/config/deployments.auto.ts";
        vm.writeFile(configPath, configContent);
        
        console.log("SUCCESS: Updated client config:", configPath);
    }

    /// @notice Generates the TypeScript configuration file content for local development
    /// @param factoryAddress The deployed factory address
    /// @return The complete TypeScript file content with local chain support
    function _generateLocalConfigFile(address factoryAddress) internal view returns (string memory) {
        // Create deployment entry for local chain (31337)
        string memory localDeploymentEntry = string(abi.encodePacked(
            "  31337: {\n",
            "    chainId: 31337,\n",
            "    factoryAddress: \"", vm.toString(factoryAddress), "\",\n",
            "    isV2: true,\n",
            "    blockNumber: ", vm.toString(block.number), ",\n",
            "    timestamp: ", vm.toString(block.timestamp), "\n",
            "  }"
        ));

        // Generate complete file content with local development support
        return string(abi.encodePacked(
            "/**\n",
            " * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!\n", 
            " * \n",
            " * This file is automatically updated when contracts are deployed.\n",
            " * It contains the latest factory addresses and V2 chain detection.\n",
            " * \n",
            " * Generated by: contracts/script/DeployLocal.s.sol\n",
            " * Last updated: ", vm.toString(block.timestamp), "\n",
            " * Chain ID: 31337 (Local Development)\n",
            " */\n\n",
            
            "export interface DeploymentInfo {\n",
            "  chainId: number\n",
            "  factoryAddress: string\n", 
            "  blockNumber?: number\n",
            "  timestamp?: number\n",
            "  isV2: boolean\n",
            "  deploymentHash?: string\n",
            "}\n\n",
            
            "// Auto-generated deployment registry\n",
            "export const DEPLOYMENTS: Record<number, DeploymentInfo> = {\n",
            "  // Local Development (Anvil)\n",
            localDeploymentEntry, ",\n\n",
            
            "  // Legacy V1 deployments (manually maintained)\n",
            "  42220: {\n",
            "    chainId: 42220,\n",
            "    factoryAddress: \"0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9\",\n",
            "    isV2: false\n",
            "  },\n",
            "  44787: {\n",
            "    chainId: 44787,\n", 
            "    factoryAddress: \"0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9\",\n",
            "    isV2: false\n",
            "  }\n",
            "}\n\n",
            
            "// Auto-generated V2 chain list\n",
            "export const V2_CHAINS = Object.entries(DEPLOYMENTS)\n",
            "  .filter(([_, info]) => info.isV2)\n",
            "  .map(([chainId, _]) => parseInt(chainId))\n\n",
            
            "// Auto-generated factory addresses\n",
            "export const FACTORY_ADDRESSES = Object.fromEntries(\n",
            "  Object.entries(DEPLOYMENTS).map(([chainId, info]) => [\n",
            "    chainId,\n", 
            "    info.factoryAddress\n",
            "  ])\n",
            ") as Record<number, string>\n\n",
            
            "// Helper functions\n",
            "export function isV2Chain(chainId: number): boolean {\n",
            "  return DEPLOYMENTS[chainId]?.isV2 || false\n",
            "}\n\n",
            
            "export function getFactoryAddress(chainId: number): string | undefined {\n",
            "  return DEPLOYMENTS[chainId]?.factoryAddress\n",
            "}\n\n",
            
            "export function getDeploymentInfo(chainId: number): DeploymentInfo | undefined {\n",
            "  return DEPLOYMENTS[chainId]\n",
            "}\n\n",
            
            "// Generation metadata\n",
            "export const GENERATED_AT = \"", vm.toString(block.timestamp), "\"\n",
            "export const GENERATOR = \"Cookie Jar Local Development System v2.0\"\n",
            "export const DEPLOYED_CHAIN = 31337\n"
        ));
    }
}