---
name: audit
description: Read-only repo health audit (dependencies, drift, dead code, CI, contract size) with routed findings.
disable-model-invocation: true
argument-hint: "[deps|client|contracts|ci|guidance] [--full]"
---

# Audit

Read-only. Never edit files, never install fallback tooling, never broadcast. The output is a
findings list the user routes to a fix pass, `/deploy`, or Linear.

## Lanes (run the ones the argument names, all of them with --full)

1. **Dependencies**: `bun install --frozen-lockfile` (the lock must match), `bun audit --audit-level
   high` (0 high or critical is the bar; list the ignored ids and why), `bun outdated` (majors behind
   are LOW, deprecated packages MEDIUM). Check `package.json` overrides still make sense.
2. **Client**: `bun check`, `cd client && bun run test`, `cd client && bun run build:skip-lint`
   (bundle table, first-load size of `/`), `grep -rnE '#[0-9a-fA-F]{6}' client/components client/app`
   for raw hex, `grep -rn "console\." client/hooks client/components`, `bunx knip` when configured.
3. **Contracts**: `bun run test:contracts`, `cd contracts && forge build --sizes` (factory headroom),
   `forge lint`, `git submodule status` versus `contracts/foundry.lock`, unknown keys in
   `contracts/foundry.toml` (forge prints warnings).
4. **CI and supply chain**: every workflow pins Bun from `.bun-version` and Node from `.nvmrc`,
   installs frozen, fails on test failures; `gh run list --limit 10` for red runs; Dependabot config
   present; `gh api repos/greenpill-dev-guild/cookie-jar/code-scanning/alerts?state=open`.
5. **Guidance drift**: every path named in `CLAUDE.md`, `AGENTS.md`, `.claude/rules/*.md`,
   `.claude/context/*.md` and `docs/DEPLOYMENT.md` exists (`git ls-files`); every command they
   quote is in `package.json`; `.claude/rules` globs match at least one tracked file.
6. **Deployment registry**: `client/config/deployments.json` matches the latest broadcast per chain
   (`bun scripts/sync-deployments.ts --chain 42161 --dry-run` prints the same address); the
   featured jar env in Vercel points at a jar the factory lists (`cast call <factory>
   'getAllJars()(address[])' --rpc-url https://arb1.arbitrum.io/rpc`).

## False-positive guardrails

- File size alone is not a finding; unused exports need a durable-caller check (workflows, scripts,
  skills) before being called dead.
- Do not propose new abstractions; report duplication only at three real copies.
- Cap MEDIUM and LOW findings at ten each; keep the rest as a count.

## Report

Group by lane. Each finding: `[severity] title - evidence (command and output line) - suggested
route (fix now, /deploy, Linear)`. Finish with a one-paragraph health summary and the commands the
user can rerun to confirm.
