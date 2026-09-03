---
name: debug
description: Diagnosis loop for hard bugs and regressions in this repo. Use when the user says "debug", "diagnose", reports something broken, throwing, failing, reverting, or slow, or pastes a stack trace, a revert reason or a failing test.
---

# Debug

A discipline for hard bugs. Skip a phase only when you say why.

Redact secrets in everything you show (`<REDACTED>`); build loops against environment variables.

## Phase 1: build a feedback loop (this is the skill)

You need one command that goes red on this bug and green when it is fixed. Spend most of the
effort here. In rough order of preference for this repo:

1. A failing vitest file (`cd client && bunx vitest run <file>`) or Foundry test
   (`cd contracts && FOUNDRY_PROFILE=dev forge test --match-test <name> -vvv`).
2. `cast call` against Anvil or Arbitrum reproducing the revert (`cast call <jar> 'withdrawWithErc1155(uint256,string)' ... --from <wearer> --rpc-url ...`); `cast run <tx>` for a past transaction.
3. A Playwright spec against `bun dev` asserting on the visible symptom.
4. `bun scripts/sync-deployments.ts --dry-run`, `forge script ... -vvvv` (no broadcast) for tooling.
5. A throwaway script under `/private/tmp/...` that calls the hook's pure helper directly.

For UI bugs start from the rendered surface (what the user sees, which component, which hook
feeds it) before tracing data flow. For chain bugs check the basics first: which chainId did the
read use, is the factory address in `client/config/deployments.json`, does the ABI in
`client/generated.ts` still match `contracts/out`.

Done when the command is red-capable (asserts the user's exact symptom), deterministic, fast, and
you have run it at least once and shown the output.

## Phase 2: reproduce and minimise

Run the loop, watch it go red, confirm it is the user's failure and not a neighbour. Cut inputs,
config and steps one at a time until every remaining element is load-bearing.

## Phase 3: hypothesise

Write three to five ranked, falsifiable hypotheses ("if X, changing Y makes it disappear"). Show
them to the user; they often know which one to skip.

## Phase 4: instrument

One variable at a time. Prefer a breakpoint or a targeted `log.debug` tagged `[DEBUG-xxxx]` over
logging everything; `cast --trace` for on-chain calls. Never `console.log`.

## Phase 5: fix with a regression test

Write the test at the correct seam before the fix (see the `tdd` skill), watch it fail, apply the
fix, watch it pass, re-run the original loop. If no seam exists for the bug, say so: that is a
finding about the architecture.

## Phase 6: clean up

Remove every `[DEBUG-...]` line (`grep -rn "DEBUG-" client contracts`), delete throwaway scripts,
and state the confirmed hypothesis in the commit message.
