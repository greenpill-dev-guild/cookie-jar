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
        
        // Load factory from deployment
        string memory deploymentFile = vm.readFile("local-deployment.json");
        address factoryAddress = vm.parseJsonAddress(deploymentFile, ".CookieJarFactory");
        factory = CookieJarFactory(factoryAddress);
        console.log("Using CookieJarFactory at:", factoryAddress);
        
        vm.startBroadcast(DEPLOYER_KEY);
        
        // 1. Deploy Cookie Monster NFT Collection
        _deployCookieMonsterNFT();
        
        // 2. Deploy Demo ERC20 Token
        _deployDemoToken();
        
        // 3. Create Demo Cookie Jars
        address[] memory jarAddresses = _createDemoJars();
        
        // 4. Fund the jars with initial deposits
        _fundJars(jarAddresses);
        
        vm.stopBroadcast();
        
        // 5. Save seeded data for frontend
        _saveSeededData(jarAddresses);
        
        console.log("Cookie Monster demo environment ready!");
        _printSummary(jarAddresses);
    }
    
    function _deployCookieMonsterNFT() internal {
        console.log("Deploying Cookie Monster NFT collection...");
        
        cookieMonsterNFT = new CookieMonsterNFT();
        
        // Mint Cookie Monster NFTs to special accounts
        cookieMonsterNFT.mint(COOKIE_MONSTER); // Token ID 0 to Cookie Monster account
        cookieMonsterNFT.mint(COOKIE_FAN);     // Token ID 1 to Cookie Fan account
        
        console.log("Cookie Monster NFTs minted to special accounts!");
    }
    
    function _deployDemoToken() internal {
        console.log("Deploying DEMO ERC20 token...");
        
        demoToken = new DummyERC20();
        
        // Mint tokens to accounts
        demoToken.mint(DEPLOYER, 1000000 * 10**18);      // 1M tokens to deployer
        demoToken.mint(COOKIE_MONSTER, 100000 * 10**18);  // 100K to Cookie Monster
        demoToken.mint(COOKIE_FAN, 100000 * 10**18);      // 100K to Cookie Fan
        
        console.log("DEMO tokens minted to test accounts!");
    }
    
    function _createDemoJars() internal returns (address[] memory) {
        console.log("Creating 4 demo cookie jars...");
        
        address[] memory jars = new address[](4);
        
        // 1. Community Stipend (Whitelist + ETH + Fixed)
        jars[0] = _createCommunityStipendJar();
        
        // 2. Grants Program (Whitelist + ERC20 + Variable)
        jars[1] = _createGrantsProgramJar();
        
        // 3. Cookie Monster Benefits (NFT-Gated + ETH + Variable)
        jars[2] = _createCookieMonsterBenefitsJar();
        
        // 4. Cookie Monster Airdrop (NFT-Gated + ERC20 + One-time)
        jars[3] = _createCookieMonsterAirdropJar();
        
        console.log("All demo jars created!");
        return jars;
    }
    
    function _createCommunityStipendJar() internal returns (address) {
        address[] memory whitelist = new address[](2);
        whitelist[0] = COOKIE_MONSTER;
        whitelist[1] = COOKIE_FAN;
        
        address[] memory emptyNFTAddresses = new address[](0);
        CookieJarLib.NFTType[] memory emptyNFTTypes = new CookieJarLib.NFTType[](0);
        
        return factory.createCookieJar(
            DEPLOYER,                                    // owner
            CookieJarLib.ETH_ADDRESS,                   // ETH jar
            CookieJarLib.AccessType.Whitelist,          // whitelist access
            emptyNFTAddresses,                          // no NFTs
            emptyNFTTypes,                              // no NFT types
            CookieJarLib.WithdrawalTypeOptions.Fixed,   // fixed withdrawals
            0.1 ether,                                  // 0.1 ETH per withdrawal
            1 ether,                                    // max withdrawal (unused for fixed)
            7 days,                                     // weekly withdrawals
            false,                                      // no strict purpose
            true,                                       // emergency withdrawal enabled
            false,                                      // not one-time
            whitelist,                                  // whitelisted users
            "Community Stipend - Weekly 0.1 ETH for community members"
        );
    }
    
    function _createGrantsProgramJar() internal returns (address) {
        address[] memory whitelist = new address[](2);
        whitelist[0] = COOKIE_MONSTER;
        whitelist[1] = COOKIE_FAN;
        
        address[] memory emptyNFTAddresses = new address[](0);
        CookieJarLib.NFTType[] memory emptyNFTTypes = new CookieJarLib.NFTType[](0);
        
        return factory.createCookieJar(
            DEPLOYER,                                      // owner
            address(demoToken),                            // ERC20 jar
            CookieJarLib.AccessType.Whitelist,            // whitelist access
            emptyNFTAddresses,                            // no NFTs
            emptyNFTTypes,                                // no NFT types
            CookieJarLib.WithdrawalTypeOptions.Variable,  // variable withdrawals
            1000 * 10**18,                                // fixed amount (unused for variable)
            10000 * 10**18,                               // max 10K tokens per withdrawal
            30 days,                                      // monthly grants
            true,                                         // strict purpose required
            true,                                         // emergency withdrawal enabled
            false,                                        // not one-time
            whitelist,                                    // whitelisted grantees
            "Grants Program - Up to 10K DEMO tokens monthly with purpose"
        );
    }
    
    function _createCookieMonsterBenefitsJar() internal returns (address) {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        address[] memory emptyWhitelist = new address[](0);
        
        return factory.createCookieJar(
            DEPLOYER,                                      // owner
            CookieJarLib.ETH_ADDRESS,                     // ETH jar
            CookieJarLib.AccessType.NFTGated,             // NFT-gated access
            nftAddresses,                                 // Cookie Monster NFT required
            nftTypes,                                     // ERC721 type
            CookieJarLib.WithdrawalTypeOptions.Variable,  // variable withdrawals
            0.05 ether,                                   // fixed amount (unused for variable)
            0.25 ether,                                   // max 0.25 ETH per withdrawal
            14 days,                                      // bi-weekly claims
            false,                                        // no strict purpose
            false,                                        // no emergency withdrawal
            false,                                        // not one-time
            emptyWhitelist,                               // no whitelist needed
            "Cookie Monster Benefits - Up to 0.25 ETH bi-weekly for NFT holders"
        );
    }
    
    function _createCookieMonsterAirdropJar() internal returns (address) {
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(cookieMonsterNFT);
        
        CookieJarLib.NFTType[] memory nftTypes = new CookieJarLib.NFTType[](1);
        nftTypes[0] = CookieJarLib.NFTType.ERC721;
        
        address[] memory emptyWhitelist = new address[](0);
        
        return factory.createCookieJar(
            DEPLOYER,                                    // owner
            address(demoToken),                          // ERC20 jar
            CookieJarLib.AccessType.NFTGated,           // NFT-gated access
            nftAddresses,                               // Cookie Monster NFT required
            nftTypes,                                   // ERC721 type
            CookieJarLib.WithdrawalTypeOptions.Fixed,   // fixed withdrawals
            5000 * 10**18,                              // 5K tokens per claim
            5000 * 10**18,                              // max withdrawal (same as fixed)
            0,                                          // no time limit
            false,                                      // no strict purpose
            false,                                      // no emergency withdrawal
            true,                                       // ONE-TIME withdrawal only!
            emptyWhitelist,                             // no whitelist needed
            "Cookie Monster Airdrop - One-time 5K DEMO tokens for NFT holders"
        );
    }
    
    function _fundJars(address[] memory jarAddresses) internal {
        console.log("Funding demo jars with initial deposits...");
        
        // Fund Community Stipend Jar with 10 ETH (ETH jar - use depositETH)
        CookieJar(payable(jarAddresses[0])).depositETH{value: 10 ether}();
        
        // Fund Grants Program Jar with 100K DEMO tokens (ERC20 jar - use depositCurrency)
        demoToken.approve(jarAddresses[1], 100000 * 10**18);
        CookieJar(payable(jarAddresses[1])).depositCurrency(100000 * 10**18);
        
        // Fund Cookie Monster Benefits Jar with 5 ETH (ETH jar - use depositETH)
        CookieJar(payable(jarAddresses[2])).depositETH{value: 5 ether}();
        
        // Fund Cookie Monster Airdrop Jar with 50K DEMO tokens (ERC20 jar - use depositCurrency)
        demoToken.approve(jarAddresses[3], 50000 * 10**18);
        CookieJar(payable(jarAddresses[3])).depositCurrency(50000 * 10**18);
        
        console.log("All jars funded and ready for testing!");
    }
    
    function _saveSeededData(address[] memory jarAddresses) internal {
        // Create JSON with all seeded data info for frontend
        string memory json = string.concat(
            '{"seedTimestamp":', vm.toString(block.timestamp),
            ',"demoToken":"', vm.toString(address(demoToken)),
            '","cookieMonsterNFT":"', vm.toString(address(cookieMonsterNFT)),
            '","jars":{"communityStipend":"', vm.toString(jarAddresses[0]),
            '","grantsProgram":"', vm.toString(jarAddresses[1]),
            '","cookieMonsterBenefits":"', vm.toString(jarAddresses[2]),
            '","cookieMonsterAirdrop":"', vm.toString(jarAddresses[3]),
            '"}}'
        );
        
        // Save to contracts directory
        vm.writeFile("seed-data.json", json);
        
        // Copy to frontend for easy access
        
        console.log("Seed data saved for frontend integration");
    }
    
    function _printSummary(address[] memory jarAddresses) internal view {
        console.log("");
        console.log("COOKIE MONSTER DEMO ENVIRONMENT READY!");
        console.log("=====================================");
        console.log("");
        console.log("Cookie Monster NFT Collection:");
        console.log("  Contract:", address(cookieMonsterNFT));
        console.log("  Token ID 0: Cookie Monster account");
        console.log("  Token ID 1: Cookie Fan account");
        console.log("");
        console.log("DEMO Token:");
        console.log("  Contract:", address(demoToken));
        console.log("  Deployer: 1,000,000 DEMO");
        console.log("  Cookie Monster: 100,000 DEMO");
        console.log("  Cookie Fan: 100,000 DEMO");
        console.log("");
        console.log("Demo Cookie Jars Created:");
        console.log("  1. Community Stipend:", jarAddresses[0]);
        console.log("      (Whitelist + ETH + Fixed 0.1 ETH weekly)");
        console.log("  2. Grants Program:", jarAddresses[1]);
        console.log("      (Whitelist + ERC20 + Variable up to 10K monthly)");
        console.log("  3. Cookie Monster Benefits:", jarAddresses[2]);
        console.log("      (NFT-Gated + ETH + Variable up to 0.25 ETH bi-weekly)");
        console.log("  4. Cookie Monster Airdrop:", jarAddresses[3]);
        console.log("      (NFT-Gated + ERC20 + One-time 5K DEMO)");
        console.log("");
        console.log("Test Account Roles:");
        console.log("  Deployer (Owner):", DEPLOYER);
        console.log("  Cookie Monster (NFT #0):", COOKIE_MONSTER);
        console.log("  Cookie Fan (NFT #1):", COOKIE_FAN);
        console.log("  Test User (No NFT):", TEST_USER);
        console.log("");
        console.log("Ready to Code!");
        console.log("  Connect Cookie Monster or Cookie Fan accounts");
        console.log("  Try accessing NFT-gated jars");
        console.log("  Test withdrawals from different jar types");
        console.log("  Switch between accounts to test access controls");
        console.log("  Build your own jars with custom rules!");
        console.log("");
    }
}
