# 🧪 Cookie Jar E2E Testing

End-to-end testing setup for Cookie Jar using Playwright, designed to work with your existing development environment.

## 🚀 Quick Start

```bash
# 1. Start development environment (in one terminal)
pnpm dev

# 2. Run E2E tests (in another terminal)
pnpm test:e2e

# 3. Run with UI for debugging
pnpm test:e2e:ui

# 4. Debug specific test
pnpm test:e2e:debug jar-creation.spec.ts
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

## 🔑 Test Accounts (Your Existing Anvil Accounts)

| Account | Role | Address | Use Case |
|---------|------|---------|----------|
| **Deployer** | Admin | `0xf39Fd6...` | Jar creation, admin functions |
| **Cookie Monster** | NFT Holder | `0x70997970...` | Has NFT #0, allowlisted user |
| **Cookie Fan** | NFT Holder | `0x3C44CdDd...` | Has NFT #1, allowlisted user |
| **Test User** | Regular | `0x90F79bf6...` | Non-allowlisted, no NFTs |

## 🎯 Test Categories

### **🟢 Basic Setup Tests**
- Homepage loading
- Navigation links
- Development environment verification
- Responsive design basics

### **🟡 Core Functionality Tests**
- Jar creation (allowlist and NFT-gated)
- Deposit and withdrawal flows
- Access control enforcement
- Cooldown period validation

### **🔴 Admin Function Tests**
- Allowlist management (add/remove users)
- NFT gate management (v2 contracts)
- Metadata updates
- Emergency withdrawals

### **♿ Accessibility Tests**
- WCAG compliance scanning
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation

### **⚡ Performance Tests**
- Page load times
- React Query cache efficiency
- Memory usage monitoring
- Mobile performance

## 🛠️ How Wallet Testing Works

The E2E tests use a **simulated wallet approach** that:

1. **Injects wallet state** into the browser window
2. **Simulates transaction signing** without requiring real MetaMask
3. **Uses your existing Anvil accounts** for realistic testing
4. **Triggers wagmi events** to update UI state

This approach is:
- ✅ **Fast**: No real wallet extension needed
- ✅ **Reliable**: Consistent transaction simulation
- ✅ **Realistic**: Tests actual component behavior
- ✅ **CI-friendly**: Runs in headless environments

## 🧭 Running Specific Tests

```bash
# Run only jar creation tests
pnpm test:e2e jar-creation.spec.ts

# Run only admin function tests
pnpm test:e2e admin-functions.spec.ts

# Run accessibility tests only
pnpm test:accessibility

# Run with browser visible (for debugging)
pnpm test:e2e:headed

# Generate HTML report
pnpm test:e2e:report
```

## 🔧 Troubleshooting

### Development Environment Not Ready
```bash
# Make sure dev environment is running
pnpm dev

# Check services are ready
curl http://localhost:3000         # Client should respond
curl -X POST http://127.0.0.1:8545 # Anvil should respond
```

### Tests Failing
```bash
# Run with debug mode
pnpm test:e2e:debug

# Check browser console for errors
pnpm test:e2e:headed

# View detailed HTML report
pnpm test:e2e:report
```

### Slow Performance
```bash
# Run single test file
pnpm test:e2e basic-setup.spec.ts

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

1. **Run basic setup test**: `pnpm test:e2e basic-setup.spec.ts`
2. **Run complete suite**: `pnpm test:e2e`
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
