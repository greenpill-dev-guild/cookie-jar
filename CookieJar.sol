// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
* @title CookieJar
* @dev A contract that allows controlled distribution of tokens ("cookies") to eligible users
* with configurable access control, withdrawal rules, and purpose tracking.
*/
contract CookieJar is Ownable, ReentrancyGuard {
   using SafeERC20 for IERC20;

   // ============ Constants ============
   uint256 public constant FEE_PERCENTAGE = 1; // 1% fee
   uint256 public constant MAX_WHITELIST_SIZE = 500;
   uint256 public constant MAX_NFT_GATES = 5;
   uint256 public constant PERCENTAGE_BASE = 100;
   uint256 public constant MIN_PURPOSE_LENGTH = 10;

   // ============ Structs ============
   struct NFTGate {
       address nftAddress;
       uint256 tokenId; // For ERC1155 or specific ERC721 token
       bool isERC1155;
       uint256 minBalance; // Minimum balance required
   }

   struct WithdrawalRecord {
       address user;
       uint256 amount;
       string purpose;
       uint256 timestamp;
   }

   struct JarConfig {
       string name;
       string description;
       uint256 maxWithdrawalAmount; // Max amount per withdrawal
       uint256 cooldownPeriod; // Time between withdrawals
       bool requirePurpose; // Whether purpose is required for withdrawal
       bool fixedWithdrawalAmount; // If true, only maxWithdrawalAmount can be withdrawn
       bool emergencyWithdrawalEnabled; // If true, admin can withdraw all funds
   }

   // ============ State Variables ============
   address public feeCollector;
   JarConfig public jarConfig;
   
   // Access control
   bool public useWhitelist;
   mapping(address => bool) public whitelist;
   address[] public whitelistedAddresses;
   mapping(address => bool) public blacklist;
   
   // NFT gating
   NFTGate[] public nftGates;
   
   // Withdrawal tracking
   mapping(address => uint256) public lastWithdrawalTime;
   WithdrawalRecord[] public withdrawalHistory;
   
   // Multi-admin support
   mapping(address => bool) public isAdmin;
   
   // ============ Events ============
   event Deposit(address indexed sender, address indexed token, uint256 amount);
   event Withdrawal(address indexed user, address indexed token, uint256 amount, string purpose);
   event WhitelistUpdated(address indexed user, bool isWhitelisted);
   event BlacklistUpdated(address indexed user, bool isBlacklisted);
   event NFTGateAdded(address indexed nftAddress, uint256 tokenId, bool isERC1155, uint256 minBalance);
   event NFTGateRemoved(uint256 indexed gateIndex);
   event AdminUpdated(address indexed admin, bool isAdmin);
   event FeeCollectorUpdated(address indexed newFeeCollector);
   event JarConfigUpdated();
   event EmergencyWithdrawal(address indexed admin, address indexed token, uint256 amount);

   // ============ Modifiers ============
   modifier onlyAdmin() {
       require(isAdmin[msg.sender] || owner() == msg.sender, "CookieJar: not admin");
       _;
   }

   modifier notBlacklisted() {
       require(!blacklist[msg.sender], "CookieJar: blacklisted");
       _;
   }

   modifier canWithdraw() {
       require(isEligibleToWithdraw(msg.sender), "CookieJar: not eligible to withdraw");
       require(
           block.timestamp >= lastWithdrawalTime[msg.sender] + jarConfig.cooldownPeriod,
           "CookieJar: cooldown period not elapsed"
       );
       _;
   }

   // ============ Constructor ============
   constructor(
       string memory _name,
       string memory _description,
       uint256 _maxWithdrawalAmount,
       uint256 _cooldownPeriod,
       bool _requirePurpose,
       bool _fixedWithdrawalAmount,
       bool _emergencyWithdrawalEnabled,
       bool _useWhitelist,
       address _feeCollector
   ) Ownable(msg.sender) ReentrancyGuard() {
       jarConfig = JarConfig({
           name: _name,
           description: _description,
           maxWithdrawalAmount: _maxWithdrawalAmount,
           cooldownPeriod: _cooldownPeriod,
           requirePurpose: _requirePurpose,
           fixedWithdrawalAmount: _fixedWithdrawalAmount,
           emergencyWithdrawalEnabled: _emergencyWithdrawalEnabled
       });
       
       useWhitelist = _useWhitelist;
       feeCollector = _feeCollector;
       
       // Set deployer as admin
       isAdmin[msg.sender] = true;
   }

   // ============ External Functions ============
   
   /**
    * @dev Deposit ETH into the jar
    */
   receive() external payable {
       _processDeposit(address(0), msg.value);
   }
   
   /**
    * @dev Deposit ETH into the jar
    */
   function depositETH() external payable {
       _processDeposit(address(0), msg.value);
   }
   
   /**
    * @dev Deposit ERC20 tokens into the jar
    * @param token The ERC20 token address
    * @param amount The amount to deposit
    */
   function depositERC20(address token, uint256 amount) external {
       require(token != address(0), "CookieJar: invalid token");
       require(amount > 0, "CookieJar: amount must be > 0");
       
       // Transfer tokens from sender to this contract
       IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
       
       _processDeposit(token, amount);
   }
   
   /**
    * @dev Withdraw ETH from the jar
    * @param amount The amount to withdraw
    * @param purpose The purpose of the withdrawal
    */
   function withdrawETH(uint256 amount, string calldata purpose) external nonReentrant canWithdraw notBlacklisted {
       _processWithdrawal(address(0), amount, purpose);
   }
   
   /**
    * @dev Withdraw ERC20 tokens from the jar
    * @param token The ERC20 token address
    * @param amount The amount to withdraw
    * @param purpose The purpose of the withdrawal
    */
   function withdrawERC20(address token, uint256 amount, string calldata purpose) external nonReentrant canWithdraw notBlacklisted {
       require(token != address(0), "CookieJar: invalid token");
       _processWithdrawal(token, amount, purpose);
   }
   
   /**
    * @dev Emergency withdrawal of all funds by admin
    * @param token The token address (address(0) for ETH)
    */
   function emergencyWithdraw(address token) external onlyAdmin {
       require(jarConfig.emergencyWithdrawalEnabled, "CookieJar: emergency withdrawal disabled");
       
       uint256 amount;
       if (token == address(0)) {
           amount = address(this).balance;
           (bool success, ) = msg.sender.call{value: amount}("");
           require(success, "CookieJar: ETH transfer failed");
       } else {
           amount = IERC20(token).balanceOf(address(this));
           IERC20(token).safeTransfer(msg.sender, amount);
       }
       
       emit EmergencyWithdrawal(msg.sender, token, amount);
   }
   
   // ============ Admin Functions ============
   
   /**
    * @dev Add an address to the whitelist
    * @param user The address to whitelist
    */
   function addToWhitelist(address user) external onlyAdmin {
       require(!whitelist[user], "CookieJar: already whitelisted");
       require(whitelistedAddresses.length < MAX_WHITELIST_SIZE, "CookieJar: whitelist full");
       
       whitelist[user] = true;
       whitelistedAddresses.push(user);
       
       emit WhitelistUpdated(user, true);
   }
   
   /**
    * @dev Remove an address from the whitelist
    * @param user The address to remove
    */
   function removeFromWhitelist(address user) external onlyAdmin {
       require(whitelist[user], "CookieJar: not whitelisted");
       
       whitelist[user] = false;
       
       // Remove from array (swap and pop)
       for (uint256 i = 0; i < whitelistedAddresses.length; i++) {
           if (whitelistedAddresses[i] == user) {
               whitelistedAddresses[i] = whitelistedAddresses[whitelistedAddresses.length - 1];
               whitelistedAddresses.pop();
               break;
           }
       }
       
       emit WhitelistUpdated(user, false);
   }
   
   /**
    * @dev Add an address to the blacklist
    * @param user The address to blacklist
    */
   function addToBlacklist(address user) external onlyAdmin {
       require(!blacklist[user], "CookieJar: already blacklisted");
       
       blacklist[user] = true;
       
       emit BlacklistUpdated(user, true);
   }
   
   /**
    * @dev Remove an address from the blacklist
    * @param user The address to remove
    */
   function removeFromBlacklist(address user) external onlyAdmin {
       require(blacklist[user], "CookieJar: not blacklisted");
       
       blacklist[user] = false;
       
       emit BlacklistUpdated(user, false);
   }
   
   /**
    * @dev Add an NFT gate
    * @param nftAddress The NFT contract address
    * @param tokenId The token ID (for ERC1155 or specific ERC721)
    * @param isERC1155 Whether the NFT is ERC1155
    * @param minBalance The minimum balance required
    */
   function addNFTGate(address nftAddress, uint256 tokenId, bool isERC1155, uint256 minBalance) external onlyAdmin {
       require(nftGates.length < MAX_NFT_GATES, "CookieJar: max NFT gates reached");
       require(nftAddress != address(0), "CookieJar: invalid NFT address");
       require(minBalance > 0, "CookieJar: min balance must be > 0");
       
       nftGates.push(NFTGate({
           nftAddress: nftAddress,
           tokenId: tokenId,
           isERC1155: isERC1155,
           minBalance: minBalance
       }));
       
       emit NFTGateAdded(nftAddress, tokenId, isERC1155, minBalance);
   }
   
   /**
    * @dev Remove an NFT gate
    * @param index The index of the NFT gate to remove
    */
   function removeNFTGate(uint256 index) external onlyAdmin {
       require(index < nftGates.length, "CookieJar: invalid gate index");
       
       // Swap and pop
       nftGates[index] = nftGates[nftGates.length - 1];
       nftGates.pop();
       
       emit NFTGateRemoved(index);
   }
   
   /**
    * @dev Set admin status for an address
    * @param admin The address to update
    * @param status The admin status
    */
   function setAdmin(address admin, bool status) external onlyOwner {
       require(admin != address(0), "CookieJar: invalid admin address");
       
       isAdmin[admin] = status;
       
       emit AdminUpdated(admin, status);
   }
   
   /**
    * @dev Update the fee collector address
    * @param newFeeCollector The new fee collector address
    */
   function setFeeCollector(address newFeeCollector) external onlyOwner {
       require(newFeeCollector != address(0), "CookieJar: invalid fee collector");
       
       feeCollector = newFeeCollector;
       
       emit FeeCollectorUpdated(newFeeCollector);
   }
   
   /**
    * @dev Update the jar configuration
    * @param _name The jar name
    * @param _description The jar description
    * @param _maxWithdrawalAmount The maximum withdrawal amount
    * @param _cooldownPeriod The cooldown period between withdrawals
    * @param _requirePurpose Whether purpose is required for withdrawal
    * @param _fixedWithdrawalAmount Whether withdrawal amount is fixed
    * @param _emergencyWithdrawalEnabled Whether emergency withdrawal is enabled
    */
   function updateJarConfig(
       string memory _name,
       string memory _description,
       uint256 _maxWithdrawalAmount,
       uint256 _cooldownPeriod,
       bool _requirePurpose,
       bool _fixedWithdrawalAmount,
       bool _emergencyWithdrawalEnabled
   ) external onlyAdmin {
       jarConfig = JarConfig({
           name: _name,
           description: _description,
           maxWithdrawalAmount: _maxWithdrawalAmount,
           cooldownPeriod: _cooldownPeriod,
           requirePurpose: _requirePurpose,
           fixedWithdrawalAmount: _fixedWithdrawalAmount,
           emergencyWithdrawalEnabled: _emergencyWithdrawalEnabled
       });
       
       emit JarConfigUpdated();
   }
   
   /**
    * @dev Toggle whitelist mode
    * @param _useWhitelist Whether to use whitelist
    */
   function setUseWhitelist(bool _useWhitelist) external onlyAdmin {
       useWhitelist = _useWhitelist;
   }
   
   // ============ View Functions ============
   
   /**
    * @dev Check if an address is eligible to withdraw
    * @param user The address to check
    * @return Whether the address is eligible
    */
   function isEligibleToWithdraw(address user) public view returns (bool) {
       // Check blacklist first
       if (blacklist[user]) {
           return false;
       }
       
       // If whitelist is enabled, check whitelist
       if (useWhitelist) {
           return whitelist[user];
       }
       
       // If no NFT gates, everyone is eligible
       if (nftGates.length == 0) {
           return true;
       }
       
       // Check NFT gates
       for (uint256 i = 0; i < nftGates.length; i++) {
           NFTGate memory gate = nftGates[i];
           
           if (gate.isERC1155) {
               uint256 balance = IERC1155(gate.nftAddress).balanceOf(user, gate.tokenId);
               if (balance >= gate.minBalance) {
                   return true;
               }
           } else {
               // For ERC721, we check if user owns the specific token or any token
               if (gate.tokenId == 0) {
                   // Check if user owns any token
                   uint256 balance = IERC721(gate.nftAddress).balanceOf(user);
                   if (balance >= gate.minBalance) {
                       return true;
                   }
               } else {
                   // Check if user owns the specific token
                   try IERC721(gate.nftAddress).ownerOf(gate.tokenId) returns (address owner) {
                       if (owner == user) {
                           return true;
                       }
                   } catch {
                       // Token doesn't exist or other error
                   }
               }
           }
       }
       
       return false;
   }
   
   /**
    * @dev Get the balance of a token in the jar
    * @param token The token address (address(0) for ETH)
    * @return The balance
    */
   function getBalance(address token) external view returns (uint256) {
       if (token == address(0)) {
           return address(this).balance;
       } else {
           return IERC20(token).balanceOf(address(this));
       }
   }
   
   /**
    * @dev Get the number of withdrawal records
    * @return The number of withdrawal records
    */
   function getWithdrawalHistoryLength() external view returns (uint256) {
       return withdrawalHistory.length;
   }
   
   /**
    * @dev Get the number of whitelisted addresses
    * @return The number of whitelisted addresses
    */
   function getWhitelistLength() external view returns (uint256) {
       return whitelistedAddresses.length;
   }
   
   /**
    * @dev Get the number of NFT gates
    * @return The number of NFT gates
    */
   function getNFTGatesLength() external view returns (uint256) {
       return nftGates.length;
   }
   
   // ============ Internal Functions ============
   
   /**
    * @dev Process a deposit
    * @param token The token address (address(0) for ETH)
    * @param amount The amount deposited
    */
   function _processDeposit(address token, uint256 amount) internal {
       // Calculate fee
       uint256 fee = (amount * FEE_PERCENTAGE) / PERCENTAGE_BASE;
       uint256 remainingAmount = amount - fee;
       
       // Transfer fee to fee collector if not zero
       if (fee > 0) {
           if (token == address(0)) {
               // ETH
               (bool success, ) = feeCollector.call{value: fee}("");
               require(success, "CookieJar: fee transfer failed");
           } else {
               // ERC20
               IERC20(token).safeTransfer(feeCollector, fee);
           }
       }
       
       emit Deposit(msg.sender, token, remainingAmount);
   }
   
   /**
    * @dev Process a withdrawal
    * @param token The token address (address(0) for ETH)
    * @param amount The amount to withdraw
    * @param purpose The purpose of the withdrawal
    */
   function _processWithdrawal(address token, uint256 amount, string calldata purpose) internal {
       // Check purpose requirement
       if (jarConfig.requirePurpose) {
           require(bytes(purpose).length >= MIN_PURPOSE_LENGTH, "CookieJar: purpose too short");
       }
       
       // Check withdrawal amount
       require(amount > 0, "CookieJar: amount must be > 0");
       require(
           amount <= jarConfig.maxWithdrawalAmount,
           "CookieJar: amount exceeds max withdrawal"
       );
       
       // If fixed withdrawal amount is enabled, only allow maxWithdrawalAmount
       if (jarConfig.fixedWithdrawalAmount) {
           require(
               amount == jarConfig.maxWithdrawalAmount,
               "CookieJar: must withdraw exact amount"
           );
       }
       
       // Check if there are enough funds
       if (token == address(0)) {
           require(address(this).balance >= amount, "CookieJar: insufficient ETH");
       } else {
           require(
               IERC20(token).balanceOf(address(this)) >= amount,
               "CookieJar: insufficient tokens"
           );
       }
       
       // Update last withdrawal time
       lastWithdrawalTime[msg.sender] = block.timestamp;
       
       // Record withdrawal
       withdrawalHistory.push(WithdrawalRecord({
           user: msg.sender,
           amount: amount,
           purpose: purpose,
           timestamp: block.timestamp
       }));
       
       // Transfer funds
       if (token == address(0)) {
           // ETH
           (bool success, ) = msg.sender.call{value: amount}("");
           require(success, "CookieJar: ETH transfer failed");
       } else {
           // ERC20
           IERC20(token).safeTransfer(msg.sender, amount);
       }
       
       emit Withdrawal(msg.sender, token, amount, purpose);
   }
}

