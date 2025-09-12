// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/CookieJarFactory.sol";

/**
 * Utility script to compute CREATE2 addresses before deployment
 * Run with: forge script script/ComputeCreate2Address.s.sol
 */
contract ComputeCreate2AddressScript is Script {
    // Same salt as DeployLocal.s.sol
    bytes32 private constant _SALT = keccak256("CookieJarFactory_v1.0.0");
    
    function run() external view {
        // Anvil Account #0 (deployer)
        address deployer = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        
        // Calculate CREATE2 address
        bytes memory creationCode = abi.encodePacked(
            type(CookieJarFactory).creationCode,
            abi.encode(
                deployer,           // _defaultFeeCollector
                deployer,           // _owner  
                100,                // _feePercentage (1% = 100/10000)
                0.01 ether,         // _minETHDeposit
                1000 * 10**18       // _minERC20Deposit
            )
        );
        
        address predictedAddress = vm.computeCreate2Address(
            _SALT,
            keccak256(creationCode),
            deployer
        );
        
        console.log("=== CREATE2 Address Calculation ===");
        console.log("Deployer:", deployer);
        console.log("Salt:", vm.toString(_SALT));
        console.log("Predicted CookieJarFactory address:", predictedAddress);
        console.log("");
        console.log("Add this address to frontend/config/supported-networks.ts:");
        console.log("31337: \"%s\"", vm.toString(predictedAddress));
    }
}
