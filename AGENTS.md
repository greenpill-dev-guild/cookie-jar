# Cookie Jar - AI Agent Guide

> Comprehensive guidelines for AI agents working on Cookie Jar protocol

## 🎯 Quick Reference

Cookie Jar uses **modular `.mdc` rules** that automatically apply based on file context:

- **Root Standards**: `.cursor/rules/root-standards.mdc` - Always active
- **Web3 Patterns**: `.cursor/rules/web3-patterns.mdc` - For Web3 code
- **Testing Patterns**: `.cursor/rules/testing-patterns.mdc` - For test files
- **Deployment**: `.cursor/rules/deployment.mdc` - For deployment scripts

**Subdirectory Rules** (auto-attached when working in specific areas):
- **Frontend**: `client/.cursor/rules/frontend-standards.mdc`
- **Contracts**: `contracts/.cursor/rules/solidity-standards.mdc`
- **E2E**: `e2e/.cursor/rules/e2e-standards.mdc`

## 📚 Documentation Structure

All documentation is in flat structure in `/docs/`:

```
docs/
├── ACCESS_CONTROL.md           # 6 access control methods
├── DEVELOPMENT.md              # Dev workflow & commands
├── DEPLOYMENT.md               # Production deployment
├── TESTING.md                  # Testing strategies
├── ARCHITECTURE.md             # High-level system architecture
├── CONTRACTS.md                # Smart contract design
├── FRONTEND.md                 # Frontend architecture
├── INTEGRATIONS.md             # Protocol integrations (Superfluid, Uniswap, etc.)
├── NFT_INTEGRATION.md          # Comprehensive NFT functionality
├── FOUNDRY_SETUP.md            # Foundry configuration
├── AI_AGENTS.md                # AI agent configuration (this doc's details)
├── RELEASES.md                 # Release history
├── MIGRATIONS.md               # Migration guides
└── SUBMODULE_MIGRATION.md      # Submodule migration (historical)
```

## 🚀 Development Workflow

### 1. Environment Setup

```bash
# Zero-configuration start
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar
npm install  # Auto-installs Foundry
bun install  # Install dependencies
bun dev      # Starts everything
```

### 2. Code Quality Commands

```bash
# Fast TypeScript checking (use this first!)
bun type-check

# Full testing suite
bun test                # All tests
bun test:client         # Frontend only
bun test:contracts      # Contracts only
bun test:e2e           # End-to-end

# Code quality
bun lint               # ESLint + Solhint
bun format             # Prettier
```

### 3. Rule Application

Rules automatically apply based on context:

| Working On | Active Rules |
|-----------|--------------|
| **Any file** | `root-standards.mdc` |
| **React/TypeScript** | `+ frontend-standards.mdc` + `web3-patterns.mdc` |
| **Solidity** | `+ solidity-standards.mdc` |
| **Test files** | `+ testing-patterns.mdc` |
| **Deploy scripts** | `+ deployment.mdc` |

## 🎨 Core Patterns

### Frontend Development

**Use these hooks**:
- `useQuery` from TanStack Query for blockchain state
- `useWriteContract` from wagmi for transactions
- `useChainId` to validate network
- Custom hooks in `hooks/` for domain logic

**Component pattern**:
```typescript
export function JarCard({ address }: JarCardProps) {
  const { data, isLoading, error } = useJarData({ address })
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorCard error={error} />
  
  return <Card>{/* content */}</Card>
}
```

### Smart Contract Development

**Contract structure**:
1. Imports
2. Type declarations  
3. State variables
4. Events
5. Custom errors
6. Modifiers
7. Constructor
8. External functions
9. Public functions
10. Internal functions
11. Private functions

**Security checklist**:
- ✅ ReentrancyGuard on external calls
- ✅ Access control modifiers
- ✅ Input validation with custom errors
- ✅ Checks-Effects-Interactions pattern
- ✅ NatSpec documentation

### Testing

**Coverage requirements**:
- New code: 90%+
- Critical paths: 100%
- Error scenarios: 80%+

**Test types**:
- **Unit**: Component/function logic
- **Integration**: Multi-component flows
- **E2E**: Complete user journeys
- **Contract**: Foundry tests with fuzzing

## 🔐 Security Standards

### Web3 Security
- **ALWAYS validate chain ID** before transactions
- **NEVER use ethers.js** - use viem + wagmi only
- **Default to testnets** - require explicit mainnet acknowledgment
- **Gas limits** - include to prevent griefing

### Contract Security
- **ReentrancyGuard**: All external value transfers
- **Access control**: OpenZeppelin patterns only
- **Input validation**: Custom errors, no require strings
- **Emergency functions**: Pausable for critical contracts

## 📊 Quality Gates

All PRs must pass:
- ✅ `bun test` - All tests passing
- ✅ `bun type-check` - No TypeScript errors
- ✅ `bun lint` - Clean linting
- ✅ `bun test:coverage` - Coverage maintained
- ✅ `bun build` - Successful build

## 🚨 Critical Patterns

### DO Use
- ✅ viem + wagmi for Web3
- ✅ TanStack Query for async state
- ✅ OpenZeppelin for contracts
- ✅ TypeScript strict mode
- ✅ Functional React components
- ✅ Mobile-first responsive design

### DON'T Use
- ❌ ethers.js (use viem instead)
- ❌ Class components (use functional)
- ❌ `any` types (use explicit types)
- ❌ Inline styles (use Tailwind)
- ❌ require() in Solidity (use custom errors)

## 📝 Commit Standards

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance
- `docs:` - Documentation
- `test:` - Test updates
- `refactor:` - Code refactoring

## 🧭 Navigation Guide

### Working on Frontend?
1. Read: `client/.cursor/rules/frontend-standards.mdc`
2. Reference: [docs/ACCESS_CONTROL.md](docs/ACCESS_CONTROL.md) and [docs/FRONTEND.md](docs/FRONTEND.md)
3. Check: Existing components in `client/components/`

### Working on Contracts?
1. Read: `contracts/.cursor/rules/solidity-standards.mdc`
2. Reference: [docs/CONTRACTS.md](docs/CONTRACTS.md)
3. Check: Existing contracts in `contracts/src/`

### Writing Tests?
1. Read: `.cursor/rules/testing-patterns.mdc`
2. Reference: [docs/TESTING.md](docs/TESTING.md)
3. Ensure: 90%+ coverage maintained

### Deploying?
1. Read: `.cursor/rules/deployment.mdc`
2. Reference: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. Follow: Security checklist completely

## 🎯 Common Tasks

### Task: Add new protocol integration

1. **Contract**: Create interface in `contracts/src/interfaces/`
2. **Library**: Add validation in `contracts/src/libraries/AccessControl.sol`
3. **Frontend**: Create hook in `client/hooks/nft/`
4. **Component**: Add selector in `client/components/nft/`
5. **Tests**: Add coverage in `__tests__/hooks/` and `contracts/test/`
6. **Docs**: Update [docs/guides/PROTOCOLS.md](docs/guides/PROTOCOLS.md)

### Task: Fix a bug

1. **Reproduce**: Write failing test first
2. **Fix**: Implement fix following patterns
3. **Test**: Ensure test passes + no regressions
4. **Document**: Update docs if behavior changed

### Task: Optimize performance

1. **Measure**: Use profiler/gas reporter
2. **Optimize**: Apply relevant patterns
3. **Verify**: Confirm improvement with metrics
4. **Document**: Add notes about optimization

## 🔗 Key Resources

### Documentation
- [Main README](README.md) - Get running in 5 minutes
- [Development Guide](docs/DEVELOPMENT.md) - Development workflow
- [Architecture Overview](docs/ARCHITECTURE.md) - System design
- [Access Control](docs/ACCESS_CONTROL.md) - 6 access control methods
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

### Code References
- [Example Components](client/components/jar/) - Well-tested components
- [Example Hooks](client/hooks/jar/) - Reusable hooks
- [Contract Tests](contracts/test/) - Comprehensive test examples
- [E2E Tests](e2e/) - User flow examples

### External Docs
- [viem](https://viem.sh) - Web3 library docs
- [wagmi](https://wagmi.sh) - React hooks docs
- [Foundry](https://book.getfoundry.sh/) - Contract framework
- [Next.js](https://nextjs.org/docs) - Frontend framework

## 💡 Pro Tips

1. **Use `bun type-check`** instead of full builds for TypeScript validation - it's 10x faster
2. **Start with `bun dev`** from project root - it handles everything
3. **Check existing patterns** before creating new ones
4. **Write tests first** for complex logic
5. **Reference rule files** when unsure about patterns
6. **Mobile-first** - design for mobile, then scale up
7. **Security first** - especially for contract changes

## 🆘 Troubleshooting

### "Can't find module" errors
```bash
bun install  # Reinstall dependencies
bun generate # Regenerate contract types
```

### "Port already in use"
```bash
bun dev:stop  # Stop all services
bun dev       # Restart
```

### "Contract not found"
```bash
bun deploy:local  # Redeploy contracts
bun generate      # Regenerate types
```

### "Tests failing"
```bash
bun test:coverage  # See what's not covered
bun test:watch     # Debug in watch mode
```

---

## 📣 Remember

- **Follow the rules** - They're optimized for consistency
- **Write tests** - 90%+ coverage is mandatory
- **Document changes** - Future you will thank present you
- **Security first** - Especially for Web3 code
- **Mobile-first** - Design for smallest screen first
- **Ask questions** - Better to clarify than assume

*These guidelines ensure high-quality, consistent, and secure code across the Cookie Jar protocol.*