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
        
        vm.stopBroadcast();
    }
    
    function _createJar1() internal {
        // 1. Community Stipend (Allowlist, ETH, Fixed 0.1 ETH)
        address[] memory allowlist1 = new address[](2);
        allowlist1[0] = COOKIE_MONSTER;
        allowlist1[1] = COOKIE_FAN;
        
        CookieJarLib.CreateJarParams memory params1 = CookieJarLib.CreateJarParams({
            cookieJarOwner: DEPLOYER,
            supportedCurrency: CookieJarLib.ETH_ADDRESS,
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 0.1 ether,
            maxWithdrawal: 1 ether,
            withdrawalInterval: 7 days,
            strictPurpose: false,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            metadata: "Community Stipend - Weekly 0.1 ETH for community members",
            customFeePercentage: 0,
            maxWithdrawalPerPeriod: 0
        });
        
        CookieJarLib.AccessConfig memory accessConfig1 = CookieJarLib.AccessConfig({
            nftAddresses: new address[](0),
            nftTypes: new CookieJarLib.NFTType[](0),
            allowlist: allowlist1,
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
        
        factory.createCookieJar(params1, accessConfig1);
        
        // Fund the first jar with 5 ETH
        address firstJar = factory.getCookieJars()[0];
        CookieJar(firstJar).depositETH{value: 5 ether}();
        console.log("   SUCCESS: Jar 1: Community Stipend (Allowlist, ETH, Fixed 0.1) - 5 ETH funded");
    }
    
    function _createJar2() internal {
        // 2. Development Grants (Allowlist, ERC20, Variable up to 1000 DEMO)
        address[] memory allowlist2 = new address[](3);
        allowlist2[0] = COOKIE_MONSTER;
        allowlist2[1] = COOKIE_FAN;
        allowlist2[2] = DEPLOYER;
        
        CookieJarLib.CreateJarParams memory params2 = CookieJarLib.CreateJarParams({
            cookieJarOwner: DEPLOYER,
            supportedCurrency: address(demoToken),
            accessType: CookieJarLib.AccessType.Allowlist,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Variable,
            fixedAmount: 0,
            maxWithdrawal: 1000 * 10**18,
            withdrawalInterval: 30 days,
            strictPurpose: true,
            emergencyWithdrawalEnabled: false,
            oneTimeWithdrawal: false,
            metadata: "Development Grants - Up to 1000 DEMO tokens monthly for contributors",
            customFeePercentage: 0,
            maxWithdrawalPerPeriod: 0
        });
        
        CookieJarLib.AccessConfig memory accessConfig2 = CookieJarLib.AccessConfig({
            nftAddresses: new address[](0),
            nftTypes: new CookieJarLib.NFTType[](0),
            allowlist: allowlist2,
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
        
        factory.createCookieJar(params2, accessConfig2);
        
        // Fund the second jar with 50K DEMO tokens
        address secondJar = factory.getCookieJars()[1];
        demoToken.approve(secondJar, 50000 * 10**18);
        CookieJar(secondJar).depositCurrency(50000 * 10**18);
        console.log("   SUCCESS: Jar 2: Development Grants (Allowlist, DEMO, Variable 1000) - 50K DEMO funded");
    }
    
    function _createJar3() internal {
        // 3. NFT Holder Rewards (NFT-Gated, ETH, Fixed 0.05 ETH)
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        CookieJarLib.CreateJarParams memory params3 = CookieJarLib.CreateJarParams({
            cookieJarOwner: DEPLOYER,
            supportedCurrency: CookieJarLib.ETH_ADDRESS,
            accessType: CookieJarLib.AccessType.NFTGated,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 0.05 ether,
            maxWithdrawal: 1 ether,
            withdrawalInterval: 14 days,
            strictPurpose: false,
            emergencyWithdrawalEnabled: true,
            oneTimeWithdrawal: false,
            metadata: "NFT Holder Rewards - 0.05 ETH bi-weekly for Cookie Monster NFT holders",
            customFeePercentage: 0,
            maxWithdrawalPerPeriod: 0
        });
        
        CookieJarLib.AccessConfig memory accessConfig3 = CookieJarLib.AccessConfig({
            nftAddresses: nftAddresses,
            nftTypes: nftTypes,
            allowlist: new address[](0),
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
        
        factory.createCookieJar(params3, accessConfig3);
        
        // Fund the third jar with 2 ETH
        address thirdJar = factory.getCookieJars()[2];
        CookieJar(thirdJar).depositETH{value: 2 ether}();
        console.log("   SUCCESS: Jar 3: NFT Holder Rewards (NFT-Gated, ETH, Fixed 0.05) - 2 ETH funded");
    }
    
    function _createJar4() internal {
        // 4. NFT Airdrop (NFT-Gated, ERC20, One-time 500 DEMO)
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        CookieJarLib.CreateJarParams memory params4 = CookieJarLib.CreateJarParams({
            cookieJarOwner: DEPLOYER,
            supportedCurrency: address(demoToken),
            accessType: CookieJarLib.AccessType.NFTGated,
            withdrawalOption: CookieJarLib.WithdrawalTypeOptions.Fixed,
            fixedAmount: 500 * 10**18,
            maxWithdrawal: 500 * 10**18,
            withdrawalInterval: 0,
            strictPurpose: false,
            emergencyWithdrawalEnabled: false,
            oneTimeWithdrawal: true,
            metadata: "NFT Airdrop - One-time 500 DEMO tokens for Cookie Monster NFT holders",
            customFeePercentage: 0,
            maxWithdrawalPerPeriod: 0
        });
        
        CookieJarLib.AccessConfig memory accessConfig4 = CookieJarLib.AccessConfig({
            nftAddresses: nftAddresses,
            nftTypes: nftTypes,
            allowlist: new address[](0),
            poapReq: CookieJarLib.POAPRequirement(0, address(0)),
            unlockReq: CookieJarLib.UnlockRequirement(address(0)),
            hypercertReq: CookieJarLib.HypercertRequirement(address(0), 0, 1),
            hatsReq: CookieJarLib.HatsRequirement(0, address(0))
        });
        
        factory.createCookieJar(params4, accessConfig4);
        
        // Fund the fourth jar with 10K DEMO tokens
        address fourthJar = factory.getCookieJars()[3];
        demoToken.approve(fourthJar, 10000 * 10**18);
        CookieJar(fourthJar).depositCurrency(10000 * 10**18);
        console.log("   SUCCESS: Jar 4: NFT Airdrop (NFT-Gated, DEMO, One-time 500) - 10K DEMO funded");
    }
}