# Cookie Jar - Root Level Rules

## Greenpill Dev Guild Principles
- Open source, transparent, regen-positive development
- Work in public with clear documentation
- Mobile-first PWA approach
- Web3-native with ethical considerations

## Monorepo Structure & Workflow
- Use pnpm for package management
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- All PRs require passing CI: build, test, lint, type-check
- Never decrease test coverage below current levels
- Scripts coordination: `pnpm dev` starts full stack (Anvil + Client)

## Development Commands
```bash
# Development (auto-starts Anvil + deploys contracts)
pnpm dev                # Local with fresh chain
pnpm dev:ethereum       # Fork Ethereum mainnet  
pnpm dev:base           # Fork Base network

# Testing & Quality
pnpm test              # All tests across packages
pnpm test:coverage     # Coverage report
pnpm lint              # Lint all packages
pnpm build             # Build all packages
```

## Environment & Security
- Use `.env.local` for local development 
- Never commit secrets or private keys
- Default to testnets (Base Sepolia, Celo Alfajores)
- Require `// I ACKNOWLEDGE MAINNET` for mainnet operations
- Use Foundry keystore for production deployments

## Tech Stack Standards
- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind
- **Web3**: viem + wagmi (NOT ethers)  
- **Smart Contracts**: Foundry + Solidity ^0.8.0 + OpenZeppelin
- **Testing**: Vitest (unit) + Playwright (e2e) + Foundry (contracts)
- **Protocols**: POAP, Unlock, Hypercerts, Hats via official SDKs

## Quality Gates
- TypeScript strict mode across all packages
- 90%+ test coverage for new code
- All builds must succeed without warnings
- Accessibility: WCAG 2.1 AA compliance minimum
- Performance: Core Web Vitals targets met