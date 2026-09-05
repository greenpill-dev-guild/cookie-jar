---
name: review
description: Full change review for this repo along two axes (Standards and Spec) with a verdict.
disable-model-invocation: true
argument-hint: "[fixed point: branch, commit, PR#] [--scope client|contracts|ci]"
---

# Review

Two-axis review of `git diff <fixed-point>...HEAD` (three-dot, against the merge base). Standards
asks whether the code follows this repo's rules; Spec asks whether it does what the issue, plan or
PR description asked for. Both run as parallel sub-agents so one axis cannot mask the other.

## 1. Pin the scope

- Fixed point from the argument, else `origin/dev`. Confirm `git rev-parse <fixed-point>` and a
  non-empty `git diff --stat <fixed-point>...HEAD`; stop with a clear message if either fails.
- List the commits: `git log <fixed-point>..HEAD --oneline`.
- State the review intent before reading code: evidence for a decision, or production readiness.

## 2. Find the spec

In order: the Linear issue or PR body named in the commits or the branch, `/Users/afo/.claude/plans/`
files referenced by the user, `docs/DEPLOYMENT.md` for deploy work, the conversation. If none
exists, the Spec axis reports "no spec available" and the review continues on Standards alone.

## 3. Standards sources

`.claude/rules/*.md` (path-scoped), `.claude/context/values.md` (quality contract and
criticality matrix), `AGENTS.md`. On top of those, the Fowler smell baseline: mysterious name,
duplicated code, feature envy, data clumps, primitive obsession, repeated switches, shotgun surgery,
divergent change, speculative generality, message chains, middle man, refused bequest. A documented
repo rule always overrides the baseline; a smell is a judgement call, never a hard violation.

## 4. Run both axes in parallel

Spawn two sub-agents with the diff command, the commit list and the file list.

- **Standards brief**: report each documented-rule violation (cite the rule file and number) and
  each baseline smell (name it, quote the hunk). Skip anything tooling enforces (`bun lint`,
  `bun format:check`, `bun type-check`). Note repo invariants specifically: chainId threaded through
  jar reads and writes, V2 entry points, no raw hex classes, no `console.*`, no secrets, no
  Solidity writing client files, factory size. Under 400 words.
- **Spec brief**: report requirements that are missing or partial, behaviour nobody asked for, and
  requirements that look implemented but wrong. Quote the spec line for each. Under 400 words.

## 5. Verify the risky findings yourself

For anything in the critical rows of the criticality matrix (contracts, `client/hooks/jar`,
`client/config`), reproduce the claim: run the test file, read the contract function, or `cast call`
the deployed contract. Mark each finding `CONFIRMED` or `PLAUSIBLE`.

## 6. Report

`## Standards` and `## Spec` sections, findings as
`[Title] - severity - file:line - why it matters - next step`, ordered by severity inside each axis.
Do not merge or rerank across axes. End with one line per axis (count, worst issue) and a verdict:
`APPROVE`, `REQUEST_CHANGES` or `COMMENT_ONLY`. A change that follows every rule but implements the
wrong thing gets `REQUEST_CHANGES`.

## Validation evidence

Before the verdict, run what the change touches and paste the last lines: `bun check`,
`cd client && bun run test` (or the specific files), `bun run test:contracts` for Solidity,
`cd contracts && forge build --sizes` when `CookieJar.sol` or its libraries changed.
