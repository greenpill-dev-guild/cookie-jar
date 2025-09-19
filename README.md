# 🍪 Cookie Jar Protocol

Cookie Jar is a decentralized funding protocol that enables controlled distribution of ETH or ERC20 tokens from shared pools. The system uses smart contracts to manage multi-protocol access control (allowlist, NFT ownership, POAP events, Unlock Protocol, Hypercerts, and Hats Protocol) with configurable withdrawal limits, creating transparent and permissioned funding mechanisms for DAOs and communities.

## 🚀 Quick Start

**Zero configuration needed!** Get started in 3 commands:

```bash
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar && pnpm install
pnpm dev
```

**That's it!** Open http://localhost:3000 and explore 4 pre-seeded demo jars with Cookie Monster NFTs! 🍪

> **✨ What happens during `pnpm install`:**
> - Installs all dependencies for client and contracts
> - Automatically initializes git submodules (Foundry dependencies)
> - Runs `forge install` to set up smart contract libraries
> - Sets up the complete development environment

## 📋 Prerequisites

### Required Dependencies
- **Node.js** (v18.0.0+) - [Download](https://nodejs.org/)
- **pnpm** (v8.0.0+) - `npm install -g pnpm`
- **Foundry** - [Installation guide](https://book.getfoundry.sh/getting-started/installation)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
- **Git** - [Download](https://git-scm.com/)

### System Requirements
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 2GB free space
- **OS**: macOS, Linux, or Windows (WSL2)

## 💻 Development Options

**Choose your development mode:**

```bash
# 1. Install dependencies
pnpm install

# 2. Choose your development environment:
pnpm dev                   # Local development (fastest)
pnpm dev:ethereum          # Fork Ethereum mainnet
pnpm dev:celo              # Fork Celo network
pnpm dev:base-sepolia      # Fork Base Sepolia testnet
```

**What happens automatically:**
- ✅ Start Anvil (local blockchain) 
- ✅ Deploy contracts with deterministic addresses
- ✅ Seed demo environment with Cookie Monster NFTs & 4 demo jars
- ✅ Watch for contract changes and auto-redeploy  
- ✅ Start client dev server with hot reload (Turbo mode)
- ✅ Generate TypeScript types automatically

## 🔧 Environment Configuration

### For Local Development
**No configuration needed!** The development environment uses secure defaults for local blockchain testing.

### For Production Deployments
Copy and configure the environment template:

```bash
cp .env.sample .env.local
# Edit .env.local with your values
```

See [`.env.sample`](.env.sample) for all available configuration options including:
- **WalletConnect Project ID** - Required for wallet connections
- **Alchemy API Key** - Recommended for better RPC performance  
- **RPC Endpoints** - For different networks
- **Factory Configuration** - Fee settings and deployment parameters

## 🔐 Secure Wallet Setup (Production)

### Foundry Keystore (Recommended)
**No private keys in files!** Use Foundry's secure keystore for deployments:

```bash
# Import your deployment wallet securely
cast wallet import deployer --interactive
# Enter private key when prompted and set password

# Verify keystore was created
cast wallet list
```

**Why Keystore?**
- ✅ Private keys encrypted with password
- ✅ No secrets in environment files
- ✅ Industry standard security practice
- ✅ Works with all Foundry deployment commands

## 🎭 Demo Environment Showcase

When you run any `pnpm dev` command, you get **4 pre-configured demo jars** ready for testing:

### 1. **🏛️ Community Stipend** 
- **Access**: Whitelist-gated (pre-approved addresses)
- **Token**: ETH 
- **Withdrawals**: Fixed amount, periodic intervals
- **Use Case**: Regular community payments, DAO member stipends
- **Status**: ✅ Ready to test

### 2. **💰 Grants Program**
- **Access**: Whitelist-gated (committee members)
- **Token**: DEMO ERC20 tokens
- **Withdrawals**: Variable amounts (admin controlled)
- **Use Case**: Flexible grant distributions, project funding
- **Status**: ✅ Ready to test

### 3. **🍪 Cookie Monster Benefits** 
- **Access**: NFT-gated (Cookie Monster NFT holders)
- **Token**: ETH
- **Withdrawals**: Variable amounts 
- **Use Case**: NFT holder perks, community rewards
- **Status**: ✅ Ready to test (NFTs auto-minted to test accounts)

### 4. **🎁 Cookie Monster Airdrop**
- **Access**: NFT-gated (Cookie Monster NFT holders)
- **Token**: DEMO ERC20 tokens
- **Withdrawals**: One-time only per address
- **Use Case**: Exclusive airdrops, limited distributions  
- **Status**: ✅ Ready to test

> **💡 Pro Tip**: Use the pre-funded test accounts below to try different access patterns!

## 📦 Project Structure

```
cookie-jar/
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # Monorepo setup
├── .env.sample            # Environment template (see production setup)
│
├── contracts/             # 🏗️ Smart contracts (Foundry/Solidity)
│   ├── README.md          # Contract-specific documentation
│   ├── src/               # Solidity contracts
│   ├── test/              # Contract tests
│   └── script/            # Deployment scripts
│
├── client/                # 🌐 Next.js web application
│   ├── README.md          # Client-specific documentation
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   └── __tests__/         # Frontend tests
│
├── docs/                  # 📚 Documentation
│   ├── PROTOCOL_GUIDE.md  # Multi-protocol access control guide
│   └── NFT_TESTING_GUIDE.md # NFT development testing guide
│
└── scripts/               # 🛠️ Shared utility scripts
```

> 📖 **Documentation Links**:
> - **Contract Details**: [contracts/README.md](contracts/README.md)
> - **Client Architecture**: [client/README.md](client/README.md)  
> - **Access Control Guide**: [docs/PROTOCOL_GUIDE.md](docs/PROTOCOL_GUIDE.md)
> - **NFT Testing**: [docs/NFT_TESTING_GUIDE.md](docs/NFT_TESTING_GUIDE.md)


## ✨ Core Features

### **Multi-Protocol Access Control**
- **Allowlist Mode**: Pre-approved addresses only
- **NFT-Gated Mode**: ERC721/ERC1155 token ownership
- **POAP Mode**: Event attendance verification  
- **Unlock Protocol**: Membership-based access
- **Hypercerts**: Impact certificate holders
- **Hats Protocol**: Organizational role-based access

> 📖 **Detailed Guide**: See [docs/PROTOCOL_GUIDE.md](docs/PROTOCOL_GUIDE.md) for comprehensive access control documentation

### **Flexible Distribution Mechanics**
- **Multi-Token Support**: ETH and any ERC20 token
- **Withdrawal Patterns**: Fixed amounts, variable limits, one-time distributions
- **Time Controls**: Configurable cooldown periods between withdrawals
- **Purpose Tracking**: Optional requirement for withdrawal explanations
- **Admin Controls**: Comprehensive jar management and emergency functions

### **Security & Transparency**
- **Smart Contract Governed**: All operations handled by audited contracts
- **Complete Transparency**: Public transaction history and audit trails
- **Secure Deployment**: Foundry-based deployment with keystore security
- **Emergency Controls**: Optional admin recovery mechanisms

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
- **Available Modes**:
  - `pnpm dev` - Pure local mode (fastest)
  - `pnpm dev:ethereum` - Ethereum mainnet fork  
  - `pnpm dev:celo` - Celo network fork
  - `pnpm dev:base-sepolia` - Base Sepolia testnet fork
- **Auto-funded Accounts**: 10 accounts, each with 1000 ETH
- **Deployment**: Deterministic CREATE2 addresses (same every time)

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
# Setup & Installation  
pnpm install               # Install all dependencies (automatically initializes submodules and forge)

# Development
pnpm dev                   # Local development (fastest)
pnpm dev:ethereum          # Fork Ethereum mainnet  
pnpm dev:celo              # Fork Celo network
pnpm dev:base-sepolia      # Fork Base Sepolia testnet

# Build commands  
pnpm build                 # Build both contracts + client
pnpm build:contracts       # Build only contracts
pnpm build:client          # Build only client

# Testing
pnpm test                  # Test both contracts + client
pnpm test:contracts        # Test only contracts
pnpm test:client           # Test only client

# Code Quality
pnpm lint                  # Lint both contracts + client
pnpm lint:contracts        # Lint only contracts  
pnpm lint:client           # Lint only client
pnpm format                # Format both contracts + client
pnpm format:contracts      # Format only contracts
pnpm format:client         # Format only client

# Deployment & Management
pnpm deploy:local          # Deploy contracts to local Anvil
pnpm deploy:ethereum       # Deploy to Ethereum mainnet
pnpm deploy:celo           # Deploy to Celo network
pnpm deploy:base-sepolia   # Deploy to Base Sepolia testnet
pnpm seed:demo             # Seed demo environment with test data
pnpm seed:reset            # Reset and restart development environment
pnpm copy:deployment       # Copy deployment files to client
pnpm generate              # Generate client types from contracts

# Development Tools
pnpm sync:check            # Check deployment file synchronization
pnpm clean                 # Clean both projects
pnpm stop                  # Stop all running services
```

## 🚀 Production Deployment Guide

Cookie Jar uses **Foundry** for secure, efficient deployments to any EVM chain with automatic client configuration updates.

### **📋 Prerequisites**

1. **Foundry installed** (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
2. **Deployment wallet** with funds for the target chain  
3. **Environment variables** configured (see [.env.sample](.env.sample))
4. **Etherscan API key** (for contract verification)

### **🔧 Environment Setup**

1. **Copy and configure environment variables:**
   ```bash
   cp .env.sample .env
   # Edit .env with your actual values - see .env.sample for all options
   ```

2. **Key configuration sections** (see [.env.sample](.env.sample) for complete list):
   - **API Keys**: Etherscan verification keys
   - **RPC URLs**: Network endpoints (Base, Ethereum, Celo, etc.)
   - **Factory Configuration**: Fee settings, minimum deposits, admin addresses

### **🔐 Secure Deployment Wallet**

**✅ Recommended: Foundry Keystore**

Already covered in the [Secure Wallet Setup](#-secure-wallet-setup-production) section above. This approach:
- Encrypts private keys with password
- Keeps secrets out of environment files  
- Works seamlessly with all deployment commands

### **🌐 Deploy to Any Chain**

**Universal deployment using secure keystore:**

```bash
# Export environment variables  
export $(cat .env | xargs)

# Deploy to your target chain (examples):
cd contracts

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base-sepolia \
  --account deployer \
  --broadcast \
  --verify

# Deploy to Ethereum Mainnet (requires --verify flag)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url mainnet \
  --account deployer \
  --broadcast \
  --verify

# Deploy to any chain using custom RPC
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $YOUR_CHAIN_RPC_URL \
  --account deployer \
  --broadcast \
  --verify
```

> **💡 Security Tip**: The `--account deployer` flag uses your secure keystore. You'll be prompted for your password during deployment.

### **✅ Post-Deployment**

After successful deployment:

1. **Automatic Client Updates**: The client configuration automatically updates when contracts are deployed
2. **Contract Verification**: Contracts are verified on Etherscan/block explorer automatically  
3. **V2 Detection**: New deployments are automatically detected as V2 contracts
4. **Factory Address**: Copy the deployed factory address to your frontend configuration if needed

### **🔍 Deployment Verification**

Verify your deployment was successful:

```bash
# Check contract size is under limit
forge build --sizes | grep CookieJarFactory

# Verify on block explorer
cast call $FACTORY_ADDRESS "owner()" --rpc-url $RPC_URL

# Test factory functionality
cast call $FACTORY_ADDRESS "getCookieJars()" --rpc-url $RPC_URL
```

### **🐛 Troubleshooting Deployments**

**Contract size too large:**
```bash
# Check sizes
forge build --sizes

# Solution: Contract has been optimized to fit under 24KB limit
# If still too large, increase optimizer runs in foundry.toml
```

**Environment variables not found:**
```bash
# Export variables explicitly
export $(cat .env | xargs)

# Or source the file
source .env
```

**Keystore password issues:**
```bash
# List available keystores
cast wallet list

# Re-import if needed (uses secure keystore approach)
cast wallet import deployer --interactive
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

#### Submodule/Foundry Setup Issues
1. **Missing forge-std or openzeppelin-contracts**: Run `git submodule update --init --recursive && cd contracts && forge install`
2. **Git submodule errors**: Ensure git is installed and repository access is working
3. **Forge command not found**: Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
4. **Permission errors during setup**: Check git credentials and repository access

#### Wallet Connection Issues
1. Add local network to your Web3 wallet (MetaMask, Rabby, or Coinbase Wallet):
   - **Network Name**: `Anvil Local`
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
2. Import test account using private key from table above
3. Ensure you're on the correct network in your wallet
4. Try switching between wallets if connection issues persist

### Performance Issues
- **Slow builds**: Increase Node.js memory: `export NODE_OPTIONS="--max_old_space_size=4096"`
- **Anvil crashes**: Ensure sufficient system memory (8GB+ recommended)
- **Client slow loading**: Disable browser extensions or use incognito mode

## 📊 Logs & Monitoring

Monitor development services:

```bash
# View logs in real-time
tail -f contracts/anvil.log          # Blockchain logs
tail -f contracts/client-dev.log     # Client development logs  
tail -f contracts/watch-deploy.log   # Contract watcher logs

# All log files are in contracts/ directory for easy access
```

## 🎯 Getting Started Guide

### For Local Development (Fastest Path)
1. **Install Prerequisites**: Node.js (18+), pnpm (8+), and Foundry
2. **Clone & Setup**: 
   ```bash
   git clone https://github.com/greenpill-dev-guild/cookie-jar.git
   cd cookie-jar && pnpm install
   pnpm dev
   ```
3. **Open Client**: Navigate to http://localhost:3000  
4. **Connect Wallet**: Add local network (Chain ID: 31337) to your Web3 wallet
5. **Import Test Account**: Use any account from the pre-funded test accounts table
6. **Explore Demo Jars**: 4 pre-seeded jars with different access patterns ready to test

### For Production Deployment
1. **Environment Setup**: Copy `.env.sample` to `.env` and configure
2. **Secure Wallet**: Set up Foundry keystore with `cast wallet import deployer --interactive` 
3. **Deploy**: Use the deployment commands in the [Production Deployment Guide](#-production-deployment-guide)

### 🎉 Zero Configuration for Development

No complex setup needed for local development! The monorepo approach makes it seamless - just clone, install, and develop with automatic contract deployment and client configuration.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test: `pnpm test`
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Additional Resources

### **📖 Documentation**
- **[contracts/README.md](contracts/README.md)** - Smart contract architecture, development tools, and deployment details
- **[client/README.md](client/README.md)** - Frontend architecture, component structure, and testing setup
- **[docs/PROTOCOL_GUIDE.md](docs/PROTOCOL_GUIDE.md)** - Comprehensive guide to all 6 access control methods
- **[docs/NFT_TESTING_GUIDE.md](docs/NFT_TESTING_GUIDE.md)** - Complete NFT testing workflow for development
- **[.env.sample](.env.sample)** - Environment configuration template with all options

### **🛠️ Developer Tools**
- **[Foundry Documentation](https://book.getfoundry.sh/)** - Smart contract development framework
- **[Next.js Documentation](https://nextjs.org/docs)** - React framework and App Router
- **[RainbowKit Documentation](https://www.rainbowkit.com/)** - Wallet connection components

### **🌐 Community & Support**
- **Discord**: [Greenpill Dev Guild](https://discord.gg/greenpill)
- **Twitter**: [@greenpill](https://twitter.com/greenpill)
- **GitHub Issues**: For bug reports and feature requests