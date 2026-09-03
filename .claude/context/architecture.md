# Architecture map

Bun workspace: `client/` (Next.js 15 App Router, React 18), `contracts/` (Foundry), `e2e/`
(Playwright), `scripts/` (bun and bash helpers). Root scripts in `package.json` are the entry
points: `bun dev`, `bun check` (lint + type-check), `bun run test`, `bun run build`.

## Client

- Routes (`client/app`): `/` featured jar (`useFeaturedJar` -> `JarPageContent`), `/jar/[address]`
  any jar, `/jars` list, `/create` wizard, `/profile`. Generated `icon.tsx`, `apple-icon.tsx`,
  `opengraph-image.tsx`; `not-found.tsx`, `error.tsx`. Every page is a client component; the
  server `layout.tsx` owns metadata and providers.
- Providers: `ThemeProvider` (next-themes) -> `RainbowKitProviderWrapper` (Wagmi + React Query +
  RainbowKit, `initialChain` = featured chain) -> `Header`, `NetworkSwitcher`, `Toaster`.
- Config: `client/config/featured-jar.ts` (env parsing, `FEATURED_JAR`, `SITE_NAME`),
  `supported-networks.ts` (chains, transports, factory address map, WalletConnect),
  `deployments.json` + generated `deployments.auto.ts` (factory registry per chain, `isV2Chain`),
  `wagmi.config.ts` (codegen only), `local.ts` (Anvil).
- Hooks (`client/hooks/jar`): `useCookieJarConfig` (batched jar + factory reads, pure
  `parseJarConfigResults`), `useJarPermissions` (owner role, allowlist, ERC721/ERC1155 gate
  balance -> `eligibility`), `useJarTransactions` (deposit, claim, emergency; picks the V2 entry
  point), `useJarWithdrawalHistory` (ERC20 Transfer logs + calldata), `useJarFactory` (jar list),
  `useJarMetadata` (parse and edit metadata through the factory), `useFeaturedJar`.
- Pure helpers (`client/lib`): `jar/access-types.ts`, `jar/deposit-args.ts`,
  `blockchain/get-logs-chunked.ts`, `blockchain/networks.ts` (explorer URLs),
  `blockchain/token-utils.ts`, `display/jar-display.ts`, `app/theme-colors.ts`, `app/logger.ts`.
- Components (`client/components`): `jar/JarPageContent` composes `ClaimStatusCard`,
  `JarDetailsCard`, `JarActionsTabs` (Claim, Deposit, Admin, Fee collector), history.
  `app/WrongNetworkBanner`, `app/header`, `app/footer`, `app/BrandMark`. `ui/` is shadcn.
- ABI: `client/generated.ts` from `bun generate` (wagmi CLI over `contracts/out`). Do not edit.
- Theme: `client/app/globals.css` tokens (Warm Earth), `client/tailwind.config.ts`.

## Contracts

- `contracts/src/CookieJarFactory.sol` creates jars (`createCookieJar(JarConfig, AccessConfig,
  MultiTokenConfig)`), stores metadata, exposes `getAllJars`, `getJarInfo`, `updateMetadata`.
  Immutables: `DEFAULT_FEE_COLLECTOR`, `DEFAULT_FEE_PERCENTAGE`, `MIN_ETH_DEPOSIT`,
  `MIN_ERC20_DEPOSIT` (the latter must suit the token decimals; 1e6 for USDC).
- `contracts/src/CookieJar.sol`: `deposit(amount)`, `withdraw`, `withdrawAllowlistMode`,
  `withdrawWithErc721`, `withdrawWithErc1155`, admin functions gated by `JAR_OWNER`,
  `emergencyWithdraw`, `pause`. Access check reads the gate contract at withdraw time.
- Libraries: `CookieJarLib` (structs, enums, events, roles), `CookieJarValidation`
  (purpose length 27 code points, intervals), `AdminLib`, `Streaming`, `SuperfluidConfig`,
  `UniversalSwapAdapter`.
- Scripts: `Deploy.s.sol` (factory from env), `CreateJar.s.sol` (jar from env with read-back
  assertions, `DRY_RUN`), `DeployLocal.s.sol` (Anvil seed: 5 jars, jar 5 ERC1155-gated).
- Tooling: `scripts/deploy.sh <network> [Script.s.sol:Contract]`, `scripts/sync-deployments.ts`,
  `scripts/dev-start.sh`, `scripts/oz-compat.sh` (ERC777 shims for Superfluid).

## Networks and deployments

- Arbitrum One (42161) is the only V2 chain in the client registry; Base, Celo, Gnosis, Optimism
  and the two testnets are V1 (legacy factory `0x86dBf7...`). Anvil (31337) is added in development.
- Stipend jar target: USDC on Arbitrum, jar owner = Working Capital multi-sig, ERC1155 gate on the
  Green Goods "Team" hat (Hats Protocol). Details and addresses: `docs/DEPLOYMENT.md`.

## CI

`.github/workflows`: code-quality (lint, format, types), unit-tests, contract-tests (dev profile,
coverage), integration-tests (Anvil), e2e-tests and accessibility (Anvil + Playwright),
security-scan (CodeQL v3, `bun audit --audit-level high`, factory size, advisory Slither).
Composite action `.github/actions/setup-bun` installs Node from `.nvmrc`, Bun from `.bun-version`
and dependencies with a frozen lockfile. Dependabot covers bun, actions and submodules.
