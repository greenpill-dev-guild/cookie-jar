// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/factory/CookieJarFactory.sol";

/// @title DeployMultiTokenCookieJar
/// @notice Deployment script for multi-token Cookie Jar system
contract DeployMultiTokenCookieJar is Script {
    // === CHAIN CONFIGURATIONS ===
    
    struct ChainConfig {
        address router;
        address wNative;
        string name;
    }

    mapping(uint256 => ChainConfig) public chainConfigs;

    constructor() {
        // Ethereum Mainnet
        chainConfigs[1] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // Uniswap V2 Router
            wNative: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // WETH
            name: "Ethereum Mainnet"
        });

        // Sepolia Testnet
        chainConfigs[11155111] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // Uniswap V2 Router
            wNative: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14, // WETH on Sepolia
            name: "Sepolia Testnet"
        });

        // Optimism
        chainConfigs[10] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // Uniswap V2 Router
            wNative: 0x4200000000000000000000000000000000000006, // WETH on Optimism
            name: "Optimism"
        });

        // Base
        chainConfigs[8453] = ChainConfig({
            router: 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24, // Uniswap V2 Router on Base
            wNative: 0x4200000000000000000000000000000000000006, // WETH on Base
            name: "Base"
        });

        // Celo
        chainConfigs[42220] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // Uniswap V2 Router (if available)
            wNative: 0x471EcE3750Da237f93B8E339c536989b8978a438, // WCELO
            name: "Celo"
        });

        // Base Sepolia Testnet
        chainConfigs[84532] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // May need to be updated
            wNative: 0x4200000000000000000000000000000000000006, // WETH on Base Sepolia
            name: "Base Sepolia"
        });

        // Optimism Sepolia
        chainConfigs[11155420] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // May need to be updated
            wNative: 0x4200000000000000000000000000000000000006, // WETH on OP Sepolia
            name: "Optimism Sepolia"
        });

        // Celo Alfajores Testnet
        chainConfigs[44787] = ChainConfig({
            router: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // May need to be updated
            wNative: 0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9, // WCELO on Alfajores
            name: "Celo Alfajores"
        });
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with account:", deployer);
        console.log("Account balance:", deployer.balance);
        
        uint256 chainId = block.chainid;
        ChainConfig memory config = chainConfigs[chainId];
        
        require(config.router != address(0), "Unsupported chain");
        
        console.log("Deploying to:", config.name);
        console.log("Router:", config.router);
        console.log("wNative:", config.wNative);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory
        CookieJarFactory factory = new CookieJarFactory(
            config.router,
            config.wNative,
            deployer
        );

        console.log("CookieJarFactory deployed at:", address(factory));

        // Verify deployment
        require(factory.router() == config.router, "Router mismatch");
        require(factory.wNative() == config.wNative, "wNative mismatch");
        require(factory.owner() == deployer, "Owner mismatch");

        vm.stopBroadcast();

        // Log deployment info
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("Chain:", config.name);
        console.log("Chain ID:", chainId);
        console.log("Factory:", address(factory));
        console.log("Router:", config.router);
        console.log("wNative:", config.wNative);
        console.log("Owner:", deployer);
        
        // Save deployment info
        _saveDeployment(chainId, address(factory), config);
    }

    function _saveDeployment(uint256 chainId, address factory, ChainConfig memory config) internal {
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "chainId": ', vm.toString(chainId), ',\n',
            '  "chainName": "', config.name, '",\n',
            '  "factory": "', vm.toString(factory), '",\n',
            '  "router": "', vm.toString(config.router), '",\n',
            '  "wNative": "', vm.toString(config.wNative), '",\n',
            '  "deployedAt": ', vm.toString(block.timestamp), '\n',
            "}"
        ));

        string memory filename = string(abi.encodePacked("deployment-", vm.toString(chainId), ".json"));
        vm.writeFile(filename, deploymentInfo);
        console.log("Deployment info saved to:", filename);
    }

    // === UTILITY FUNCTIONS ===

    /// @notice Get chain configuration for current chain
    function getCurrentChainConfig() external view returns (ChainConfig memory) {
        return chainConfigs[block.chainid];
    }

    /// @notice Check if chain is supported
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return chainConfigs[chainId].router != address(0);
    }

    /// @notice Add or update chain configuration (for testing)
    function setChainConfig(uint256 chainId, address router, address wNative, string memory name) external {
        chainConfigs[chainId] = ChainConfig({
            router: router,
            wNative: wNative,
            name: name
        });
    }
}