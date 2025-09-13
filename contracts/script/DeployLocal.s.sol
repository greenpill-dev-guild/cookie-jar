// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/CookieJarFactory.sol";
import "../src/libraries/CookieJarLib.sol";

contract DeployLocalScript is Script {
    function run() external {
        // HARDCODED for local development only - Anvil Account #0
        // This is the well-known first account that Anvil always generates
        // Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        // ⚠️  NEVER use this key on mainnet or testnets!
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Using Anvil Account #0 for deployment");
        console.log("Deployer address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy CookieJarFactory using CREATE2 for deterministic address
        // Salt ensures same address every time Anvil restarts
        bytes32 salt = keccak256("CookieJarFactory_v1.0.0");
        CookieJarFactory factory = new CookieJarFactory{salt: salt}(
            deployer,           // _defaultFeeCollector (use deployer for local testing)
            deployer,           // _owner
            100,                // _feePercentage (1% = 100/10000)
            0.01 ether,         // _minETHDeposit
            1000 * 10**18       // _minERC20Deposit (1000 tokens assuming 18 decimals)
        );
        
        console.log("CookieJarFactory deployed to:", address(factory));
        console.log("Factory funded by account with 1000 ETH");
        console.log("CREATE2 Address is deterministic - same on every Anvil restart!");
        
        // NOTE: Deployment file created by post-deployment script from broadcast data
        
        vm.stopBroadcast();
    }
}
