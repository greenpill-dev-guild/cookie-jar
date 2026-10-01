---
paths:
  - "client/**/*.{ts,tsx}"
---
# Frontend rules (Next.js 15, wagmi 2, viem 2, RainbowKit, shadcn/ui, Tailwind 3)

1. **viem and wagmi only.** Never import ethers. Reads go through `useReadContract`,
   `useReadContracts` or `publicClient.readContract`; writes through `useWriteContract`,
   wrapped by `useTransactionWithRetry`. ABIs come from `client/generated.ts` (`bun generate`);
   the only hand-written fragments are viem's `erc20Abi`, `erc721Abi` and `erc1155Abi`.
2. **Pass the jar's chainId explicitly.** Jar hooks take `chainId` and forward it to every read
   and write (`useCookieJarConfig(address, chainId)`, `useJarTransactions(config, address,
   { chainId })`). The wallet chain is not the jar chain: the home page reads Arbitrum while
   the wallet may sit elsewhere, and `WrongNetworkBanner` handles the mismatch.
3. **Access types are the contract enum** in `client/lib/jar/access-types.ts` (0 Allowlist,
   1 ERC721, 2 ERC1155). "Hats" and "POAP" are labels derived from the gate contract, not
   enum values. Eligibility is `useJarPermissions().eligibility`; never infer it from the
   access type alone.
4. **Claims and deposits use the V2 entry points** chosen in `client/lib/jar/deposit-args.ts`
   (`withdrawFunctionFor`, `buildDepositCall`). Funds only count when they enter through
   `deposit()`; UI copy must never suggest a plain transfer.
5. **Query keys carry chainId and address** (`["jar-withdrawals", chainId, jar, currency,
   fromBlock]`); chain reads use a `staleTime` around 30 s; refetch after a successful write
   (see `JarPageContent`).
6. **Logging** goes through `log` from `@/lib/app/logger`; no `console.*` in components or hooks.
7. **Styling** uses semantic Tailwind tokens (`bg-card`, `text-foreground`, `text-muted-foreground`,
   `bg-primary`, `text-success|warning|info|destructive`). No raw hex classes; RainbowKit takes
   hex from `client/lib/app/theme-colors.ts`. Green is an accent (buttons, badges, highlights),
   never a page fill.
8. **Copy** uses plain words for guild contributors: Claim, Deposit, Admin, note, Team hat.
   No cookie jokes in UI text and no em dashes.
9. **Images** go through `next/image` with `images.remotePatterns`; icons and the OpenGraph
   image are generated routes (`app/icon.tsx`, `app/opengraph-image.tsx`), not binary assets.
10. **Accessibility**: inputs have labels (`htmlFor`), live banners use `role="status"`, touch
    targets are at least 44 px, and colour is always paired with text.
11. **Environment**: only literal `process.env.NEXT_PUBLIC_*` references (Next inlines literals).
    A new variable is declared in `client/env.d.ts`, `client/next.config.mjs` (`env`) and
    `example.env`.

Deep reference: `.claude/context/architecture.md`.
