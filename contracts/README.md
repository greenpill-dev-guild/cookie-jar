# Cookie Jar Smart Contracts

> **📋 For general setup and development workflow, see the [main README](../README.md)**

This directory contains the smart contracts for the Cookie Jar Protocol - a decentralized system for controlled fund withdrawals with support for both allowlist and NFT-gated access modes. The protocol enables users to create "cookie jars" that manage deposits and withdrawals with configurable rules and fee mechanisms.

## 🏗️ Smart Contract Architecture

### Core Contracts

1. **CookieJarFactory**
   - Handles protocol access control
   - Manages jar deployments
   - Controls minimum deposit requirements
   - Maintains protocol-level blacklist

2. **CookieJar**
   - Manages individual jar logic
   - Handles deposits and withdrawals
   - Implements access control rules
   - Processes withdrawal requests

3. **CookieJarRegistry**
   - Stores all deployed jar data
   - Maintains jar metadata
   - Provides jar lookup functionality

4. **CookieJarLib**
   - Contains shared data structures
   - Defines common types and events
   - Implements reusable functions

## ✨ Contract Features

### Core Capabilities
- **Flexible Access Control**: Support for both allowlist and NFT-gated access modes
- **Configurable Withdrawals**: Fixed or variable withdrawal amounts with customizable intervals
- **Multi-Token Support**: Handle both ETH and ERC20 tokens
- **Fee Mechanism**: 1% fee on deposits for protocol sustainability
- **Emergency Controls**: Optional emergency withdrawal functionality
- **Purpose Tracking**: Optional requirement for withdrawal purpose documentation

### Architecture Improvements
- Streamlined data storage by consolidating jar data in the Registry
- Integrated OpenZeppelin's Role-Based Access Control and Ownable pattern
- Enhanced security with additional validation checks
- Separated ETH and ERC20 jar creation functions for better clarity
- Configurable fee percentage in jar constructor
- Comprehensive getters for improved contract interaction

## 🚀 Deployments

### Mainnet/Testnet Addresses

- **CookieJarRegistry** deployed on:
  - Base Sepolia: https://base-sepolia.blockscout.com/address/0xE9c62c210E6d56EbB0718f79DCE2883b8e38B356?tab=contract
  - Celo Alfajores: https://celo-alfajores.blockscout.com/address/0x8FF4E393D983fb2EEdCfcFcB55a0aaB9250d0AE6?tab=contract

- **CookieJarFactory** deployed on:
  - Base Sepolia: https://base-sepolia.blockscout.com/address/0x010CE87d0E7F8E818805a27C95E09cb4961C8c6f?tab=contract
  - Celo Alfajores: https://celo-alfajores.blockscout.com/address/0x5FC650F378475d1fF0E608964529E4863A339CD2?tab=contract

### Local Development
For local development, contracts are automatically deployed with deterministic addresses when you run `pnpm dev` from the repo root.

## 🛠️ Development Tools & Workflow

This project uses professional Solidity development tools for code quality and consistency:

### Included Tools
- **Solhint**: Solidity linter for code quality
- **Prettier**: Code formatter with Solidity plugin  
- **Foundry**: Smart contract development framework (Forge, Cast, Anvil)

### Configuration Files
- `.solhint.json` - Solhint linting rules
- `.prettierrc.json` - Prettier formatting rules
- `.prettierignore` - Files to ignore during formatting
- `foundry.toml` - Foundry configuration
- `package.json` - Dependencies and scripts

## 📋 Contract-Specific Commands

> **💡 Tip**: Run these from the repo root with `pnpm` or from `contracts/` directory with `npm`

### Code Quality
```bash
# From repo root
pnpm lint:contracts        # Check for linting issues
pnpm format:contracts      # Format all Solidity files

# From contracts/ directory  
npm run lint               # Check for linting issues
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format all Solidity files
npm run format:check       # Check formatting without changes
npm run check              # Check formatting + linting
npm run fix                # Format + lint fix
```

### Building & Testing
```bash
# From repo root
pnpm build:contracts       # Compile contracts with Forge
pnpm test:contracts        # Run all contract tests

# From contracts/ directory
npm run build              # Compile contracts with Forge
npm run test               # Run all tests
npm run test:summary       # Run tests with summary
npm run clean              # Clean build artifacts
```

### Local Development
```bash
# From repo root (recommended)
pnpm dev                   # Start full development environment
pnpm deploy:local          # Deploy contracts to local Anvil
pnpm seed:demo             # Seed demo environment

# Direct Foundry commands (from contracts/)
forge build                # Compile contracts
forge test                 # Run tests
forge test -vvv            # Run tests with verbose output
forge fmt                  # Format Solidity files
```

## 🔧 Contract Development Setup

### Prerequisites
- **Foundry**: Install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Node.js & pnpm**: For dependency management and scripts

### Quick Setup
```bash
# From repo root (recommended approach)
pnpm install               # Installs all dependencies + runs forge install
pnpm dev                   # Starts development environment with contracts

# Manual setup (from contracts/ directory)
forge install              # Install Foundry dependencies
npm install                # Install Node dependencies
```

### Dependencies
- **forge-std**: Foundry's standard library for testing
- **OpenZeppelin Contracts**: Security-audited contract implementations

## 📊 Current Status

- **Compilation**: ✅ 0 errors
- **Tests**: ✅ All tests passing
- **Linting**: ✅ Professional code standards enforced
- **Deployment Ready**: ✅ Production-ready smart contracts

## 🔒 Security Considerations

- **Do not send funds directly** to the factory contract
- **Always use provided deposit functions** for safe interactions
- **Verify contract addresses** before any interaction
- **Review withdrawal rules** and access controls before deployment
- **Test thoroughly** on testnets before mainnet deployment

## 📚 Documentation & Standards

### Code Quality Standards
- Consistent natspec documentation across all contracts
- Updated error naming convention includes contract names for easier debugging
- Comprehensive getters for improved contract interaction
- OpenZeppelin's security patterns and access control

### Testing & Coverage
- Restructured test suite for comprehensive coverage
- Helper configurations for different testing scenarios
- CookieJarLibrary for shared functionality testing

## 🔗 Integration with Client

The contracts work seamlessly with the Next.js client application. Key integration points:

- **Type Generation**: Contract ABIs automatically generate TypeScript types
- **Address Management**: Deployment addresses are automatically copied to client
- **Event Listening**: Client subscribes to contract events for real-time updates
- **Wallet Integration**: Web3 wallets connect directly to contract functions

## 📖 Additional Resources

- **Foundry Documentation**: [Foundry Book](https://book.getfoundry.sh/)
- **OpenZeppelin Docs**: [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
- **Main Project README**: [../README.md](../README.md) - Setup, development workflow, and troubleshooting

---

*Professional smart contract development with comprehensive tooling and security best practices* ✨