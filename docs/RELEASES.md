# Release History

> Chronological record of Cookie Jar releases and changes

## Release 3.2.0 (February 2026)

### Major Features

- **NFT Gating Production Hardening**: Comprehensive audit fixes for NFT-gated withdrawals including ERC-721/ERC-1155 balance proof validation, race condition prevention, and real-time ownership verification
- **Unicode-Aware Purpose Validation**: Both Solidity contracts and client now count Unicode code points instead of raw bytes, ensuring consistent validation for multi-byte characters (emoji, CJK, etc.)
- **OZ v5 ERC777 Compatibility**: Automated compatibility shim (`scripts/oz-compat.sh`) resolves OpenZeppelin v5 breaking change where ERC777 interfaces moved from `token/ERC777/` to `interfaces/`, ensuring Superfluid imports work in CI

### Improvements

- **WCAG Accessibility**: Select component checked states use proper foreground tokens for 4.5:1 contrast ratio; NFT form labels linked to inputs via htmlFor/id
- **Type Safety**: `safeBigInt()` helper prevents `BigInt()` throws on invalid manual NFT token ID input; `as const` tuples for wagmi `useReadContract` args
- **Deposit UX**: Fixed `RangeError` from negative `"0".repeat()` in ERC-20 deposit placeholder when `tokenDecimals` is 0 or negative
- **CI Pipeline**: All 4 GitHub Actions workflows passing (contract tests, integration tests, unit tests, lint & type check); Vercel preview deployments working
- **Script Correctness**: Fixed `bun test` → `bun run test` across `package.json` and documentation to ensure Vitest (not Bun's native runner) is invoked

### Configuration

- **bunfig.toml**: Removed Vitest preload that broke Bun's native test runner; removed hardcoded `NODE_ENV=production` that prevented dev mode
- **Foundry remappings**: Standardized to `prefix/=path/` form with trailing slashes in both `foundry.toml` and `contracts/remappings.txt`
- **Vercel**: Added `vercel.json` for bun-based builds after pnpm→bun migration

### Contract Changes

- `CookieJarValidation.countUnicodeCodePoints()` — new internal pure helper counting UTF-8 leading bytes
- `CookieJarValidation.validatePurpose()` — now uses code point counting instead of `bytes().length`
- `CookieJar._validateWithdrawalConstraints()` — delegates to `CookieJarValidation.validatePurpose()` instead of inline byte-length check
- NFT gating: tightened `ownerOf` / `balanceOf` checks, added ERC1155 balance proof parameters

### Breaking Changes

None — backward compatible with 3.1.x

---

## Release 3.1.0 (October 2025)

### Major Features

- **Superfluid Integration**: Real-time money streaming
- **Uniswap Universal Router**: Multi-version swap support
- **The Graph Integration**: Enhanced data indexing
- **NFT Enhancements**: Improved mobile UX and search

### Improvements

- Enhanced mobile responsiveness
- Better error handling
- Performance optimizations
- Documentation restructuring

### Bug Fixes

- Fixed jar creation race conditions
- Corrected NFT validation edge cases
- Resolved streaming rate calculations
- Fixed allowlist management issues

### Breaking Changes

None - backward compatible with 3.0.x

---

## Release 3.0.0 (September 2025)

### Major Features

- **Six Access Control Methods**: Allowlist, NFT, POAP, Unlock, Hypercerts, Hats
- **Multi-Token Support**: ETH + any ERC20
- **Advanced NFT Integration**: Comprehensive NFT functionality
- **Enhanced Security**: ReentrancyGuard, custom errors, access controls

### Architecture

- Modular contract design
- Factory pattern for jars
- Centralized registry
- Library extraction

### Frontend

- Next.js 15 upgrade
- React Query integration
- viem + wagmi v2
- Comprehensive testing

### Breaking Changes

- New contract interfaces (not compatible with 2.x)
- Updated frontend APIs
- Changed deployment addresses

---

## Release 2.0.0 (August 2025)

### Major Features

- **NFT-Gated Access**: ERC-721/ERC-1155 support
- **POAP Integration**: Event-based access
- **Improved UI**: Redesigned interface
- **Better Testing**: 90%+ coverage

### Improvements

- Gas optimizations
- Better mobile experience
- Enhanced error messages
- Documentation improvements

### Breaking Changes

- Contract ABI changes
- New access control system

---

## Release 1.0.0 (July 2025)

### Initial Release

- **Core Functionality**: Allowlist-based jars
- **ETH Support**: Native ETH deposits/withdrawals
- **Factory Pattern**: Scalable jar creation
- **Basic UI**: Functional interface

### Features

- Allowlist management
- Fixed/variable withdrawals
- Cooldown periods
- Purpose tracking

---

## Versioning

Cookie Jar follows [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

## Upgrade Guides

See [README.md](../README.md) for current setup and upgrade guidance.

---

*Last updated: February 2026*
