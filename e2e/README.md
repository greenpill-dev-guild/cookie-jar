# 🧪 E2E Testing

Playwright end-to-end testing for Cookie Jar protocol, designed to work seamlessly with the existing development environment.

## 🚀 Quick Start

```bash
# Terminal 1: Start development environment
bun dev

# Terminal 2: Run tests
bun test:e2e              # Run all E2E tests
bun test:e2e:ui           # Visual test runner
bun test:e2e:debug        # Debug mode
```

## 📋 Test Structure

```
e2e/
├── basic-setup.spec.ts          # Basic functionality verification
├── jar-creation.spec.ts         # Jar creation workflows
├── jar-operations.spec.ts       # Deposits, withdrawals, access control
├── admin-functions.spec.ts      # Admin functionality (allowlist, NFT gates)
├── complete-workflow.spec.ts    # End-to-end jar lifecycle
├── accessibility.spec.ts        # Accessibility compliance
├── performance.spec.ts          # Performance testing
└── utils/
    ├── constants.ts             # Test accounts and selectors
    ├── wallet-utils.ts          # Wallet testing utilities
    ├── global-setup.ts          # Test environment setup
    └── global-teardown.ts       # Cleanup
```

## 🔑 Test Accounts

| Role | Address | Use Case |
|------|---------|----------|
| **Deployer** | `0xf39Fd6...` | Jar creation, admin functions |
| **Cookie Monster** | `0x70997970...` | NFT holder, allowlisted |
| **Cookie Fan** | `0x3C44CdDd...` | NFT holder, allowlisted |
| **Test User** | `0x90F79bf6...` | Non-allowlisted, no NFTs |

## 🎯 Test Categories

**🟢 Basic Setup**: Homepage loading, navigation, environment verification  
**🟡 Core Functions**: Jar creation, deposits/withdrawals, access control  
**🔴 Admin Functions**: Allowlist management, NFT gates, metadata updates  
**♿ Accessibility**: WCAG compliance, keyboard navigation, screen reader  
**⚡ Performance**: Load times, cache efficiency, memory monitoring

## 🛠️ Wallet Testing

**Simulated wallet approach**: Injects wallet state, simulates transactions, triggers wagmi events  
**Benefits**: Fast (no extensions), reliable (consistent), realistic (actual behavior), CI-friendly

## 🧭 Running Specific Tests

```bash
# Run only jar creation tests
bun test:e2e jar-creation.spec.ts

# Run only admin function tests
bun test:e2e admin-functions.spec.ts

# Run accessibility tests only
bun test:accessibility

# Run with browser visible (for debugging)
bun test:e2e:headed

# Generate HTML report
bun test:e2e:report
```

## 🔧 Troubleshooting

### Development Environment Not Ready
```bash
# Make sure dev environment is running
bun dev

# Check services are ready
curl http://localhost:3000         # Client should respond
curl -X POST http://127.0.0.1:8545 # Anvil should respond
```

### Tests Failing
```bash
# Run with debug mode
bun test:e2e:debug

# Check browser console for errors
bun test:e2e:headed

# View detailed HTML report
bun test:e2e:report
```

### Slow Performance
```bash
# Run single test file
bun test:e2e basic-setup.spec.ts

# Check if dev environment is properly started
ps aux | grep anvil
ps aux | grep "next dev"
```

## 📊 Expected Test Results

### **Performance Targets:**
- Homepage load: < 5 seconds
- Jar list render: < 8 seconds  
- Cache loads: < 2 seconds
- Mobile loads: < 8 seconds

### **Coverage Goals:**
- ✅ Critical user paths: 100%
- ✅ Admin functions: 100%
- ✅ Access control: 100%
- ✅ Error handling: 80%

### **Browser Support:**
- ✅ Desktop Chrome (primary)
- ✅ Mobile Chrome
- ✅ Desktop Firefox (secondary)
- ✅ Desktop Safari (secondary)

## 🚀 Next Steps

1. **Run basic setup test**: `bun test:e2e basic-setup.spec.ts`
2. **Run complete suite**: `bun test:e2e`
3. **Add more test scenarios** as needed
4. **Integrate with CI/CD** pipeline

## 💡 Test Writing Tips

### Use Robust Selectors
```typescript
// ✅ Good - Multiple fallback strategies
await page.click('button:has-text("Deposit"), .deposit-button, [data-testid="deposit"]')

// ❌ Fragile - CSS class only
await page.click('.bg-orange-500.px-4')
```

### Handle Async Operations
```typescript
// ✅ Good - Proper timeout for blockchain operations
await expect(page.locator('text=successful')).toBeVisible({ timeout: 30000 })

// ❌ Bad - No timeout
await page.click('button')
```

### Test Real User Flows
```typescript
// ✅ Good - Complete user journey
test('User creates and funds jar', async ({ page, wallet }) => {
  // End-to-end flow
})

// ❌ Bad - Implementation details
test('Hook returns correct state', async () => {
  // This should be a unit test
})
```

This setup integrates seamlessly with your existing development environment and requires minimal changes to your components!

## Additional Resources

- **[Testing Guide](../docs/TESTING.md)** - Comprehensive testing strategy
- **[Development Guide](../docs/DEVELOPMENT.md)** - Development workflow
- **Main Project README**: [../README.md](../README.md) - Setup and overview
