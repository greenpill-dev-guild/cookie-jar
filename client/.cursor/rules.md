# Cookie Jar Client - Frontend Rules

## Next.js App Router Structure
```
client/
├── app/                     # App Router (Next.js 15)
│   ├── create/             # Jar creation flow
│   ├── jar/[address]/      # Individual jar pages  
│   ├── jars/              # Jar listing
│   └── profile/           # User profile
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui primitives
│   ├── create/           # Creation flow components
│   ├── jar/              # Jar-specific components
│   └── nft/              # NFT-related components
├── hooks/                # Custom React hooks
│   ├── app/              # App-level hooks
│   ├── jar/              # Jar interaction hooks
│   └── nft/              # NFT validation hooks
└── lib/                  # Utility functions
```

## Component Patterns
- **Functional components only** - no class components
- **Named exports preferred** for better tree-shaking
- **Co-locate tests**: `Component.tsx` → `Component.test.tsx`
- **Props interfaces**: Define explicit TypeScript interfaces
- **Error boundaries**: Wrap route components
- **Loading states**: Show skeletons, not spinners

## Web3 Integration Standards
- **viem + wagmi** (never ethers.js) for blockchain interactions
- **RainbowKit** for wallet connection UI
- **Chain validation**: Always verify chainId before transactions
- **Gas estimation**: Include gas limits and error handling
- **Transaction states**: Loading, success, error with user feedback

## Protocol Integration Patterns
```typescript
// Use official SDKs, not custom implementations
import { POAPEvent } from '@poap-xyz/poap-sdk'
import { UnlockLock } from '@unlock-protocol/unlock-js' 
import { Hypercert } from '@hypercerts-org/sdk'
import { Hat } from '@hatsprotocol/sdk-v1-subgraph'
```

## State Management Rules
- **TanStack Query** for server/blockchain state
- **React hooks** for local component state
- **No prop drilling** - use context sparingly
- **Immutable updates** - never mutate state directly

## Styling & UI Standards
- **Tailwind CSS** utility-first approach
- **shadcn/ui** for complex components (dialogs, forms)
- **Mobile-first** responsive design
- **Theme support**: Light/dark mode via CSS variables
- **Consistent spacing**: Use Tailwind spacing scale

## Testing Requirements
```bash
pnpm test              # Run all unit tests
pnpm test:watch        # Watch mode during development
pnpm test:coverage     # Generate coverage report (90%+ required)
```

## Performance & Accessibility
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Image optimization**: Use Next.js Image component
- **Bundle size**: Monitor with `@next/bundle-analyzer`
- **Keyboard navigation**: All interactive elements accessible
- **Screen reader support**: Proper ARIA labels and semantic HTML

## Development Commands
```bash
pnpm dev           # Start development server (Next.js with HMR)
pnpm build         # Production build
pnpm type-check    # Fast TypeScript error checking (preferred for type validation)
pnpm test          # Run tests (Vitest)
pnpm test:watch    # Run tests in watch mode
pnpm lint          # ESLint checking
pnpm generate      # Generate contract types (wagmi)
```

### TypeScript Development Tips
- **Use `pnpm type-check`** for rapid TypeScript error validation
- **Avoid `pnpm build`** for simple type checking - it's much slower (includes bundling/optimization)
- **Full builds** are only needed before deployment or when testing complete build pipeline
