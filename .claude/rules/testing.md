---
paths:
  - "client/__tests__/**"
  - "**/*.test.{ts,tsx}"
  - "e2e/**"
  - "contracts/test/**"
---
# Testing rules

1. `bun run test`, never `bun test`: Bun's built-in runner ignores the Vitest config. Client:
   `cd client && bun run test` (vitest, happy-dom). Contracts: `bun run test:contracts`. End to
   end: `bun run test:e2e` against a running `bun dev`.
2. Test at seams that survive refactors: pure helpers (`parseJarConfigResults`,
   `buildDepositCall`, `planChunks`), hooks through `renderHook` with `vi.mock("wagmi", ...)`
   (pattern in `client/__tests__/hooks/jar/useJarPermissions.test.tsx`), components through
   Testing Library queries by role and label.
3. Mock `@/config/deployments.auto` in hook tests (the registry is generated) and `@/generated`
   when the ABI does not matter.
4. Expected values come from an independent source (a worked example, the contract), never
   from re-running the code under test.
5. Playwright specs are unauthenticated by default (the wallet fixture is fake). Assert on
   visible copy and roles, never on Tailwind classes. Seeded jars come from
   `contracts/script/DeployLocal.s.sol`; jar 5 is the ERC1155 stand-in for Hats gating.
6. Foundry: one environment-driven test per script, structs everywhere else. Assert reverts with
   `vm.expectRevert(Selector.selector)` or the encoded arguments.
7. New behaviour ships with its test; a fix ships with the regression test that failed first.
