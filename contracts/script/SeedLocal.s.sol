// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CookieJarFactory.sol";
import "../src/CookieJar.sol";
import "../src/tokens/TestERC20.sol";
import "../src/libraries/CookieJarLib.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Simple NFT contract for seeding - avoids constructor minting issues
contract CookieMonsterNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("Cookie Monster NFT", "COOKIE") Ownable(msg.sender) {}

    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId); // Use _mint instead of _safeMint
        return tokenId;
    }
}

contract SeedLocalScript is Script {
    // HARDCODED for local development only - Anvil accounts
    // WARNING: NEVER use these keys on mainnet or testnets!
    uint256 constant DEPLOYER_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant COOKIE_MONSTER_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant COOKIE_FAN_KEY = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    
    address constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant COOKIE_MONSTER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant COOKIE_FAN = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant TEST_USER = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    CookieJarFactory factory;
    DummyERC20 demoToken;
    CookieMonsterNFT cookieMonsterNFT;

    function run() external {
        console.log("Seeding Cookie Monster demo environment...");
        
        // FIX: Read the factory address from environment variable instead of hardcoding
        // This should be set by the deployment script
        address factoryAddress = vm.envOr("DEPLOYED_FACTORY_ADDRESS", address(0));
        
        // If no env var, try to read from common deployment addresses
        if (factoryAddress == address(0)) {
            // Try the most common local deployment addresses
            address[3] memory possibleAddresses = [
                0x9d9D2f191D8970Bbf830Aa4D7F4e8C19937572C4, // Current deployment
                0xd77fDE87C2dC9Fde3323ACdb2ccF89ff0b3B265E, // Previous deployment
                0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0  // Fallback
            ];
            
            for (uint i = 0; i < possibleAddresses.length; i++) {
                if (possibleAddresses[i].code.length > 0) {
                    factoryAddress = possibleAddresses[i];
                    console.log("Found factory at address:", factoryAddress);
                    break;
                }
            }
        }
        
        // Final check - if still no factory found, exit with error
        require(factoryAddress != address(0), "ERROR: CookieJarFactory not found! Deploy contracts first.");
        require(factoryAddress.code.length > 0, "ERROR: No contract found at factory address!");
        
        factory = CookieJarFactory(factoryAddress);
        console.log("SUCCESS: Using CookieJarFactory at:", factoryAddress);
        
        vm.startBroadcast(DEPLOYER_KEY);
        
        // Deploy Cookie Monster NFT collection for testing NFT gates
        console.log("Deploying Cookie Monster NFT collection...");
        cookieMonsterNFT = new CookieMonsterNFT();
        
        // Mint special NFTs to test accounts (User A and User B get special NFTs)
        cookieMonsterNFT.mint(COOKIE_MONSTER); // Token ID 0
        cookieMonsterNFT.mint(COOKIE_FAN);     // Token ID 1
        console.log("Cookie Monster NFTs minted to special accounts!");
        console.log("NFT Contract Address:", address(cookieMonsterNFT));
        console.log("NOTE: NFT address will change on Anvil restart. Use 'pnpm nft:address' to get current address.");
    
        // Deploy demo ERC20 token for testing
        console.log("Deploying DEMO ERC20 token...");
        demoToken = new DummyERC20(); // Constructor hardcodes name/symbol, mints 1B tokens
        
        // Mint additional tokens to test accounts
        demoToken.mint(DEPLOYER, 1_000_000 ether);      // 1M extra to deployer
        demoToken.mint(COOKIE_MONSTER, 100_000 ether);  // 100K to User A  
        demoToken.mint(COOKIE_FAN, 100_000 ether);      // 100K to User B
        console.log("DEMO tokens minted to test accounts!");
    
        // Create 4 different types of demo cookie jars
        console.log("Creating 4 demo cookie jars...");
        
        // 1. Whitelist ETH jar with fixed withdrawals (community stipend)
        address[] memory allowlist1 = new address[](2);
        allowlist1[0] = COOKIE_MONSTER;
        allowlist1[1] = COOKIE_FAN;
        
        factory.createCookieJar(
            DEPLOYER,                    // jar owner
            CookieJarLib.ETH_ADDRESS,   // ETH currency
            CookieJarLib.AccessType.Allowlist,  // whitelist access
            new address[](0),           // no NFT addresses 
            new CookieJarLib.NFTType[](0),            // no NFT types
            CookieJarLib.WithdrawalTypeOptions.Fixed, // fixed withdrawals
            0.1 ether,                  // fixed amount: 0.1 ETH
            1 ether,                    // max withdrawal (ignored for fixed)
            7 days,                     // withdrawal interval: 1 week
            false,                      // no strict purpose required
            true,                       // emergency withdrawal enabled
            false,                      // not one-time only
            allowlist1,                 // initial allowlist
            "Community Stipend - Weekly 0.1 ETH for community members"
        );

        // Fund the first jar with 5 ETH
        address firstJar = factory.getCookieJars()[0];
        CookieJar(firstJar).depositETH{value: 5 ether}();
        console.log("SUCCESS: Jar 1: Community Stipend (Allowlist, ETH, Fixed 0.1) - 5 ETH funded");

        // 2. Whitelist ERC20 jar with variable withdrawals (grants program)  
        address[] memory allowlist2 = new address[](3);
        allowlist2[0] = COOKIE_MONSTER;
        allowlist2[1] = COOKIE_FAN; 
        allowlist2[2] = DEPLOYER;
        
        factory.createCookieJar(
            DEPLOYER,                    // jar owner
            address(demoToken),         // DEMO token currency
            CookieJarLib.AccessType.Allowlist,  // whitelist access
            new address[](0),           // no NFT addresses
            new CookieJarLib.NFTType[](0),            // no NFT types  
            CookieJarLib.WithdrawalTypeOptions.Variable, // variable withdrawals
            0,                          // fixed amount (ignored for variable)
            1000 ether,                 // max withdrawal: 1000 DEMO per request
            1 days,                     // withdrawal interval: daily
            true,                       // strict purpose required
            true,                       // emergency withdrawal enabled
            false,                      // not one-time only
            allowlist2,                 // initial allowlist  
            "Development Grants - Up to 1000 DEMO tokens for approved projects"
        );

        // Fund the second jar with 50,000 DEMO tokens
        address secondJar = factory.getCookieJars()[1]; 
        demoToken.approve(secondJar, 50_000 ether);
        CookieJar(secondJar).depositCurrency(50_000 ether);
        console.log("SUCCESS: Jar 2: Development Grants (Allowlist, DEMO, Variable 1000) - 50K DEMO funded");

        // 3. NFT-gated ETH jar (NFT holder benefits)
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        factory.createCookieJar(
            DEPLOYER,                    // jar owner
            CookieJarLib.ETH_ADDRESS,   // ETH currency
            CookieJarLib.AccessType.NFTGated,   // NFT-gated access
            nftAddresses,               // Cookie Monster NFT required
            nftTypes,                   // ERC721 type
            CookieJarLib.WithdrawalTypeOptions.Fixed,  // fixed withdrawals
            0.05 ether,                 // fixed amount: 0.05 ETH
            0,                          // max withdrawal (ignored)
            3 days,                     // withdrawal interval: every 3 days
            false,                      // no strict purpose required
            false,                      // no emergency withdrawal
            false,                      // not one-time only
            new address[](0),           // no initial allowlist (NFT-gated)
            "Cookie Monster Holder Rewards - 0.05 ETH every 3 days for NFT holders"
        );

        // Fund the third jar with 2 ETH
        address thirdJar = factory.getCookieJars()[2];
        CookieJar(thirdJar).depositETH{value: 2 ether}();
        console.log("SUCCESS: Jar 3: NFT Holder Rewards (NFT-Gated, ETH, Fixed 0.05) - 2 ETH funded");

        // 4. NFT-gated ERC20 jar with one-time withdrawals (airdrop style)
        factory.createCookieJar(
            DEPLOYER,                    // jar owner  
            address(demoToken),         // DEMO token currency
            CookieJarLib.AccessType.NFTGated,   // NFT-gated access
            nftAddresses,               // Cookie Monster NFT required
            nftTypes,                   // ERC721 type
            CookieJarLib.WithdrawalTypeOptions.Fixed,  // fixed withdrawals
            500 ether,                  // fixed amount: 500 DEMO
            0,                          // max withdrawal (ignored)
            0,                          // withdrawal interval: 0 (one-time only)
            true,                       // strict purpose required
            false,                      // no emergency withdrawal
            true,                       // ONE-TIME WITHDRAWAL ONLY
            new address[](0),           // no initial allowlist (NFT-gated)
            "Cookie Monster Airdrop - One-time 500 DEMO claim for NFT holders"
        );

        // Fund the fourth jar with 10,000 DEMO tokens
        address fourthJar = factory.getCookieJars()[3];
        demoToken.approve(fourthJar, 10_000 ether);
        CookieJar(fourthJar).depositCurrency(10_000 ether);
        console.log("SUCCESS: Jar 4: NFT Airdrop (NFT-Gated, DEMO, One-time 500) - 10K DEMO funded");

        vm.stopBroadcast();

        console.log("COMPLETE: Demo environment seeded successfully!");
        console.log("SUMMARY:");
        console.log("  - 4 Cookie Jars created with different configurations");
        console.log("  - Cookie Monster NFT deployed at:", address(cookieMonsterNFT));
        console.log("  - DEMO ERC20 token deployed at:", address(demoToken));
        console.log("  - NFTs minted to User A (Cookie Monster) and User B (Cookie Fan)");
        console.log("  - Jars funded with ETH and DEMO tokens");
        console.log("");
        console.log("TEST different scenarios:");
        console.log("  - Connect as Cookie Monster (0x70997...dc79C8) to access all jars");
        console.log("  - Connect as Cookie Fan (0x3C44Cd...4293BC) to access allowlist + NFT jars");
        console.log("  - Connect as other address to see access restrictions");
        console.log("  - Try withdrawing with/without purpose descriptions");
        console.log("  - Test one-time withdrawal limits on Jar 4");
    }
}