# Cookie Jar - AI Agent Integration Guide

> **Comprehensive guidelines for AI coding agents working on the Cookie Jar protocol**

## 📋 Quick Reference

- **Root Rules**: [`.cursor/rules.md`](.cursor/rules.md) - Monorepo workflow & Guild standards
- **Frontend Rules**: [`client/.cursor/rules.md`](client/.cursor/rules.md) - Next.js + React + Web3 patterns
- **Contract Rules**: [`contracts/.cursor/rules.md`](contracts/.cursor/rules.md) - Solidity + Foundry standards  
- **E2E Rules**: [`e2e/.cursor/rules.md`](e2e/.cursor/rules.md) - Playwright testing patterns

## 🎯 Project Context

**Cookie Jar Protocol**: Decentralized funding pools with smart access control supporting allowlist, NFT, POAP, Unlock Protocol, Hypercerts, and Hats Protocol gating plus configurable withdrawal rules.

**Architecture**: Monorepo with client (Next.js), contracts (Foundry), and e2e (Playwright) packages.

## 🚀 Development Environment Setup

```bash
# Zero-configuration setup
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar
npm install  # Auto-installs pnpm + Foundry + dependencies
npm run dev  # Starts Anvil + deploys contracts + launches frontend
```

**Auto-included**: Local blockchain, pre-seeded demo jars, hot reload, type generation.

## 🏗️ Architecture Overview

### Core Components
1. **CookieJarFactory**: Protocol access control + jar deployments
2. **CookieJar**: Individual jar logic + withdrawal controls  
3. **CookieJarRegistry**: Metadata storage + jar lookup
4. **Frontend**: Next.js PWA with Web3 integrations
5. **E2E Tests**: Comprehensive Playwright test suite

### Tech Stack
- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind + viem/wagmi
- **Contracts**: Foundry + Solidity ^0.8.0 + OpenZeppelin  
- **Testing**: Vitest + React Testing Library + Playwright + Foundry
- **Protocols**: POAP + Unlock + Hypercerts + Hats + Alchemy NFT API

## 🎨 AI Agent Workflow

### 1. Understanding Context
Before making changes:
- Review the specific `.cursor/rules.md` file for the area you're working in
- Check existing patterns in similar components/contracts
- Understand the user flow impact of your changes

### 2. Development Approach
```bash
# Always start development environment first  
pnpm dev  # This is critical - starts blockchain + contracts + frontend

# Run relevant tests frequently
pnpm test              # All packages
pnpm test:coverage     # Ensure 90%+ coverage maintained
pnpm test:e2e         # Full user flow validation
```

### 3. Code Quality Checklist
- [ ] **TypeScript strict mode** - No `any` types, explicit interfaces
- [ ] **Tests written** - Unit tests + integration tests as needed  
- [ ] **Documentation updated** - NatSpec for contracts, JSDoc for complex functions
- [ ] **Accessibility verified** - WCAG 2.1 AA compliance for UI changes
- [ ] **Security reviewed** - Especially for smart contract modifications
- [ ] **Performance considered** - Bundle size impact, gas optimization

### 4. Web3-Specific Considerations
- **Always use viem/wagmi** (never ethers.js)
- **Default to testnets** unless explicitly confirmed for mainnet
- **Include gas estimation** and error handling for all transactions
- **Validate chain IDs** before any blockchain interactions
- **Use official protocol SDKs** (POAP, Unlock, etc.) not custom implementations

## 📚 Domain-Specific Guidance

### Frontend Development (`client/`)
- Follow [client rules](client/.cursor/rules.md) for Next.js patterns
- Use shadcn/ui components for complex UI elements  
- Implement proper loading/error states for all async operations
- Ensure mobile-first responsive design

### Smart Contract Development (`contracts/`)  
- Follow [contract rules](contracts/.cursor/rules.md) for Solidity patterns
- Use OpenZeppelin libraries for standard functionality
- Include comprehensive NatSpec documentation
- Implement proper access controls and security measures

### Testing (`__tests__/`, `e2e/`)
- Follow [e2e rules](e2e/.cursor/rules.md) for testing patterns
- Write user-centric test flows, not component-specific tests
- Ensure accessibility compliance in e2e tests
- Maintain high test coverage across all packages

## 🔒 Security & Best Practices

### Smart Contract Security
- **Reentrancy protection**: Use OpenZeppelin's ReentrancyGuard
- **Access control**: Implement role-based permissions properly
- **Input validation**: Validate all parameters with custom errors
- **Gas optimization**: Consider gas costs in all implementations

### Frontend Security  
- **Environment variables**: Never expose private keys or secrets
- **Input sanitization**: Validate all user inputs
- **Error handling**: Don't expose internal errors to users
- **CSP headers**: Implement proper content security policies

## 🎯 Common Patterns & Conventions

### Naming Conventions
- **Files**: kebab-case (`cookie-jar-factory.ts`)
- **Components**: PascalCase (`CookieJarCard.tsx`)  
- **Functions**: camelCase (`getUserJars()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_WITHDRAWAL_AMOUNT`)
- **Contracts**: PascalCase (`CookieJarFactory.sol`)

### Git & PR Workflow
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`
- **Small focused PRs**: One feature/fix per PR
- **Comprehensive descriptions**: Explain what, why, and how
- **Link issues**: Always reference related GitHub issues

## 🚨 Critical Reminders

### Before Any Deployment
- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm type-check`) 
- [ ] Linting passes (`pnpm lint`)
- [ ] Coverage maintained (`pnpm test:coverage`)
- [ ] E2E tests validate user flows (`pnpm test:e2e`)

### Web3 Deployment Checklist
- [ ] Contracts verified on block explorer
- [ ] Gas estimation reasonable for target users
- [ ] Access controls properly configured
- [ ] Emergency pause functionality tested (if applicable)

### Frontend Deployment Checklist  
- [ ] Core Web Vitals meet targets
- [ ] Accessibility compliance verified
- [ ] Mobile responsiveness tested
- [ ] Error boundaries handle edge cases

## 📞 Getting Help & Resources

- **Codebase Questions**: Search existing code patterns before creating new ones
- **Protocol Integration**: Refer to official SDK documentation
- **Testing Issues**: Check existing test files for similar patterns  
- **Performance Problems**: Use Next.js bundle analyzer and Foundry gas reports

## 🔄 Continuous Improvement

As you work on Cookie Jar:
- **Learn from patterns**: Study existing successful implementations
- **Share improvements**: Document new patterns that work well
- **Ask when uncertain**: Better to clarify than assume
- **Test thoroughly**: User experience is paramount

---

*This guide evolves with the project. When you discover better patterns or practices, update the relevant rule files to help future development.*
