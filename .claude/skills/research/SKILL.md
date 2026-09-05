---
name: research
description: Evidence-first research for a bounded product, architecture, implementation, or external-fact question before planning or decision discussion. Use when a question requires reconciling repository or primary-source evidence. Read-only by default. Do not use for debugging, change review, repo-health audit, simple lookup, or historical-rationale tracing.
---

# Research

Investigate before deciding. Read-only unless the user asks for a written research note.

## 1. Frame

State the question in one sentence, the decision it unblocks, and which parts are discoverable
facts versus human judgement calls (those go back to the user, not into the findings).

## 2. Authority order

1. Sources the user named.
2. This repo: contracts (`contracts/src`), scripts, `client/config`, `docs/DEPLOYMENT.md`,
   `.claude/context`, tests.
3. On-chain state through `cast` against `https://arb1.arbitrum.io/rpc` (read only) or Anvil.
4. Primary external sources: official docs, the governing spec or source code (Foundry book,
   wagmi and viem docs, Hats Protocol docs, Etherscan API docs). Prefer these over write-ups.
5. Package source in `node_modules` when documentation and behaviour disagree.

## 3. Follow the evidence

Stop when the question is answered, when two primary sources conflict (report both), or when the
remaining unknown needs a human decision or a credential you do not have.

## 4. Classify every conclusion

- **ESTABLISHED**: backed by a primary source or a reproduced observation (quote it).
- **CORRECTED**: the repo, a plan or the user's premise said otherwise; show both.
- **INFERRED**: reasonable, unverified; say what would verify it.
- **UNRESOLVED**: needs a decision or access; say whose.

## 5. Return the brief

Question, answer in two sentences, evidence table (claim, classification, source), open items,
recommended next step. Keep it short; link rather than paste. If asked to persist it, write to
`docs/research/<slug>.md`.
