# 🍪 Cookie Jar Protocol

Decentralized funding pools with smart access control. Create shared ETH/ERC20 pools with allowlist, NFT, POAP, Unlock Protocol, Hypercerts, and Hats Protocol gating plus configurable withdrawal rules.

## 📋 Prerequisites

**Manual Install**: Node.js 18+, Git  
**Auto-Install**: pnpm, Foundry *(installed automatically)*  
**System**: 4GB+ RAM, 2GB storage

## 🚀 Quick Start

**True zero configuration** - everything installs automatically:

```bash
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar
npm install  # Auto-installs pnpm + Foundry + all dependencies
npm run dev  # Start development environment
```

Open http://localhost:3000 and explore 4 pre-seeded demo jars with Cookie Monster NFTs! 🍪

> **✨ Auto-setup**: Shell script checks system, installs pnpm + Foundry if missing, then sets up complete dev environment.

## 💻 Development

```bash
npm run dev                # or pnpm dev - Local development (fastest)
npm run dev:ethereum       # Fork Ethereum mainnet  
npm run dev:celo           # Fork Celo network
npm run dev:base           # Fork Base network
npm run dev:base-sepolia   # Fork Base Sepolia testnet
```

**Auto-included**: Anvil blockchain, contract deployment, demo seeding, hot reload, type generation.

## 🔧 Configuration

**Local**: Zero config needed  
**Production**: `cp .example.env .env.local` and edit with your API keys

See [`.example.env`](.example.env) for WalletConnect, Alchemy, RPC endpoints, and factory settings.

## 🔐 Production Wallet (Foundry Keystore)

```bash
cast wallet import deployer --interactive  # Enter private key + password
cast wallet list  # Verify keystore created
```

**Benefits**: Encrypted keys, no env secrets, industry standard

## 🎭 Pre-Seeded Demo Jars

**4 ready-to-test jars with different patterns:**

1. **🏛️ Community Stipend**: Allowlist + ETH + Fixed amounts + Periodic intervals
2. **💰 Grants Program**: Allowlist + ERC20 + Variable amounts + Purpose required
3. **🍪 Cookie Monster Benefits**: NFT-gated + ETH + Variable amounts + NFT rewards
4. **🎁 Cookie Monster Airdrop**: NFT-gated + ERC20 + One-time claims + Token distribution

> 💡 **Use the pre-funded test accounts below to try different access patterns!**

## 📦 Project Structure

```
cookie-jar/
├── client/             # Next.js frontend 
├── contracts/          # Smart contracts (Foundry/Solidity)
├── docs/               # Documentation
├── e2e/                # Playwright tests
└── scripts/            # Development utilities
```

**Key docs**: [contracts/README.md](contracts/README.md) • [client/README.md](client/README.md) • [docs/PROTOCOL_GUIDE.md](docs/PROTOCOL_GUIDE.md)


## ✨ Core Features

**Access Control**: Allowlist, NFT-gated, POAP, Unlock Protocol, Hypercerts, Hats Protocol  
**Distribution**: ETH/ERC20 support, fixed/variable amounts, time controls, purpose tracking  
**Security**: Smart contract governed, transparent, emergency controls, Foundry deployment  

> 📚 **Detailed Guide**: [docs/PROTOCOL_GUIDE.md](docs/PROTOCOL_GUIDE.md)

## 📋 Development Workflow

**Contracts**: Edit in `contracts/src/` → Auto-recompile → Auto-redeploy → Regen types  
**Client**: `localhost:3000` with hot reload on Chain ID 31337  
**Testing**: `pnpm test` (both contracts + client)

```bash
pnpm test:contracts     # Smart contract tests
pnpm test:client        # Frontend tests  
pnpm deploy:local       # Manual deployment
pnpm seed:demo          # Refresh demo data
```

## 🔧 Network Configuration

**Local blockchain**: `http://127.0.0.1:8545` (Chain ID: 31337)  
**Accounts**: 10 pre-funded (1000 ETH each)  
**Addresses**: Deterministic CREATE2 (consistent across restarts)  
**Fork modes**: Ethereum, Celo, Base, Base Sepolia available

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
# Essential
pnpm install               # Setup everything (deps, submodules, forge)
pnpm dev                   # Start local development
pnpm test                  # Run all tests
pnpm build                 # Build contracts + client

# Development variants  
pnpm dev:ethereum          # Fork Ethereum mainnet
pnpm dev:celo              # Fork Celo network
pnpm dev:base              # Fork Base network
pnpm dev:base-sepolia      # Fork Base Sepolia testnet

# Deployment
pnpm deploy:local          # Deploy to Anvil
pnpm deploy:ethereum       # Deploy to mainnet
pnpm deploy:celo           # Deploy to celo
pnpm deploy:base           # Deploy to base
pnpm deploy:base-sepolia   # Deploy to mainnet

pnpm seed:demo             # Refresh demo data
pnpm generate              # Regenerate types

# Utilities
pnpm lint / pnpm format    # Code quality
pnpm clean / pnpm stop     # Cleanup
```

## 🚀 Production Deployment Guide

Cookie Jar uses **Foundry** for secure, efficient deployments to any EVM chain with automatic client configuration updates.

### **📋 Prerequisites**

1. **Foundry installed** (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
2. **Deployment wallet** with funds for the target chain  
3. **Environment variables** configured (see [.example.env](.example.env))
4. **Etherscan API key** (for contract verification)

### **🔧 Environment Setup**

1. **Copy and configure environment variables:**
   ```bash
   cp .example.env .env
   # Edit .env with your actual values - see .example.env for all options
   ```

2. **Key configuration sections** (see [.example.env](.example.env) for complete list):
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
- **Solution**: Kill conflicting processes with `pnpm dev:stop`

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

#### Enhanced Features Dependencies
For full functionality of performance monitoring and advanced UX features:
```bash
# Install optional enhancement dependencies
pnpm add web-vitals lodash date-fns
pnpm add -D @types/lodash
```

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

## 🔧 Latest Enhancements

**Performance & UX Improvements**:
- **Error Boundaries**: Global and protocol-specific error handling
- **Transaction Retry**: Automatic retry logic with exponential backoff
- **NFT Caching**: Intelligent LRU cache with block-based invalidation
- **Mobile UX**: Enhanced forms and touch-optimized interactions
- **Performance Monitoring**: Core Web Vitals tracking and dashboard
- **Bundle Optimization**: Code-splitting and lazy loading

**Smart Contract Refactoring**:
- **Modular Libraries**: Extracted complex logic into reusable libraries
- **Gas Optimization**: Circular buffers and storage packing
- **Enhanced Security**: Multi-strategy NFT validation and DoS protection
- **Streaming Support**: Modular streaming functionality architecture

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
1. **Environment Setup**: Copy `.example.env` to `.env` and configure
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
- **[.example.env](.example.env)** - Environment configuration template with all options

### **🛠️ Developer Tools**
- **[Foundry Documentation](https://book.getfoundry.sh/)** - Smart contract development framework
- **[Next.js Documentation](https://nextjs.org/docs)** - React framework and App Router
- **[RainbowKit Documentation](https://www.rainbowkit.com/)** - Wallet connection components

### **🌐 Community & Support**
- **Discord**: [Greenpill Dev Guild](https://discord.gg/greenpill)
- **Twitter**: [@greenpilldevs](https://twitter.com/greenpilldevs)
- **GitHub Issues**: For bug reports and feature requests