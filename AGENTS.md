# Cookie Jar: agent guide

The repository contract for any coding agent (Claude Code, Codex, Cursor). Claude-specific entry
points live in `CLAUDE.md`; path-scoped rules in `.claude/rules/`; deep references in
`.claude/context/`; the deployment runbook in `docs/DEPLOYMENT.md`.

## What this repo is

Cookie Jar is a funding-pool protocol: a factory creates jars that allowlisted or token-gated
members withdraw from under fixed rules. The guild runs one live jar for the contributor stipend
on Arbitrum One (USDC, gated by the Green Goods "Team" hat, owned by the Working Capital multi-sig)
and serves it at `cookies.greengoods.app`. Everything else in the client is secondary to that jar
working correctly.

## Repository map

| Path | Role |
| --- | --- |
| `client/` | Next.js 15 App Router (React 18, wagmi 2, viem 2, RainbowKit, shadcn/ui, Tailwind 3, Vitest) |
| `contracts/` | Foundry: `CookieJarFactory.sol`, `CookieJar.sol`, libraries, scripts (`Deploy`, `CreateJar`, `DeployLocal`), tests |
| `e2e/` | Playwright specs run against `bun dev` (Anvil + seeded jars) |
| `scripts/` | `deploy.sh`, `sync-deployments.ts`, `dev-start.sh`, `oz-compat.sh`, `install-deps.sh` |
| `lib/` | Git submodules: forge-std, openzeppelin-contracts (v5), permit2, protocol-monorepo, universal-router |
| `.github/` | Workflows (quality, unit, contract, integration, e2e, accessibility, security) and Dependabot |
| `docs/` | `DEPLOYMENT.md` runbook, `RELEASES.md` |

## Commands

```bash
bun install --frozen-lockfile   # the lockfile is the source of truth
bun dev                         # Anvil + seed deploy + registry sync + Next dev on :3000
bun check                       # oxlint + Next rules + tsc
bun format:check                # Biome (tabs, double quotes); bun format to fix
cd client && bun run test       # vitest (never `bun test`: Bun's runner ignores the config)
bun run test:contracts          # forge test, dev profile (solc 0.8.30)
bun run test:e2e                # Playwright against a running bun dev
cd client && bun run build:skip-lint   # production build
bun audit --audit-level high    # dependency gate used by CI
bun sync:deployment -- --chain 42161   # merge a broadcast into client/config/deployments.json
bun deploy:arbitrum             # factory deploy (keystore, human only)
bun create-jar:arbitrum         # jar creation from .env.local inputs (keystore, human only)
```

## Global invariants

- viem and wagmi only; no ethers. ABIs come from `client/generated.ts` (`bun generate`).
- Every jar read and write carries the jar's `chainId`; the wallet chain is not the jar chain.
- Access types are the contract enum (Allowlist, ERC721, ERC1155); Hats and POAP are labels.
- Funds enter jars only through `deposit()`; the UI never suggests a plain transfer.
- Solidity never writes client files; `scripts/sync-deployments.ts` owns the registry.
- Immutable jar rules are never "patched": a wrong jar is abandoned and re-created.
- Secrets never enter files, workflows or chat; mainnet transactions are signed by a human from a
  Foundry keystore after a dry run.
- Semantic Tailwind tokens only (no raw hex classes); `log` from `@/lib/app/logger`, no `console`.
- Conventional commits; PRs target `dev`; `main` only receives release merges and deploys to Vercel.

## Workflow

1. Research before changing anything non-trivial: read the rule file for the path, the context
   map, and the tests that already cover the area.
2. Plan in small verifiable steps; each step ends in a command that proves it.
3. Implement test-first where a seam exists (`.claude/skills/tdd`).
4. Verify: `bun check`, the touched test files, the full suite for the package, a production build
   when routes, config or dependencies changed, `forge build --sizes` when contracts changed.
5. Review along Standards and Spec axes before shipping (`.claude/skills/review`).
6. Ship with fresh evidence and current-head CI (`.claude/skills/ship`).

## Change criticality

Critical: `contracts/**`, `client/hooks/jar/**`, `client/lib/jar/**`, `client/config/**`,
anything touching addresses, chain ids, amounts or gates. Sensitive: `client/components/jar/**`,
`.github/**`, `scripts/**`, dependency manifests. Routine: the rest. See
`.claude/context/values.md` for what each level requires.

## Multi-agent and repo safety

- Stay on the current branch; never reset or rewrite shared history; do not run bulk destructive
  git operations without a fresh, explicit instruction.
- `lib/openzeppelin-contracts` shows untracked content after installs (ERC777 shims); leave it.
- Agent worktrees live under `.claude/worktrees/` (ignored); remove yours when done.

## Verify before claiming success

"Should work", "probably fixed" and unrun commands are not evidence. Quote the command and its last
lines. For chain code, add a read from Anvil or the live contract (`cast call`). For UI, a
screenshot or a Playwright assertion.

## Writing for humans

Lead with the outcome, then evidence, then the next step. Short sentences, no em dashes, no
marketing tone. Linear issues and PR bodies: problem or outcome first, one topic per issue, never
raw agent output.
