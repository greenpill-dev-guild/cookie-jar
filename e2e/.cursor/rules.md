# Cookie Jar E2E - End-to-End Testing Rules

## Playwright Testing Structure
```
e2e/
├── accessibility-validation.spec.ts    # WCAG compliance tests
├── admin-functions.spec.ts            # Admin panel functionality
├── basic-functionality.spec.ts        # Core user flows
├── jar-creation.spec.ts              # Jar creation workflows
├── jar-operations.spec.ts            # Deposit/withdraw operations
├── nft-gating-integration.spec.ts    # NFT-based access control
├── performance.spec.ts               # Core Web Vitals monitoring
├── setup-verification.spec.ts        # Environment verification
├── utils/
│   ├── constants.ts                  # Test constants and data
│   └── wallet-utils.ts              # Wallet interaction helpers
└── global-setup.ts                  # Test environment setup
```

## Test Environment Requirements  
```bash
pnpm test:e2e              # Run full e2e suite
pnpm test:e2e:headed       # Run with visible browser
pnpm test:e2e:debug        # Debug mode with inspector
```

## Pre-test Checklist
- ✅ Anvil blockchain running (`pnpm dev` in root)
- ✅ Contracts deployed and seeded  
- ✅ Frontend accessible at localhost:3000
- ✅ Test wallets funded with ETH and test tokens
- ✅ Demo Cookie Monster NFTs minted

## Testing Patterns & Standards
- **Page Object Model**: Encapsulate page interactions in utility functions
- **Data-driven tests**: Use `constants.ts` for test data, never hardcode
- **Atomic tests**: Each test should be independent and reset state
- **User-centric flows**: Test complete user journeys, not individual components
- **Error scenarios**: Test failure states and edge cases

## Wallet & Web3 Testing
```typescript
// Use consistent test wallet patterns
const TEST_WALLETS = {
  ADMIN: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  USER_A: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 
  USER_B: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
}

// Always verify transaction success
await expect(page.getByText('Transaction successful')).toBeVisible();
```

## Accessibility Testing Standards
- **Screen reader compatibility**: Test with keyboard navigation only
- **Color contrast**: Verify WCAG AA compliance
- **Focus management**: Ensure logical tab order
- **ARIA labels**: Validate all interactive elements have proper labels

## Performance Monitoring
- **Core Web Vitals**: Monitor LCP, FID, CLS in performance.spec.ts
- **Network conditions**: Test on slow 3G simulation
- **Bundle size impact**: Alert if JavaScript bundles exceed thresholds

## CI/CD Integration
- **Parallel execution**: Configure for optimal worker usage
- **Screenshot on failure**: Capture visual state for debugging
- **Video recording**: Record full test runs for critical flows
- **Retry logic**: Retry flaky tests up to 2 times before failure
