# 🎮 **Cookie Jar NFT Testing Guide**

Complete guide for testing NFT-gated functionality in Cookie Jar's local development environment.

---

## 📋 **Quick Reference**

### **🎯 Test NFT Contract Address**

**⚠️ ADDRESS CHANGES**: The NFT contract address will be different on each Anvil restart.

**To get the current NFT address:**
1. Start development environment: `pnpm run dev`
2. **Quick method**: Run `pnpm nft:address` in a new terminal
3. **Manual method**: Look for this line in dev terminal output:
   ```
   NFT Contract Address: 0x[ADDRESS]
   ```
4. **Copy that address** for creating NFT-gated jars

- **Deployer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Note**: Address changes on Anvil restart - always use `pnpm nft:address` to get current address 📱

### **🔑 Test Accounts with Pre-Minted NFTs**
| Account | Address | Private Key | NFT Token |
|---------|---------|-------------|-----------|
| Cookie Monster | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Token ID #0 |
| Cookie Fan | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Token ID #1 |
| Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | No NFT |

---

## 🚀 **Getting Started**

### **1. Start Development Environment**
```bash
cd /Users/afo/Code/greenpill/cookie-jar
pnpm run dev
```

Wait for:
- ✅ Anvil blockchain starts
- ✅ Contracts deploy successfully
- ✅ NFTs minted to test accounts
- ✅ Client starts on http://localhost:3000

### **2. Find NFT Contract Address**
Look for this in the terminal output:
```
NFT Contract Address (DETERMINISTIC): 0x[ADDRESS]
```

---

## 🛠️ **Quick Commands**

### **Essential Testing Commands**
```bash
# Start full dev environment
pnpm run dev

# Get NFT contract address quickly
pnpm nft:address

# Restart clean environment  
pnpm seed:reset
```

---

## 🧪 **Testing Scenarios**

### **A. Test Existing NFT-Gated Jars**

**🎯 Two pre-created NFT-gated jars are ready for testing:**

#### **1. Cookie Monster Benefits Jar** (ETH, Variable Withdrawals)
- **Type**: NFT-Gated + ETH + Variable Amount
- **Requirements**: Own CookieMonsterNFT (any token ID)
- **Withdrawal**: Up to 0.25 ETH every 14 days
- **Balance**: ~4.95 ETH (pre-funded)

**Test Flow:**
1. Connect wallet with Cookie Monster account
2. Navigate to jar (address shown in terminal logs)
3. Verify NFT ownership is detected
4. Test withdrawal (should allow up to 0.25 ETH)
5. Wait/skip time and test repeated withdrawals

#### **2. Cookie Monster Airdrop Jar** (ERC20, One-time)
- **Type**: NFT-Gated + ERC20 + One-time Only
- **Requirements**: Own CookieMonsterNFT (any token ID)  
- **Withdrawal**: 5,000 DEMO tokens (once per NFT holder)
- **Balance**: ~49,500 DEMO tokens (pre-funded)

**Test Flow:**
1. Connect wallet with Cookie Monster account
2. Navigate to jar (address shown in terminal logs)
3. Verify NFT ownership is detected
4. Test one-time withdrawal (5K DEMO tokens)
5. Verify subsequent withdrawal attempts are blocked

---

### **B. Create New NFT-Gated Jars**

#### **Basic NFT Jar Creation**
1. **Go to Create Jar** page
2. **Set Basic Info**: Name, description, etc.
3. **Choose Access Type**: Select "NFT Collection"
4. **Enter NFT Details**:
   - **Contract Address**: `[NFT ADDRESS FROM LOGS]`
   - **Type**: ERC721
   - **Validation**: Should show green checkmark if valid
5. **Set Withdrawal Rules**: Amount, frequency, etc.
6. **Deploy & Fund**: Create jar and add initial funds

#### **Advanced NFT Scenarios**

**🔄 Multiple NFT Gates**
- Test adding multiple NFT contracts to same jar
- Mix ERC721 and ERC1155 (though only ERC721 available in demo)

**💰 Different Token Types**
- Create ETH-based NFT jar
- Create ERC20-based NFT jar (use DEMO token address from logs)

**⚡ Withdrawal Patterns**
- Fixed amount + time intervals
- Variable amount + cooldown periods  
- One-time airdrops

---

### **C. Negative Testing**

#### **Access Control Testing**
1. **Connect with Deployer account** (no NFTs)
2. **Try to access NFT-gated jar**
3. **Verify rejection**: Should show "NFT ownership required"

#### **Contract Validation Testing** 
1. **Enter invalid contract address** in jar creation
2. **Verify error handling**: Should show validation error
3. **Enter valid address of wrong type** (e.g., ERC20 address)
4. **Verify type mismatch detection**

---

### **D. NFT Detection & Validation**

#### **Real-time NFT Validation**
1. **Create jar form**: Enter NFT contract address
2. **Watch validation**: Should detect ERC721/ERC1155 automatically
3. **Type mismatch**: Select wrong type, verify warning appears
4. **Invalid address**: Enter non-contract address, verify error

#### **User NFT Detection**
1. **Connect wallet with NFT holder**
2. **Navigate to NFT-gated jar**
3. **Verify ownership detection**: Should show "✅ You own this NFT"
4. **Switch to non-holder account**
5. **Verify restriction**: Should show access denied message

---

## 🛠️ **Development & Debugging**

### **Useful Console Commands**

**Check NFT Ownership:**
```javascript
// In browser console (with wagmi/viem)
const nftContract = '0x[NFT_ADDRESS]';
const userAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
// Check balance
```

**Monitor Events:**
- Watch for `Transfer` events on NFT contract
- Monitor `Withdrawal` events on jar contracts
- Check `NFTGateAdded` events during jar creation

### **Common Issues & Solutions**

❌ **"NFT not detected"**
- ✅ Verify contract address is correct
- ✅ Check contract implements ERC721/ERC1155
- ✅ Confirm network is localhost:8545

❌ **"Access denied despite owning NFT"** 
- ✅ Refresh page to re-check ownership
- ✅ Verify correct wallet is connected
- ✅ Check NFT was minted to current account

❌ **"Contract validation failed"**
- ✅ Ensure Anvil is running
- ✅ Check contract was deployed successfully
- ✅ Verify RPC connection (localhost:8545)

---

## 🔄 **Reset & Restart**

### **When to Restart Development Environment**
- Anvil crashes or becomes unresponsive
- Contract addresses change unexpectedly
- Need fresh blockchain state

### **Restart Process**
```bash
# Stop current processes
pkill -f "anvil|next"

# Restart everything
pnpm run dev
```

### **After Restart**
- ✅ New NFT contract will have **same deterministic address**
- ✅ NFTs will be re-minted to same test accounts
- ✅ All jar addresses will be consistent
- ✅ Blockchain state resets to genesis

---

## 📊 **Test Checklist**

### **✅ Basic Functionality**
- [ ] NFT contract deploys to deterministic address
- [ ] Test accounts receive NFTs (Token IDs 0 & 1)
- [ ] Client detects NFT ownership correctly
- [ ] Jar creation with NFT gating works
- [ ] Access control prevents non-holders

### **✅ Advanced Features**
- [ ] Variable withdrawal amounts work
- [ ] One-time withdrawal enforcement  
- [ ] Time-based cooldown periods
- [ ] Emergency withdrawal (if enabled)
- [ ] Multiple NFT requirements

### **✅ UI/UX Testing**
- [ ] Real-time contract validation
- [ ] Clear error messages for failures
- [ ] Visual indicators for NFT ownership
- [ ] Responsive design on mobile
- [ ] Accessible keyboard navigation

### **✅ Edge Cases**
- [ ] Invalid contract addresses
- [ ] Type mismatches (ERC20 vs ERC721)
- [ ] Network switching during interaction
- [ ] Wallet disconnection/reconnection
- [ ] Insufficient jar balance for withdrawals

---

## 🎯 **Test Data Summary**

**Essential Information to Copy:**
```
NFT Contract: [CHECK TERMINAL LOGS - DETERMINISTIC ADDRESS]
Test Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Has Token ID #0)
Test Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Has Token ID #1)
Non-NFT Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (No NFTs)
```

**Happy Path Test:**
1. Create NFT jar with deterministic NFT address
2. Connect with Token ID #0 holder
3. Successfully withdraw from jar
4. Switch to non-holder → Access denied ✅

---

*This guide ensures comprehensive testing of Cookie Jar's NFT gating system with predictable, deterministic addresses for reliable development workflows!* 🍪
