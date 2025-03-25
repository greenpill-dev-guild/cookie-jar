// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import { Script } from "forge-std/Script.sol";
import {CookieJar} from "../src/CookieJar.sol";
import {CookieJarFactory} from "../src/CookieJarFactory.sol";
import {CookieJarRegistry} from "../src/CookieJarRegistry.sol";// --- Mock ERC20 ---
import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {console} from "forge-std/console.sol";

contract DummyERC20 is ERC20 {
    constructor() ERC20("Dummy", "DUM") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// --- Mock ERC721 ---
import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
contract DummyERC721 is ERC721 {
    uint256 public nextTokenId;
    constructor() ERC721("Dummy721", "D721") {}
    function mint(address to) external returns (uint256) {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        nextTokenId++;
        return tokenId;
    }
}

// --- Mock ERC1155 ---
import "../lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
contract DummyERC1155 is ERC1155 {
    constructor() ERC1155("https://dummy.uri/") {}
    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }
}


/**
 * @title CookieJarFactory Deployment Script
 * @dev This script deploys the CookieJarFactory contract and sets up initial parameters.
 */
contract DeployCookieJarFactory is Script {

    // Define addresses for deployment, these can be changed or set in .env if needed.
    address defaultFeeCollector = 0x9ED3f77Bb53C2b37Cf86BfBed0Df8D0867a7F9dc; // Replace with actual fee collector address
    CookieJar public jarWhitelist;
    CookieJar public jarNFT;
    address public admin = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address public feeCollector = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    uint256 public withdrawalInterval = 1 days;
    uint256 public fixedAmount = 1 ether;
    uint256 public maxWithdrawal = 2 ether;
    bool public strictPurpose = true;
    DummyERC20 public token;
    DummyERC721 public dummyERC721;
    DummyERC1155 public dummyERC1155;


    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");        
        // Start broadcast for transaction
        vm.startBroadcast(deployerPrivateKey);
        CookieJarRegistry cookieJarRegistry = new CookieJarRegistry();
        CookieJarFactory cookieJarFactory = new CookieJarFactory(defaultFeeCollector, address(cookieJarRegistry),1);
        cookieJarRegistry.setCookieJarFactory(address(cookieJarFactory));
        token = new DummyERC20();
        dummyERC721 = new DummyERC721();
        dummyERC1155 = new DummyERC1155();

        // --- Create a CookieJar in Whitelist mode ---
        // For Whitelist mode, NFT arrays are ignored.
        address[] memory emptyAddresses = new address[](0);
        uint8[] memory emptyTypes = new uint8[](0);
        jarWhitelist = new CookieJar(
            admin,
            CookieJar.AccessType.Whitelist,
            emptyAddresses,
            emptyTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true // emergencyWithdrawalEnabled
        );

        // --- Create a CookieJar in NFTGated mode with one approved NFT gate (ERC721) ---
        address[] memory nftAddresses = new address[](1);
        nftAddresses[0] = address(dummyERC721);
        uint8[] memory nftTypes = new uint8[](1);
        nftTypes[0] = uint8(CookieJar.NFTType.ERC721);
        jarNFT = new CookieJar(
            admin,
            CookieJar.AccessType.NFTGated,
            nftAddresses,
            nftTypes,
            CookieJar.WithdrawalTypeOptions.Fixed,
            fixedAmount,
            maxWithdrawal,
            withdrawalInterval,
            strictPurpose,
            feeCollector,
            true // emergencyWithdrawalEnabled
        );

        console.log("CookieJarRegistry deployed at:", address(cookieJarRegistry));
        console.log("CookieJarFactory deployed at:", address(cookieJarFactory));
        console.log("Token deployed at:", address(token));
        console.log("DummyERC721 deployed at:", address(dummyERC721));
        console.log("DummyERC1155 deployed at:", address(dummyERC1155));
        console.log("JarWhitelist deployed at:", address(jarWhitelist));
        console.log("JarNFT deployed at:", address(jarNFT));

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}