# 🍪 Cookie Jar Protocol - Vibe Coding Session Guide

Welcome to the **Cookie Jar Protocol** vibe coding session! Build decentralized funding pools with **zero configuration** setup. 🚀

## 🎯 **What is Cookie Jar?**

Cookie Jar is a **decentralized funding protocol** that creates programmable "jars" (smart contracts) for controlled fund distribution:

- 🏦 **Create funding pools** with ETH or ERC20 tokens
- 👥 **Control access** via whitelists or NFT ownership  
- 💰 **Set withdrawal rules** (fixed amounts, intervals, one-time claims)
- 🔒 **Emergency controls** for jar owners
- 📊 **Track everything** on-chain with metadata
- 🎨 **NFT-gated access** with Cookie Monster NFTs!

### **Real-world Use Cases:**
- Community airdrops and grants 🎁
- DAO treasury distributions 🏛️  
- Team salary payments 💼
- Emergency funding pools 🚨
- NFT holder benefits 🖼️

---

## 🚀 **Quick Start (Zero Config!)**

**Fork this repo first, then:**

```bash
git clone <your-fork-url>
cd cookie-jar

# ONE command setup - no environment files needed!
pnpm install && pnpm dev
```

**🎉 That's it!** Your complete development environment is now running with:
- ✅ **Ethereum mainnet fork** (latest state)
- ✅ **10 funded test accounts** (1000 ETH each)
- ✅ **Deployed contracts** with auto-reloading
- ✅ **Frontend** at http://localhost:3000
- ✅ **Pre-seeded demo data** with Cookie Monster NFTs!

---

## 🔑 **Test Accounts & Private Keys**

**All accounts pre-funded with 1000 ETH:**

| Account | Role | Address | Private Key |
|---------|------|---------|-------------|
| **#0** | **Deployer/Owner** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **#1** | **Cookie Monster** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **#2** | **Cookie Fan** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **#3** | **Test User** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

> ⚠️ **Security Note**: These are well-known test keys for **local development only**. Never use on mainnet!

---

## 🔗 **Connect Your Wallet**

### **1. Add Local Network to MetaMask**

| Setting | Value |
|---------|-------|
| **Network Name** | Cookie Jar Local (Ethereum Fork) |
| **RPC URL** | `http://127.0.0.1:8545` |
| **Chain ID** | `31337` |
| **Currency Symbol** | `ETH` |
| **Block Explorer** | *(leave blank)* |

### **2. Import Test Accounts**

1. **Click MetaMask account menu** → "Import Account"
2. **Select "Private Key"**
3. **Paste any private key** from the table above
4. **Verify balance** shows ~1000 ETH

### **3. Connect to Frontend**

1. **Open** http://localhost:3000
2. **Click "Connect Wallet"**
3. **Select MetaMask** and approve
4. **Switch to Cookie Jar Local network** if prompted

---

## 🎨 **Cookie Monster NFT Demo**

Your environment automatically deploys **Cookie Monster NFTs** for testing NFT-gated access:

### **Cookie Monster Collection:**
- 🍪 **Contract**: Auto-deployed ERC721 "Cookie Monster NFT"
- 🎭 **Owners**: Account #1 (Cookie Monster) and Account #2 (Cookie Fan) get NFTs
- 🏺 **Access**: Special Cookie Monster jar only accessible to NFT holders
- 🎁 **Benefits**: NFT holders can claim exclusive rewards

### **Test NFT Gating:**
1. **Connect Account #1** (has Cookie Monster NFT)
2. **Try accessing** the NFT-gated jar
3. **Switch to Account #3** (no NFT) 
4. **See access denied** - NFT required!

---

## 🏺 **Pre-Seeded Demo Jars**

Your environment comes with **4 demo cookie jars** showcasing different configurations:

### **1. 🏛️ Community Stipend**
- **Access**: Whitelist (Accounts #1, #2)
- **Token**: ETH
- **Amount**: 0.1 ETH fixed per withdrawal
- **Interval**: 7 days (weekly)
- **Use Case**: Regular community payments

### **2. 💰 Grants Program** 
- **Access**: Whitelist (Accounts #1, #2)
- **Token**: DEMO ERC20 tokens
- **Amount**: Up to 10,000 tokens (variable)
- **Interval**: 30 days (monthly)
- **Special**: Purpose required (20+ chars)

### **3. 🍪 Cookie Monster Benefits**
- **Access**: Cookie Monster NFT holders only
- **Token**: ETH  
- **Amount**: Up to 0.25 ETH (variable)
- **Interval**: 14 days (bi-weekly)
- **Exclusive**: Only for NFT collectors!

### **4. 🎪 One-Time Airdrop**
- **Access**: Cookie Monster NFT holders
- **Token**: DEMO ERC20 tokens
- **Amount**: 5,000 tokens (fixed)
- **Interval**: One-time claim only
- **Perfect for**: Token distributions

---

## 🛠️ **Development Commands**

```bash
# 🎯 Core Workflow
pnpm dev              # Start everything + auto-seed
pnpm test             # Run all tests
pnpm build            # Build for production

# 🔧 Development Helpers  
pnpm seed:demo        # Re-run seeding (if needed)
pnpm seed:reset       # Reset + restart everything
pnpm contracts:watch  # Watch contracts only
pnpm types:generate   # Regenerate frontend types

# 🧪 Testing & Validation
pnpm test:contracts   # Smart contract tests (106 tests)
pnpm test:frontend    # Frontend component tests
pnpm lint             # Code quality checks
pnpm accounts:list    # Show all test accounts
```

---

## 🎮 **Speed Run Development Challenges**

### **🟢 Beginner (5 minutes)**
- **Connect wallet** and switch between test accounts
- **Try withdrawals** from different jar types
- **Test access controls** (whitelist vs NFT-gated)
- **Create your first jar** with custom rules

### **🟡 Intermediate (15 minutes)**
- **Deploy custom ERC20 token** for your jar
- **Modify withdrawal intervals** and test timing
- **Add/remove users** from whitelists
- **Test emergency withdrawal** functionality

### **🔴 Advanced (30+ minutes)**
- **Create new NFT collection** for gating
- **Build custom withdrawal strategies** in contracts
- **Add governance voting** to jar management
- **Implement yield farming** for deposited funds

---

## 📚 **Key Resources & Documentation**

### **🔗 Essential Links**
- **[Smart Contract Architecture](./contracts/README.md)** - Contract design deep-dive
- **[Local Dev Setup](./LOCAL-DEV-README.md)** - Complete setup instructions
- **[Frontend Components](./frontend/components/)** - UI building blocks
- **[Contract Tests](./contracts/test/)** - Usage examples (106 tests)

### **🧪 Contract Architecture**
- **`CookieJarFactory`** - Creates and manages cookie jars
- **`CookieJar`** - Individual funding pool with withdrawal logic  
- **`CookieJarLib`** - Shared types, events, and utilities
- **Test Tokens** - ERC20, ERC721, ERC1155 for demo

### **📖 Frontend Stack**
- **React + TypeScript** with Next.js 15
- **TailwindCSS** for styling
- **wagmi + viem** for Web3 integration
- **Auto-generated types** from contracts

---

## 🔧 **Anvil Local Development**

Your setup uses **Foundry's Anvil** for the local blockchain:

### **Configuration:**
```bash
anvil \
  --host 0.0.0.0 \           # Accept connections from any IP
  --port 8545 \              # Standard Ethereum RPC port  
  --fork-url https://eth.drpc.org \  # Fork Ethereum mainnet
  --chain-id 31337 \         # Local development chain ID
  --accounts 10 \            # Generate 10 accounts
  --balance 1000             # 1000 ETH per account
```

### **Features:**
- ✅ **Deterministic accounts** - same addresses every time
- ✅ **Mainnet state** - all mainnet contracts available
- ✅ **Instant mining** - no block time delays
- ✅ **Reset capability** - clean slate for testing
- ✅ **Gas-free** - unlimited gas for development

### **Anvil Commands:**
```bash
# Check account balance
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://127.0.0.1:8545

# Send ETH between accounts
cast send 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --value 1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545

# Get latest block
cast block-number --rpc-url http://127.0.0.1:8545

# Call contract function
cast call <CONTRACT_ADDRESS> "balanceOf(address)" <ACCOUNT> --rpc-url http://127.0.0.1:8545
```

### **Anvil Documentation:**
- **Official Docs**: https://book.getfoundry.sh/anvil/
- **CLI Reference**: https://book.getfoundry.sh/reference/anvil/
- **Fork Testing**: https://book.getfoundry.sh/tutorials/forking-mainnet-with-cast-anvil

---

## 🐛 **Troubleshooting**

### **Wallet Issues**
- **Wrong network?** → Switch to "Cookie Jar Local (Ethereum Fork)" 
- **No balance?** → Check you imported the correct private key
- **Connection failed?** → Refresh page, try different account

### **Development Issues**
- **Contracts not updating?** → Check `contracts/watch-deploy.log`
- **Frontend errors?** → Run `pnpm types:generate` to refresh types
- **Port conflicts?** → Run `pnpm stop` then `pnpm dev`

### **Demo Data Issues**
- **No demo jars?** → Seeding runs automatically with `pnpm dev`
- **Missing NFTs?** → Check Account #1 and #2 have Cookie Monster NFTs
- **Access denied?** → Ensure you're using whitelisted accounts

---

## 🎯 **Next Steps**

1. **🍴 Fork this repo** and clone locally
2. **🚀 Run `pnpm dev`** (that's it!)
3. **🔗 Connect MetaMask** with test accounts
4. **🎮 Try demo jars** and test features
5. **🛠️ Start building** your own funding pools!

---

## 🎉 **Ready to Vibe Code?**

**Your Cookie Jar development environment is fully loaded with:**
- ✅ Zero configuration setup
- ✅ Ethereum mainnet fork
- ✅ Pre-funded accounts  
- ✅ Cookie Monster NFTs
- ✅ 4 demo jar types
- ✅ Hot contract reloading
- ✅ Auto-generated types

**Let's build some amazing funding mechanisms together!** 🍪✨

---

*Need help? Check [LOCAL-DEV-README.md](./LOCAL-DEV-README.md) for detailed troubleshooting or ask in the coding session!*
