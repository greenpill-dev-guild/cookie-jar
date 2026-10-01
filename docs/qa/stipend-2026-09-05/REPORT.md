# Green Goods Stipend Jar QA

**Architecture update:** The stipend UI is now a separate React/Vite app in the same repository. Use the [migration QA report](../stipend-vite-2026-09-05/REPORT.md) and [new Vercel settings](../../STIPEND-APP.md). Earlier combined-Next-UI deployment guidance is superseded. Final merged-dev and authenticated passkey QA remain pending.

**Release decision: BLOCKED. Keep release PR #40 open.**

The implementation is split into draft PRs into `dev`: [UI and accessibility #42](https://github.com/greenpill-dev-guild/cookie-jar/pull/42), [direct factory creation and transactions #43](https://github.com/greenpill-dev-guild/cookie-jar/pull/43), and [E2E repairs and this report #44](https://github.com/greenpill-dev-guild/cookie-jar/pull/44). No change was pushed to `dev` or `main`, and no PR was merged.

This is provisional integration evidence, not the required final QA on `dev`. PR #41 remains open. The combined application was tested at `ed1afa4bb13cd54c1fed927a245019817ebb9f7d` in an isolated worktree incorporating #41, UI head `15e8a6a` and creation head `6e71346`. The original shared checkout and its pre-existing contract shim were preserved. [Baseline observations and reproductions](BASELINE.md) remain available; the original report's statement that no fixes or public reads were made describes that earlier pass only.

A [release follow-up](FOLLOW-UP.md) records the streaming repair, the two CodeQL capture-helper fixes, additional contrast proof and the requested production/beta domain setup. This does not replace the final merged-`dev` QA gate.

## What changed

Jar details now use a solid semantic surface with a border. The client has labeled controls, keyboard links on jar cards, larger touch targets, corrected heading structure, stronger muted-text contrast and hydration-safe wallet theming. Further mobile testing found and repaired an empty wallet chooser and a crashing access accordion. The claim-type selector is now associated with its label.

Creation offers an explicit, editable Green Goods stipend preset. It calls the existing Arbitrum factory directly, with the documented Safe, six-decimal USDC, a variable 800 USDC cap, 28 days, Team hat access, minimum balance 1, zero deposit fee and 1 USDC minimum deposit. It preserves owner edits, labels changed presets as customized, and does not change the amount based on the date. Custom creation retains a zero minimum deposit by default.

Amount parsing rejects invalid input and unavailable token metadata. Factory selection, token reads, simulation, writes, receipt tracking and generated jar links use the selected network. Connection returns to the final review without submitting. Pending receipt failures keep the submitted configuration locked and offer a confirmation retry. Successful receipts supply the created address through the factory event. Claims, deposits and Admin actions now wait for confirmation and refresh their state.

## Recorded defects and disposition

The reproduction steps below refer to the baseline in [BASELINE.md](BASELINE.md). A passing integration check does not mean a fix has merged.

| ID | Severity | Reproduction | Disposition | Owner until merge |
| --- | --- | --- | --- | --- |
| D1 | Major | Deposit `abc`, a negative number or excessive precision | Fixed in #43; validation tests prove no write | Client hooks maintainer |
| D2 | Major | Open jar details in dark mode, especially at 375 px | Solid semantic surface in #42; screenshots and contrast checks | Client UI maintainer |
| D3 | Major | Inspect copy, playbook and owner-paste controls by accessible name | Names and regression assertions in #42 | Client UI maintainer |
| D4 | Major | Tab through `/jars` and try to open a card | Real keyboard-operable link in #42; separate gate controls | Client UI maintainer |
| D5 | Minor | Measure Connect, tabs, jar icons, Deposit and footer links | 44 px repairs and measured browser assertions in #42; checkbox follow-up included | Client UI maintainer |
| D6 | Minor | Inspect the `/jars` search label and creation claim-type selector | Explicit accessible labels in #42 | Client UI maintainer |
| D7 | Minor | Scan muted text in light mode | Semantic foreground and contrast repairs in #42 | Client UI maintainer |
| D8 | Minor | Inspect headings on home, jars, create, invalid address and mobile profile | Heading hierarchy repairs in #42 | Client UI maintainer |
| D9 | Minor | Persist dark theme and reload | Mounted wallet theme initialization and resolved system preference in #42 | Wallet UI maintainer |
| F1 | Major | Open the access step at mobile width | Invalid accordion slot markup repaired in #42; mobile creation passes | Client UI maintainer |
| F2 | Major | Connect an injected wallet on mobile | RainbowKit connector metadata repaired in #42; real local writes pass | Wallet UI maintainer |
| F3 | Major | Inject malformed jar metadata, then retry after restoring valid reads | Retry now refetches jar data in #43; controlled failure and recovery pass | Client hooks maintainer |

Each original defect has a regression test and retained failing-before evidence. Tests cover six- and eighteen-decimal conversions, 28 days = 2,419,200 seconds, 800 USDC = 800,000,000 units, 1 USDC = 1,000,000 units, explicit zero fees, unavailable metadata, wrong networks, rejection, confirmation failures and duplicate submission prevention.

## Remaining failures and release blockers

| Item | Severity | Reproduction or missing evidence | Owner |
| --- | --- | --- | --- |
| Final `dev` baseline | Blocker | PR #41 and the accepted fixes are still unmerged. Merge through normal review, then rerun this checklist on the resulting `dev` SHA. | Release maintainer |
| Real-wallet pass | Blocker | [The final browser inventory](evidence/final/wallet-availability.json) still exposes only the in-app browser. Repeat the complete account #1/#3/#0 pass with a real wallet on Anvil. The injected EIP-1193 fixture does not satisfy this gate. | Wallet QA operator |
| Final release acceptance | Blocker | The final report cannot approve #40 until the required baseline, real-wallet pass and current-head CI are accepted. | Release maintainer |
| Streaming custom-form setting is not encoded | Major, fixed in draft #43 | The unsupported controls are removed. Review says "Not configured during creation", because the factory has no disabled flag. Regression tests cover stale form values; desktop/mobile review and both themes pass WCAG checks. [Follow-up evidence](FOLLOW-UP.md). | Client creation maintainer until merge |
| Public campaign metadata title | Minor | The example public jar stores its title as `title`; the UI falls back to Cookie Jar because it reads `name`. Reproduced in the public simulation screenshot. Add metadata alias support separately or accept this limitation for non-stipend jars. | Client metadata maintainer |
| Public USDC history rows | Minor evidence gap | The card was still reading claims when the public screenshots were captured. Token amount/access reads passed, but completed history rows were not asserted. | Client QA owner |
| Framework-level route error recovery | Minor evidence gap | The real jar error boundary was exercised in the browser. `app/error.tsx` has a component test for its message and reset callback, but a Next route failure reaching that exact boundary was not induced. | Client QA owner |

Owners are responsible roles, not claims that a named teammate accepted an assignment. Anything outside the authorized surfaces is a note below, not a task.

## Evidence and validation

The [checklist](CHECKLIST.md) records one result per requested item. The [page matrix](PAGE-MATRIX.md) links desktop/mobile and light/dark screenshots plus per-page console, uncaught-error and network observations. Automated transaction evidence includes real Anvil receipts and resulting contract reads, with snapshots restored between tests. No private keys or keystores were opened, and no live transaction was sent.

| Command / check | Result | Evidence |
| --- | --- | --- |
| `bun check` | PASS, lint and TypeScript | [Combined output](evidence/final/combined-publish-check.log) |
| `bun format:check` | PASS | [Combined output](evidence/final/combined-publish-format.log) |
| `cd client && bun run test` | PASS, 295 passed, 65 skipped, 2 todo | [Combined unit log](evidence/final/combined-final-unit.log) |
| `cd client && bun run build:skip-lint` under installed Node | PASS, production build | [Build log](evidence/final/combined-production-build.log) |
| Featured, creation, operations and Admin Playwright specs | PASS, 18 desktop/mobile tests, both themes, real receipts and contract state | [Flow log](evidence/final/transactions-theme-proof.log), [receipts and screenshots](evidence/final/transactions/README.md) |
| Strict route matrix, security/metadata and controlled error recovery | PASS, 6 tests covering 32 route/theme/width captures | [Route log](evidence/final/release-evidence.log), [screenshots](PAGE-MATRIX.md), [error](evidence/final/error/error-boundary.png), [recovery](evidence/final/error/error-recovered.png) |
| `bun run test:accessibility` under installed Node | PASS, 28 tests | [Wrapper log](evidence/final/accessibility-release-proof.log) |
| E2E branch `bun check`, formatting and full client unit suite | PASS, 251 client tests passed on the unchanged dev application base | [Check](evidence/final/e2e-final-check.log), [format](evidence/final/e2e-final-format.log), [unit](evidence/final/e2e-client-unit.log) |

The flow command was `bunx --no-install playwright test e2e/featured-jar.spec.ts e2e/jar-creation.spec.ts e2e/jar-operations.spec.ts e2e/admin-functions.spec.ts --config /tmp/stipend-flow-playwright.config.ts --output /tmp/stipend-transactions-theme-proof`. The temporary Playwright config selects the combined server at port 3040; the checked-in config remains unchanged. The accessibility command was `bun run --config=/tmp/stipend-node.bunfig.toml test:accessibility --config /tmp/stipend-flow-playwright.config.ts --output /tmp/stipend-accessibility-release-proof`.

The full client suite ran at combined commit `79960c8`; the only later application change was the browser-proven claim-type label association. The subsequent check, formatting and production build ran at `ed1afa4`. The E2E branch's own client suite uses the unchanged dev application, while behavior proof uses the combined worktree. No isolated draft PR is described as having merged dependencies.

Both review axes were completed. The E2E review led to unconditional snapshot restoration, a matching-network connection test and assertions against runtime errors. The advisory Slither job fails because its SARIF output is missing; contracts/CI were left unchanged. #42 passes its accessibility CI. #43's six unnamed-control failures are covered by #42 and pass in the combined run. The existing broad Playwright CI jobs remain pending at this snapshot. [UI checks](evidence/final/pr42-checks.log), [creation checks](evidence/final/pr43-checks.log), [creation accessibility failure](evidence/final/create-ci-accessibility.log), [advisory log](evidence/final/slither-advisory.log).

Earlier failures are retained where useful: the creation test's ten-second route assertion timed out after a confirmed receipt and success state; the corrected thirty-second navigation budget passes. Route captures made without generated local files or during integration recompilation were superseded by the clean six-test run. The pre-existing accessibility wrapper logs undersized Next development-toolbar buttons and fractional transformed bounds; direct UI target checks cover application controls separately.

## Public reads and configuration simulation

Read-only Arbitrum evidence confirms factory `0x294d222eDE6DF6625B43544F1C634322467528Da` has code and returns jars, and native USDC has six decimals. [Public reads](evidence/final/public-read.json).

With `NEXT_PUBLIC_DEFAULT_CHAIN_ID=42161` and an empty featured address, the production build showed **No featured jar configured** and a **Browse all jars** link to `/jars`, at both widths in both themes. [No-featured observations](evidence/final/production-empty/observations.json), [mobile dark](evidence/final/production-empty/375-dark.png).

The configured-address simulation used factory jar `0x2f8FA6356d69d4A93F8F0944E3a68D65D5Ca2b74`. Its public values rendered as **160.0000 USDC**, **Allowlist**, fixed claims and **30 days**, agreeing with the contract reads. It is an existing campaign jar, not the proposed launch jar. This second configuration was served by Next dev using the same built source, with no wallet. [Observations](evidence/final/production-featured/observations.json), [mobile dark](evidence/final/production-featured/375-dark.png).

The simulation processes were stopped and the QA client restored to chain 31337 with featured index 4. No env file was opened or edited. The normal shared `bun dev` stack remained on port 3000; isolated integration proof used port 3040.

The [#44 check snapshot](evidence/final/pr44-checks.log) records passing lint/types and client unit tests at `9704a79`; other checks were pending. This documentation-only closeout does not claim current-head CI readiness. [Release #40](evidence/final/pr40-closeout.json) and [prerequisite #41](evidence/final/pr41-closeout.json) remain open and unmerged.

## Scope and tooling notes

- All transaction tests target `http://127.0.0.1:8545`, chain 31337, with seeded accounts. The fixture refuses live-chain writes. Public Arbitrum calls are read-only and were explicitly authorized for this implementation pass.
- Installed Node 24 is used for browser tests and the production build. The root Bun configuration forces Bun for scripts, so the accessibility wrapper uses a temporary `/tmp` Bun config with `[run] bun=false`. No dependency, CI or repository tooling changes were made.
- The isolated QA server needed copies of the public `local-deployment.json` and `seed-data.json` generated by the original `bun dev`. Missing-file errors from earlier integration captures are setup failures, not production defects. Screenshot caret hiding was disabled to avoid mutating input styles before hydration.
- Local seeded jars retain Cookie Monster names and two broken image URLs from the out-of-scope deployment seed. Native-ETH history reports its token-history limitation. These are recorded seed/history limitations, not changes to contracts or scripts.
- The public factory jar used for read-only simulation is an existing campaign jar, not the proposed stipend deployment. Its rules must not be confused with the editable 800 USDC / Team hat preset.
- Advisory Slither failures are outside this client-only task. Current PR check states are retained with the evidence; no readiness claim is made while required checks are failing or pending.
- Supplementary baseline videos/traces remain in the original shared report directory and `/tmp/stipend-baseline-supplemental`; the PR keeps the directly referenced screenshots, observations and command logs.
