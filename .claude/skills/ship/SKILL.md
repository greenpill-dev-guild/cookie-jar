---
name: ship
description: Commit, push and open a pull request with fresh local proof and current-head CI.
disable-model-invocation: true
argument-hint: "[--no-pr] [--base dev]"
---

# Ship

Iron law: no readiness claim without fresh evidence for the current commit.

## 1. Resolve the branch

- `git branch --show-current`. Stop on `main`, `dev`, or a detached HEAD: create a branch first
  (`chore/…`, `feat/…`, `fix/…`, `test/…`).
- Base is `origin/dev` unless `--base` says otherwise. `main` only receives release merges from `dev`.
- `git status --short`: refuse to continue with credential-looking files (`.env*`, keystores,
  `*.pem`), staged files over 5 MB, or unrelated changes mixed in. `lib/openzeppelin-contracts`
  showing untracked content is expected (the ERC777 shims).

## 2. Prove the change

Run the smallest direct check that exercises what changed, then the gate:

- Client: `bun check`, the touched vitest files, `cd client && bun run test` once, and
  `cd client && bun run build:skip-lint` when routes, config or dependencies changed.
- Contracts: `bun run test:contracts`; `cd contracts && forge build --sizes` when the jar or its
  libraries changed (factory under 24,576 bytes).
- Deploy tooling: `bash -n scripts/*.sh`, `bun scripts/sync-deployments.ts --chain 42161 --dry-run`.
- Dependencies: `bun install --frozen-lockfile` and `bun audit --audit-level high`.
- Formatting: `bun format:check` (Biome, tabs and double quotes).

Paste the final line of each command in the PR body. If anything fails, the outcome is
`FAILED` and shipping stops.

## 3. Commit

Conventional commits (`type(scope): description`), one logical change per commit, staged by
path rather than `git add -A`. Every commit message ends with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Inspect `git diff --cached --stat`
before committing.

## 4. Push and open the PR

`git push -u origin <branch>`, then `gh pr create --base dev` with a body that has Summary,
Test plan (the commands from step 2 with their results), links to the Linear issue, and the
footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. If `gh` cannot create
the PR (the GitHub CLI OAuth app is not approved for the org), print the compare URL
`https://github.com/greenpill-dev-guild/cookie-jar/compare/dev...<branch>?expand=1` for the user.

## 5. Require current-head CI

Report the PR link and `gh pr checks <number>` once the workflows finish. Outcome is `READY` only
when every check on the current head is green; `BLOCKED` if a check needs an owner action
(secrets, disabled workflow, branch protection); `FAILED` otherwise, with the failing log lines.
