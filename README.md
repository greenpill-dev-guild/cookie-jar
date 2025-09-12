# 🍪 Cookie Jar

Cookie Jar is a decentralized application (dApp) that allows a set of whitelisted members or NFT holders to withdraw ETH or ERC20 tokens periodically from a communal jar. This system operates under a DAO structure, where the rules and the distribution process are controlled and executed by smart contracts.

The primary purpose of Cookie Jar is to create a transparent and permissioned mechanism for distributing ETH or ERC20 tokens from a shared pool among a group of participants in a decentralized manner.

## 🚀 Quick Start

**Zero configuration needed!** This project uses **pnpm workspaces** for monorepo management with friction-free local development:

```bash
# Install all dependencies (contracts + frontend)
pnpm install

# Start the full development environment (no .env setup required!)
pnpm dev

# Or start with mainnet fork (slower but has real state)
pnpm dev:fork
```

**That's it!** The development environment automatically:
- ✅ Uses hardcoded Anvil Account #0 (funded with 1000 ETH)
- ✅ No `.env` files or private keys to configure
- ✅ Safe by design (only works on local chain ID 31337)
- ✅ **Auto-deploys Cookie Monster NFTs** for testing NFT-gated jars!
- ✅ **Pre-seeds 4 demo jars** with different configurations

This single command will:
- ✅ Start Anvil (local blockchain) with Ethereum mainnet fork
- ✅ Deploy contracts automatically
- ✅ **Seed demo environment with Cookie Monster NFTs & 4 demo jars**
- ✅ Watch for contract changes and auto-redeploy
- ✅ Start frontend dev server with hot reload
- ✅ Generate TypeScript types automatically

## 📦 Monorepo Structure

```
cookie-jar/
├── package.json           # Root package with workspace scripts
├── pnpm-workspace.yaml    # Workspace configuration
├── contracts/             # Smart contracts (Foundry/Solidity)
└── frontend/              # Next.js frontend application
```

**Benefits:**
- ✅ Single `pnpm install` for all dependencies
- ✅ Unified scripts from root directory
- ✅ Shared development commands
- ✅ Optimized dependency management

## How Does Cookie Jar Work?

### 🔐 **Access Control Methods:**

1. **Whitelisted Members**: Only members who have been added to the whitelist can access the Cookie Jar. This ensures that only approved participants are able to withdraw funds from the communal jar.

2. **NFT Gating**: Holders of specific NFT collections can access the jar by proving ownership of qualifying tokens. Supports both ERC721 and ERC1155 standards.

### 💰 **Distribution Mechanics:**

3. **Periodic Withdrawals**: A predefined amount of ETH is made available for withdrawal at regular intervals. This could be weekly, monthly, or any other time period defined by the Admin.

4. **Communal Pool**: The funds are stored in a shared smart contract (the "jar"), and any withdrawal request is handled directly through interactions with the contract.

5. **Admin Controls**: The rules for withdrawals, such as the amount and frequency, can be adjusted by the admin.

## ✨ Features

### **Core Features:**
- **Dual Access Control**: Both whitelist and NFT-gated access modes
- **Multi-Token Support**: Works with ETH and any ERC20 token
- **Flexible Withdrawals**: Fixed or variable withdrawal amounts
- **Rich Metadata**: Jar names, images, and external links
- **Custom Fees**: Optional donation fees per jar

### **Advanced Features:**
- **Periodic Limits**: Time-based withdrawal restrictions
- **Admin Controls**: Comprehensive jar management
- **Event Tracking**: Full audit trail via blockchain events
- **Frontend Integration**: Beautiful, responsive web interface

### **Security & Transparency:**
- **Decentralized**: All operations governed by smart contracts
- **Transparent**: All withdrawals and interactions are publicly verifiable
- **Permissioned**: Controlled access ensures fair distribution
- **Auditable**: Complete transaction history on-chain

## 📋 Development Workflow

### 1. **Contract Development**
- Edit files in `contracts/src/`
- Changes automatically trigger:
  - Recompilation with Forge
  - Redeployment to local Anvil
  - Frontend type regeneration

### 2. **Frontend Development**  
- Frontend runs at `http://localhost:3000`
- Automatically connected to local contracts
- Hot reload on code changes
- Uses local blockchain (Chain ID: 31337)

### 3. **Testing Workflow**
```bash
# Test contracts
pnpm test:contracts

# Test frontend  
pnpm test:frontend

# Test everything
pnpm test

# Manual contract deployment (if needed)
pnpm deploy:local
```

## 🔧 Network Configuration

**Auto-configured local blockchain (no setup required):**

- **Local Blockchain**: `http://127.0.0.1:8545`
- **Chain ID**: `31337` 
- **Forked Network**: Celo Mainnet
- **Auto-funded Accounts**: 10 accounts, each with 1000 ETH

### 🔑 Pre-funded Test Accounts

| Account | Address | Private Key | Balance |
|---------|---------|-------------|---------|
| #0 (Deployer) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | 1000 ETH |
| #1 (Cookie Monster) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | 1000 ETH |
| #2 (Cookie Fan) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | 1000 ETH |
| #3 (Test User) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | 1000 ETH |
| ... | (6 more accounts) | ... | 1000 ETH each |

> ⚠️ **Security Note**: These are well-known test keys. Never use them on mainnet or testnets!

## 🛠️ Available Commands

```bash
# Individual services
pnpm dev:contracts         # Only start contracts + anvil
pnpm dev:frontend          # Only start frontend

# Build commands  
pnpm build                 # Build both contracts + frontend
pnpm build:contracts       # Build only contracts
pnpm build:frontend        # Build only frontend

# Testing
pnpm test                  # Test both contracts + frontend
pnpm test:contracts        # Test only contracts
pnpm test:frontend         # Test only frontend

# Linting
pnpm lint                  # Lint both contracts + frontend
pnpm lint:contracts        # Lint only contracts  
pnpm lint:frontend         # Lint only frontend

# Cleanup
pnpm clean                 # Clean both projects
pnpm stop                  # Stop all running services

# Workspace management
pnpm install               # Install all dependencies for both packages
pnpm generate              # Generate frontend types from contracts
```

## 📁 Generated Files

```
frontend/contracts/
└── local-deployment.json    # Contract addresses (auto-generated)

contracts/
├── anvil.log               # Blockchain logs  
└── watch-deploy.log        # Contract deployment logs
```

## 🔍 Troubleshooting

### Port Conflicts
- Frontend: Port 3000
- Anvil: Port 8545
- Kill conflicting processes: `pnpm stop`

### Contract Changes Not Reflecting
1. Check `contracts/watch-deploy.log` for errors
2. Manually redeploy: `pnpm deploy:local`
3. Regenerate types: `pnpm generate`

### Frontend Not Connecting to Local Contracts
1. Ensure `NODE_ENV=development` 
2. Check `frontend/public/contracts/local-deployment.json` exists
3. Verify Anvil is running on port 8545

### Environment Issues
**No environment setup needed!** If you're having issues:
1. Ensure you're using the latest code with hardcoded keys
2. Contracts automatically use Account #0 (no `.env` files required)
3. All configuration is built into the scripts

## 📊 Logs & Monitoring

- **Anvil**: `tail -f contracts/anvil.log`
- **Contract Watcher**: `tail -f contracts/watch-deploy.log`  
- **Frontend**: `tail -f frontend/frontend-dev.log`

## Folder Structure

- **`frontend/`**: Next.js frontend interface for users to interact with Cookie Jars, check eligibility, and withdraw ETH or ERC20 tokens
- **`contracts/`**: Smart contract logic for managing communal jars, access control, withdrawal rules, and comprehensive test suites

## 🎯 Getting Started

1. **Start development**: `pnpm dev`
2. **Open frontend**: http://localhost:3000  
3. **Connect wallet** to local network (Chain ID: 31337)
4. **Import test account**: Use Account #0 private key from the table above
5. **Start building!** 🚀

### 🎉 That's It! 

No environment files, no configuration, no setup hassle. Just clone, install, and dev! The hardcoded approach makes local development friction-free while staying secure through chain ID restrictions.
