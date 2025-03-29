// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.24;
// import { Script } from "forge-std/Script.sol";
// import {CookieJar} from "../src/CookieJar.sol";
// import {CookieJarFactory} from "../src/CookieJarFactory.sol";
// import {CookieJarRegistry} from "../src/CookieJarRegistry.sol";
// import {DummyERC20} from "../src/tokens/TestERC20.sol";
// import {DummyERC721} from "../src/tokens/TestERC721.sol";
// import {DummyERC1155} from "../src/tokens/TestERC1155.sol";

// import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
// import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
// import "../lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
// import {console} from "forge-std/console.sol";
// contract DeployCookie is Script {
//     address defaultFeeCollector = 0x116BdC7128470ddcB9C95C8fb13baa6b5b47209B;
//     CookieJar public jarWhitelist;
//     CookieJar public jarNFT;
//     address public admin = address(0x2a8a76Bcf495a02452969e604d16cFd3A7b78005);
//     address public feeCollector = address(0x116BdC7128470ddcB9C95C8fb13baa6b5b47209B);
//     uint256 public withdrawalInterval = 1 days;
//     uint256 public fixedAmount = 1 ether;
//     uint256 public maxWithdrawal = 2 ether;
//     bool public strictPurpose = true;
//     DummyERC20 public token;
//     DummyERC721 public dummyERC721;
//     DummyERC1155 public dummyERC1155;

//     function run() external {
//         // User address to mint tokens to (replace with desired address)
//         // address userAddress = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

//         address userAddress = 0x2a8a76Bcf495a02452969e604d16cFd3A7b78005;

//         uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
//         vm.startBroadcast(deployerPrivateKey);
//         // vm.deal(userAddress, 100 ether);

//         // Deploy contracts
//         CookieJarRegistry cookieJarRegistry = new CookieJarRegistry();
//         CookieJarFactory cookieJarFactory = new CookieJarFactory(defaultFeeCollector, address(cookieJarRegistry), admin);
//         cookieJarRegistry.setCookieJarFactory(address(cookieJarFactory));

//         // Deploy dummy tokens
//         token = new DummyERC20();
//         dummyERC721 = new DummyERC721();
//         dummyERC1155 = new DummyERC1155();

//         // Mint tokens to user address
//         // Mint ERC20 tokens

//         // Create CookieJars (same as before)
//         address[] memory emptyAddresses = new address[](0);
//         uint8[] memory emptyTypes = new uint8[](0);
//     jarWhitelist = CookieJar(payable(cookieJarFactory.createCookieJar{value:100 wei}(
//     admin,
//     CookieJar.AccessType.Whitelist,
//     emptyAddresses,
//     emptyTypes,
//     CookieJar.WithdrawalTypeOptions.Fixed,
//     fixedAmount,
//     maxWithdrawal,
//     withdrawalInterval,
//     strictPurpose,
//     true,
//     "White listed cookiejar"
// )));

//         address[] memory nftAddresses = new address[](1);
//         nftAddresses[0] = address(dummyERC721);
//         uint8[] memory nftTypes = new uint8[](1);
//         nftTypes[0] = uint8(CookieJar.NFTType.ERC721);

// jarNFT = CookieJar(payable(cookieJarFactory.createCookieJar{value:100 wei}(
//     admin,
//     CookieJar.AccessType.NFTGated,
//     nftAddresses,
//     nftTypes,
//     CookieJar.WithdrawalTypeOptions.Fixed,
//     fixedAmount,
//     maxWithdrawal,
//     withdrawalInterval,
//     strictPurpose,
//     true,
//     "NFT Cookie jar"
// )));

//         // Log deployed contract addresses
//         console.log("CookieJarRegistry deployed at:", address(cookieJarRegistry));
//         console.log("CookieJarFactory deployed at:", address(cookieJarFactory));
//         console.log("Token deployed at:", address(token));
//         console.log("DummyERC721 deployed at:", address(dummyERC721));
//         console.log("DummyERC1155 deployed at:", address(dummyERC1155));
//         console.log("JarWhitelist deployed at:", address(jarWhitelist));
//         console.log("JarNFT deployed at:", address(jarNFT));

//         // Log user address and minted amounts
//         console.log("User Address:", userAddress);
//         dummyERC721.safeMint(userAddress);
//         console.log("Minted ERC20 Tokens:", token.balanceOf(userAddress));
//         console.log("Minted ERC721 Token ID:", dummyERC721.balanceOf(userAddress));
//         console.log("Minted ERC1155 Token Amount:", dummyERC1155.balanceOf(userAddress, 0));

//         vm.stopBroadcast();
//     }
// }
