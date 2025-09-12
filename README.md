# 🍪 Cookie Jar Protocol

Cookie Jar is a decentralized funding protocol that enables controlled distribution of ETH or ERC20 tokens from shared pools. The system uses smart contracts to manage access control (via allowlists or NFT ownership) and periodic withdrawal limits, creating transparent and permissioned funding mechanisms for DAOs and communities.

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

### Required Dependencies
- **Node.js** (v18.0.0 or later) - [Download here](https://nodejs.org/)
- **pnpm** (v8.0.0 or later) - Install with: `npm install -g pnpm`
- **Foundry** (latest) - [Installation guide](https://book.getfoundry.sh/getting-started/installation)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- **Git** - [Download here](https://git-scm.com/)

### Optional (for enhanced development)
- **VS Code** with Solidity extension
- **Metamask** or compatible Web3 wallet
- **Docker** (for alternative development setup)

### System Requirements
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 2GB free space
- **OS**: macOS, Linux, or Windows (WSL2 recommended)

## 🚀 Quick Start

**Zero configuration needed!** This project uses **pnpm workspaces** for monorepo management with friction-free local development:

```bash
# 1. Clone the repository
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar

# 2. Install all dependencies (contracts + client)
pnpm install

# 3. Start the full development environment (no .env setup required!)
pnpm dev

# Or start with mainnet fork (slower but has real state)
pnpm dev:fork
```

**That's it!** The development environment automatically:
- ✅ Uses hardcoded Anvil Account #0 (funded with 1000 ETH)
- ✅ No `.env` files or private keys to configure initially
- ✅ Safe by design (only works on local chain ID 31337)
- ✅ **Auto-deploys Cookie Monster NFTs** for testing NFT-gated jars!
- ✅ **Pre-seeds 4 demo jars** with different configurations

This single command will:
- ✅ Start Anvil (local blockchain) with Ethereum mainnet fork
- ✅ Deploy contracts automatically
- ✅ **Seed demo environment with Cookie Monster NFTs & 4 demo jars**
- ✅ Watch for contract changes and auto-redeploy
- ✅ Start client dev server with hot reload
- ✅ Generate TypeScript types automatically

## 📦 Monorepo Structure

```
cookie-jar/
├── package.json           # Root package with workspace scripts
├── pnpm-workspace.yaml    # Workspace configuration
├── .env.sample            # Environment configuration template
├── contracts/             # Smart contracts (Foundry/Solidity)
├── client/                # Next.js client application
└── scripts/               # Shared utility scripts
```

**Benefits:**
- ✅ Single `pnpm install` for all dependencies
- ✅ Unified scripts from root directory
- ✅ Shared development commands
- ✅ Optimized dependency management
- ✅ Consolidated environment configuration

## 🔧 Environment Setup (Optional)

For production deployments or custom configuration, copy the sample environment file:

```bash
# Copy the sample environment file
cp .env.sample .env.local

# Edit with your values
nano .env.local
```

### Key Environment Variables:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Required for wallet connections
- `NEXT_PUBLIC_ALCHEMY_ID` - Recommended for better RPC performance
- `PRIVATE_KEY` - For testnet/mainnet deployments (⚠️ never commit real keys!)
- `ANVIL_PRIVATE_KEY` - Hardcoded for local development (safe to commit)

## How Does Cookie Jar Work?

### 🔐 **Access Control Methods:**

1. **Allowlisted Members**: Only members who have been added to the allowlist can access the Cookie Jar. This ensures that only approved participants are able to withdraw funds from the communal jar.

2. **NFT Gating**: Holders of specific NFT collections can access the jar by proving ownership of qualifying tokens. Supports both ERC721 and ERC1155 standards.

### 💰 **Distribution Mechanics:**

3. **Periodic Withdrawals**: A predefined amount of ETH is made available for withdrawal at regular intervals. This could be weekly, monthly, or any other time period defined by the Admin.

4. **Communal Pool**: The funds are stored in a shared smart contract (the "jar"), and any withdrawal request is handled directly through interactions with the contract.

5. **Admin Controls**: The rules for withdrawals, such as the amount and frequency, can be adjusted by the admin.

## ✨ Features

### **Core Features:**
- **Dual Access Control**: Both allowlist and NFT-gated access modes
- **Multi-Token Support**: Works with ETH and any ERC20 token
- **Flexible Withdrawals**: Fixed or variable withdrawal amounts
- **Rich Metadata**: Jar names, images, and external links
- **Custom Fees**: Optional donation fees per jar

### **Advanced Features:**
- **Periodic Limits**: Time-based withdrawal restrictions
- **Admin Controls**: Comprehensive jar management
- **Event Tracking**: Full audit trail via blockchain events
- **Client Integration**: Beautiful, responsive web interface

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
  - Client type regeneration

### 2. **Client Development**  
- Client runs at `http://localhost:3000`
- Automatically connected to local contracts
- Hot reload on code changes
- Uses local blockchain (Chain ID: 31337)

### 3. **Testing Workflow**
```bash
# Test contracts
pnpm test:contracts

# Test client  
pnpm test:client

# Test everything
pnpm test

# Manual contract deployment (if needed)
pnpm deploy:local

# Seed demo environment
pnpm seed:demo
```

## 🔧 Network Configuration

**Auto-configured local blockchain (no setup required):**

- **Local Blockchain**: `http://127.0.0.1:8545`
- **Chain ID**: `31337` 
- **Forked Network**: Ethereum Mainnet (or Celo with --fork flag)
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
# Development
pnpm dev                   # Start full development environment
pnpm dev:fork              # Start with mainnet fork

# Build commands  
pnpm build                 # Build both contracts + client
pnpm build:contracts       # Build only contracts
pnpm build:client          # Build only client

# Testing
pnpm test                  # Test both contracts + client
pnpm test:contracts        # Test only contracts
pnpm test:client           # Test only client

# Linting
pnpm lint                  # Lint both contracts + client
pnpm lint:contracts        # Lint only contracts  
pnpm lint:client           # Lint only client

# Deployment & Management
pnpm deploy:local          # Deploy contracts to local Anvil
pnpm seed:demo             # Seed demo environment with test data
pnpm seed:reset            # Reset and restart development environment
pnpm copy:deployment       # Copy deployment files to client
pnpm generate              # Generate client types from contracts

# Utilities
pnpm accounts:list         # List pre-funded test accounts
pnpm sync:check            # Check deployment file synchronization
pnpm clean                 # Clean both projects
pnpm stop                  # Stop all running services
```

## 📁 Generated Files

```
client/public/contracts/
├── local-deployment.json    # Contract addresses (auto-generated)
└── seed-data.json          # Demo environment data

contracts/
├── anvil.log               # Blockchain logs  
└── out/                    # Compiled contracts
```

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
- Client: Port 3000
- Anvil: Port 8545
- **Solution**: Kill conflicting processes with `pnpm stop`

#### Contract Changes Not Reflecting
1. Check `contracts/anvil.log` for blockchain errors
2. Manually redeploy: `pnpm deploy:local`
3. Regenerate types: `pnpm generate`
4. Check deployment sync: `pnpm sync:check`

#### Client Not Connecting to Local Contracts
1. Ensure `NODE_ENV=development` 
2. Check `client/public/contracts/local-deployment.json` exists
3. Verify Anvil is running on port 8545
4. Try restarting: `pnpm seed:reset`

#### Environment Issues
1. Check Node.js version: `node --version` (should be ≥18.0.0)
2. Check pnpm version: `pnpm --version` (should be ≥8.0.0)
3. Check Foundry installation: `forge --version`
4. Reinstall dependencies: `rm -rf node_modules */node_modules && pnpm install`

#### Wallet Connection Issues
1. Add local network to MetaMask:
   - Network Name: `Anvil Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
2. Import test account using private key from table above
3. Ensure you're on the correct network in MetaMask

### Performance Issues
- **Slow builds**: Increase Node.js memory: `export NODE_OPTIONS="--max_old_space_size=4096"`
- **Anvil crashes**: Ensure sufficient system memory (8GB+ recommended)
- **Client slow loading**: Disable browser extensions or use incognito mode

## 📊 Logs & Monitoring

Monitor development services:

```bash
# View logs in real-time
tail -f contracts/anvil.log          # Blockchain logs
tail -f client/client-dev.log        # Client development logs

# Check all logs
pnpm logs
```

## 🎯 Getting Started Guide

1. **Prerequisites**: Install Node.js (18+), pnpm (8+), and Foundry
2. **Clone & Install**: `git clone <repo> && cd cookie-jar && pnpm install`
3. **Start Development**: `pnpm dev`
4. **Open Client**: Navigate to http://localhost:3000  
5. **Connect Wallet**: Add local network (Chain ID: 31337) to MetaMask
6. **Import Test Account**: Use Account #0 private key from the table above
7. **Explore Demo Jars**: 4 pre-seeded jars with different configurations
8. **Start Building**: Edit contracts in `contracts/src/` or client in `client/`

### 🎉 That's It! 

No complex environment files, no configuration hassles, no setup friction. Just clone, install, and develop! The hardcoded approach makes local development seamless while staying secure through chain ID restrictions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test: `pnpm test`
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Documentation**: [Coming Soon]
- **Discord**: [Greenpill Dev Guild](https://discord.gg/greenpill)
- **Twitter**: [@greenpill](https://twitter.com/greenpill)