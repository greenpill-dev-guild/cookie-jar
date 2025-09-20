# 🍪 Multi-Token Cookie Jars

A decentralized smart contract system for multi-token deposits with automatic conversion to a designated jar token. Built for Base, Celo, Optimism, and Ethereum with Uniswap integration.

## 🎯 Overview

Multi-Token Cookie Jars enable:

- **Universal Deposits**: Accept native coins (ETH/OP/Base ETH/CELO) and any ERC-20 token
- **Auto-Conversion**: Automatically swap deposited assets to the jar's designated token
- **Fallback Protection**: Failed swaps are recorded as pending for manual recovery
- **Owner Controls**: Jar owners can withdraw, transfer, and manage assets
- **Cross-Chain**: Deploy on multiple chains with chain-specific configurations

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CookieJarFactory │────│   CookieJar     │────│   DexAdapter    │
│                 │    │                 │    │                 │
│ • Deploy jars   │    │ • Multi-token   │    │ • Uniswap V2/V3 │
│ • Token allowlist│    │   deposits      │    │ • Swap logic    │
│ • Chain configs │    │ • Auto-swap     │    │ • Path building │
└─────────────────┘    │ • Owner controls│    └─────────────────┘
                       │ • Pending mgmt  │
                       └─────────────────┘
```

## 🚀 Quick Start

### Deployment

1. **Set Environment Variables**:
```bash
export PRIVATE_KEY="your_private_key"
export RPC_URL="your_rpc_url"
```

2. **Deploy Factory**:
```bash
# Ethereum Mainnet
forge script script/DeployMultiTokenCookieJar.s.sol --rpc-url $RPC_URL --broadcast --verify

# Base
forge script script/DeployMultiTokenCookieJar.s.sol --rpc-url https://mainnet.base.org --broadcast

# Optimism  
forge script script/DeployMultiTokenCookieJar.s.sol --rpc-url https://mainnet.optimism.io --broadcast

# Celo
forge script script/DeployMultiTokenCookieJar.s.sol --rpc-url https://forno.celo.org --broadcast
```

### Create a Cookie Jar

```solidity
// Deploy factory first
CookieJarFactory factory = CookieJarFactory(FACTORY_ADDRESS);

// Create native ETH jar
address nativeJar = factory.createJar(
    msg.sender,        // jar owner
    address(0),        // jar token (0 = native)
    true              // is native jar token
);

// Create ERC-20 jar (e.g., USDC)
address erc20Jar = factory.createJar(
    msg.sender,        // jar owner
    USDC_ADDRESS,      // jar token
    false             // is native jar token
);
```

## 💰 Usage Examples

### 1. Native Token Deposits

```solidity
CookieJar jar = CookieJar(JAR_ADDRESS);

// Simple send (auto-converts if needed)
payable(address(jar)).transfer(1 ether);

// With slippage protection
address[] memory path = new address[](0); // Use default path
jar.depositNative{value: 1 ether}(
    0.95 ether,  // minimum output (5% slippage)
    path         // swap path (empty = default)
);
```

### 2. ERC-20 Deposits

```solidity
IERC20 token = IERC20(TOKEN_ADDRESS);
CookieJar jar = CookieJar(JAR_ADDRESS);

// Approve first
token.approve(address(jar), amount);

// Deposit with auto-swap
jar.deposit(
    address(token),  // token to deposit
    amount,          // amount to deposit
    minOut,          // minimum jar tokens to receive
    path            // swap path (empty = default)
);
```

### 3. Permit Deposits (Single Transaction)

```solidity
// No prior approval needed!
jar.depositWithPermit(
    address(token),  // token to deposit
    amount,          // amount to deposit
    minOut,          // minimum output
    path,           // swap path
    deadline,       // permit deadline
    v, r, s         // permit signature
);
```

### 4. Owner Operations

```solidity
// Withdraw jar tokens
jar.ownerWithdraw(amount, recipient);

// Manually convert pending tokens
jar.adminSwapPending(tokenAddress, minOut, path);

// Sweep mistaken tokens
jar.adminSweep(tokenAddress, amount, recipient);
```

## 🔧 Chain Configurations

| Chain | Router | wNative | Status |
|-------|--------|---------|--------|
| Ethereum | `0x7a25...2488D` | `0xC02a...56Cc2` (WETH) | ✅ |
| Base | `0x4752...2aD24` | `0x4200...00006` (WETH) | ✅ |
| Optimism | `0x7a25...2488D` | `0x4200...00006` (WETH) | ✅ |
| Celo | `0x7a25...2488D` | `0x471E...8a438` (WCELO) | ✅ |

*Addresses are configured in the deployment script and can be updated per chain.*

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/MultiTokenCookieJar.t.sol

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

### Acceptance Tests Covered

- ✅ Native → same native Jar
- ✅ Native → ERC-20 Jar (auto-swap success)
- ✅ Native → ERC-20 Jar (auto-swap fail → pending)
- ✅ ERC-20 (designated token)
- ✅ ERC-20 (non-designated, auto-swap success)
- ✅ ERC-20 (non-designated, auto-swap fail → pending)
- ✅ Permit flow (single transaction)
- ✅ Owner withdrawals and transfers
- ✅ Manual swap of pending tokens
- ✅ Sweep functionality
- ✅ Reentrancy protection
- ✅ Fee-on-transfer token support

## 📋 Contract API

### CookieJar

**Deposit Functions:**
- `receive()` - Accept native tokens
- `depositNative(minOut, path)` - Native with slippage protection
- `deposit(tokenIn, amount, minOut, path)` - ERC-20 deposit
- `depositWithPermit(...)` - Single-tx ERC-20 with permit

**Owner Functions:**
- `ownerWithdraw(amount, to)` - Withdraw jar tokens
- `ownerTransfer(to, amount)` - Transfer jar tokens
- `adminSwapPending(tokenIn, minOut, path)` - Convert pending tokens
- `adminSweep(token, amount, to)` - Sweep non-jar tokens

**View Functions:**
- `getJarTokenBalance()` - Current jar token balance
- `getPendingAmount(token)` - Pending token amount
- `isJarToken(token)` - Check if token is jar token

### CookieJarFactory

**Core Functions:**
- `createJar(owner, jarToken, isNative)` - Deploy new jar
- `getCookieJars()` - Get all deployed jars
- `toggleAllowlist(enabled)` - Enable/disable token allowlist
- `addAllowedTokens(tokens)` - Add allowed jar tokens

## 🔒 Security Features

- **ReentrancyGuard**: All state-changing functions protected
- **SafeERC20**: Safe token transfers with proper error handling
- **Checks-Effects-Interactions**: Proper ordering to prevent attacks
- **Fee-on-Transfer Support**: Handles tokens with transfer fees
- **Slippage Protection**: User-defined minimum output amounts
- **Owner Controls**: Only jar owner can withdraw/manage assets

## ⚡ Gas Optimization

- **Minimal Storage**: Efficient state management
- **Batch Operations**: Multiple actions in single transaction
- **Smart Approvals**: Only approve exact amounts needed
- **Path Optimization**: Automatic optimal swap path building

## 🛠 Development

### Build
```bash
forge build
```

### Test
```bash
forge test -vvv
```

### Deploy Locally
```bash
anvil # Start local node
forge script script/DeployMultiTokenCookieJar.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Verify Contracts
```bash
forge verify-contract CONTRACT_ADDRESS src/factory/CookieJarFactory.sol:CookieJarFactory --etherscan-api-key $ETHERSCAN_API_KEY
```

## 🔮 Future Enhancements

- **Uniswap V3 Support**: Single-hop swaps with fee tiers
- **Permit2 Integration**: Universal permit system
- **Multi-Signature Owners**: Safe-compatible ownership
- **Pausable Swaps**: Emergency pause functionality
- **Fee Collection**: Optional protocol fees

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 🆘 Support

- **Documentation**: This README and inline code comments
- **Tests**: Comprehensive test suite with examples
- **Issues**: GitHub Issues for bug reports and feature requests

---

*Built with ❤️ for the decentralized future*