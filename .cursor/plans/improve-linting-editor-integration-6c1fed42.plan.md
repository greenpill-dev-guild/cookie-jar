<!-- 6c1fed42-3933-4d92-b17a-2ae8eead0573 23b313c3-237f-4d1c-b693-52e8f9d0b861 -->
# Fix ESLint Errors and Migrate to ESLint CLI

## Current Issues
- `next lint` deprecated → need to migrate to ESLint CLI
- Parser errors with numeric separators (16 files) → config issue
- 40+ unused variables → prefix with `_` or remove
- 35+ console statements → convert to `log.*`
- 5 img tags → convert to `<Image />`
- 5 hook dependency issues → add missing deps

## Solution Strategy

### 1. Fix ESLint Parser Configuration

**Problem**: "Parsing error: Numeric separators are not allowed here"

**Root Cause**: ESLint parser not configured for modern TypeScript features

**Fix**: Update `client/.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals"],
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "react/no-unescaped-entities": "error",
    "@next/next/no-img-element": "error",
    "react-hooks/exhaustive-deps": "error",
    "react-hooks/rules-of-hooks": "error"
  }
}
```

### 2. Migrate to ESLint CLI

**Current**: `"lint": "next lint"`  
**New**: `"lint": "eslint . --ext .ts,.tsx,.js,.jsx"`

Update `client/package.json`:
```json
"scripts": {
  "lint": "eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0",
  "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
  "build": "pnpm run lint && next build"
}
```

### 3. Auto-Fix Simple Errors

Run ESLint auto-fix to handle:
- Formatting issues
- Some unused imports
- Fixable spacing/syntax issues

```bash
cd client
pnpm lint:fix
```

### 4. Fix Unused Variables (Systematic Approach)

**Strategy**: Prefix with `_` if needed for destructuring/API, remove if truly unused

Files to fix:
- `components/create/CreateJarModals.tsx` (2 vars)
- `components/docs/DocsSidebar.tsx` (1 var)
- `components/jar/AdminFunctions.tsx` (1 var)
- `components/jar/AllowListAddressInput.tsx` (1 var)
- `components/jars/JarContentLazy.tsx` (1 var)
- `components/nft/ProtocolSelector.tsx` (5 vars)
- `components/nft/UnlockMembershipStatus.tsx` (1 var)
- `components/nft/protocols/*.tsx` (4 vars)
- `components/profile/MobileProfile.tsx` (1 var)
- `components/ui/chart.tsx` (4 vars)
- `components/ui/sidebar.tsx` (4 vars)
- `components/ui/use-toast.ts` (1 var)
- `components/wallet/CustomConnectButton.tsx` (1 var)
- `lib/app/logger.ts` (5 vars)
- `lib/blockchain/token-utils.ts` (1 var)
- `lib/nft/AlchemyProvider.ts` (6 vars)
- `lib/nft/advanced/*.ts` (3 vars)
- `lib/nft/cache/NFTCacheManager.ts` (2 vars)
- `lib/nft/performance/NFTPerformanceOptimizer.ts` (2 vars)
- `lib/nft/protocols/*.ts` (11 vars)

### 5. Fix Console Statements

**Strategy**: Already have logger, but it uses console internally - add no-console exception for logger file

Add to `lib/app/logger.ts`:
```typescript
/* eslint-disable no-console */
// Logger implementation needs console
```

### 6. Fix Hook Dependencies

Add missing dependencies to:
- `components/nft/protocols/HatsConfig.tsx` - add `validateHat`
- `components/nft/protocols/HypercertConfig.tsx` - add `validateHypercert`
- `components/nft/protocols/UnlockConfig.tsx` - add `validateLock`
- `components/wallet/CustomConnectButton.tsx` - add `checkTermsAccepted`
- `components/jars/JarContentLazy.tsx` - remove `filterOption`

### 7. Convert img to Image

Files needing conversion:
- `components/nft/protocols/HatsConfig.tsx` (1)
- `components/nft/protocols/HypercertConfig.tsx` (1)
- `components/nft/protocols/POAPConfig.tsx` (2)
- `components/wallet/CustomConnectButton.tsx` (1)

## Quick Command Sequence

```bash
# 1. Update ESLint config (manual edit)
# 2. Migrate to ESLint CLI (manual edit package.json)

# 3. Run auto-fix
cd client
pnpm lint:fix

# 4. Fix remaining issues (manual edits)

# 5. Verify
pnpm lint
pnpm type-check
pnpm build
```

## Expected Outcome

- ✅ Parser errors resolved (numeric separators work)
- ✅ ESLint CLI migration complete
- ✅ Auto-fixable errors resolved
- ✅ Unused variables prefixed or removed
- ✅ Console statements in logger file exempted
- ✅ Hook dependencies corrected
- ✅ Images converted to Next.js Image component
- ✅ Build passes without errors


### To-dos

- [ ] Update .eslintrc.json with parserOptions for numeric separators
- [ ] Update package.json to use ESLint CLI instead of next lint
- [ ] Run pnpm lint:fix to auto-fix simple errors
- [ ] Prefix unused variables with _ or remove them
- [ ] Add eslint-disable for console in logger.ts
- [ ] Add missing hook dependencies or remove unnecessary ones
- [ ] Convert img tags to Next.js Image component
- [ ] Verify build passes with pnpm build