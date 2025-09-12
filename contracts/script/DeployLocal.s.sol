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

        // Deploy CookieJarFactory with local development parameters
        CookieJarFactory factory = new CookieJarFactory(
            deployer,           // _defaultFeeCollector (use deployer for local testing)
            deployer,           // _owner
            100,                // _feePercentage (1% = 100/10000)
            0.01 ether,         // _minETHDeposit
            1000 * 10**18       // _minERC20Deposit (1000 tokens assuming 18 decimals)
        );
        
        console.log("CookieJarFactory deployed to:", address(factory));
        console.log("Factory funded by account with 1000 ETH");
        
        // Save deployment info for frontend
        string memory json = string.concat(
            '{"CookieJarFactory":"',
            vm.toString(address(factory)),
            '","chainId":31337,"timestamp":',
            vm.toString(block.timestamp),
            "}"
        );
        
        // Write to local file, then move via script
        vm.writeFile("local-deployment.json", json);
        
        vm.stopBroadcast();
    }
}
