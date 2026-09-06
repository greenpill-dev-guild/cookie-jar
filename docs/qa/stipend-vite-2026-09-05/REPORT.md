# Standalone Green Goods Stipend Jar QA

The Green Goods UI now builds as a separate React/Vite app in `stipend/`. The generic Cookie Jar UI remains a Next.js app in `client/`. Both use `shared/src/` for contract operations. This report covers the isolated migration branch and supersedes the earlier combined-UI deployment instructions; it is not a release approval or final merged-`dev` report.

The migration includes the earlier UI, factory creation and Anvil fixture fixes. Contracts, deployment scripts, CI workflows and third-party dependency versions were not changed. Workspace manifests, `bun.lock`, formatter configuration and Playwright configuration changed to support the separate app. The lockfile was refreshed without installing packages; comparison found no added or removed third-party package/version identities. Existing installed packages were used for local proof. The frozen-lockfile dry run passed, and the dependency audit found no high/critical vulnerabilities.

Validation used the installed Node 24 runtime. `bun check` and `bun format:check` pass; the generic unit suite has 278 passing tests and 65 skips; the stipend suite has 35 passing tests and no skips. The initial transaction/navigation run passed 36 checks, the final strict UI/route run passed 36, the root accessibility command passed 50, and the public-read simulation passed 2. Both production builds pass. Logs and screenshots are in [evidence/](evidence/). Temporary public simulation servers have been stopped.

## Results

| Result | Checked item | Evidence |
| --- | --- | --- |
| PASS | Generic home displays Cookie Jar and browse/create actions without a featured stipend; creation has no stipend preset | `generic-home-red.log`, `generic-unit.log`, `e2e.log`, generic screenshots |
| PASS | Stipend has its own Vite entry, router, environment, branding, wallet config, assets and Vercel project configuration | `vite-build.log`, boundary tests, `docs/STIPEND-APP.md` |
| PASS | Shared transaction logic has no Next dependency; only generated ABI/registry data is imported from the canonical client paths | Boundary tests and independent production builds |
| PASS | Jar-details surface uses a solid semantic background and readable text in both themes | Route screenshots, axe assertions and `stipend-ui.spec.ts` |
| PASS | Preset encodes 800 USDC as 800000000, 1 USDC as 1000000, 28 days as 2419200; explicit zero fee, Safe owner and Team hat match the runbook | `stipend-unit.log`; preset/review screenshots |
| PASS | Owner and deliberate edits survive wallet changes; preset is opt-in/customizable; connection returns to review without submission | Unit and creation E2E tests |
| PASS | Invalid amounts/missing token metadata/wrong chain/rejection/duplicate submissions are guarded; submitted configuration survives receipt retries | Unit tests and local receipt assertions |
| PASS | Local factory creation produces a real receipt, reads the emitted address, opens a chain-aware URL and retains local reads after a wallet network change | `e2e.log`, creation screenshots |
| PASS | Eligible account claims 0.1 ETH with a Linear note; balance and interval update; second claim refused; 1 ETH deposit; ineligible and wrong-network controls disabled | `e2e.log`, operations screenshots; local Anvil only |
| PASS | Owner changes maximum/interval, pauses/unpauses and performs emergency withdrawal; receipts and resulting state checked | `e2e.log`, admin screenshots; local Anvil only |
| PASS | Home, jar, jars, create, profile redirect, invalid address, invalid chain and not-found UI render at 375/1440 px in light/dark | Four route evidence directories, each with screenshots and observations.json |
| PASS | Strict axe checks, real keyboard jar navigation, 44 px controls, labels, focus and no horizontal overflow | Browser assertions; see accessibility log for the separate legacy generic checks |
| PASS | Wallet initialization under React Strict Mode produces no route console warning; theme changes avoid transient contrast failures | `hydration-red.log`, `flows-red.log`, final route observations and creation checks |
| PASS | Broken/missing metadata images use the app-owned icon; removed metadata does not retain a stale image | `image-red.log`, image regression tests and updated jars screenshots |
| PASS | Empty jar list uses plain copy and a working creation action; runtime diagnostics use the shared logger | `copy-logging-red.log`, empty-state and logger-boundary tests |
| PASS | CSP report-only, nosniff, referrer and permissions headers; OG/Twitter tags; canonical images and original image aliases | `ui-final.log` and `vercel.json`; deployed Vercel headers still need preview verification |
| PASS | Controlled render failure reaches the error boundary and recovers | Error/recovery screenshots and E2E assertions |
| PASS | Arbitrum without a featured address shows the empty state and `/jars` link | `public-browser.log`, `arbitrum-empty.png` |
| PASS | Public factory read returns jars; a selected jar renders six-decimal USDC, its 160 USDC maximum, 30-day interval and Allowlist gate without a wallet | `public-factory.json`, `public-jar.json`, `public-browser.log`, `arbitrum-usdc.png` |
| PASS | No date-based changes to the editable 800 USDC launch preset | Preset tests/source review; the public sample jar is independent of this preset |
| PASS | Each React workspace declares its own React types for isolated installs | `workspace-types-red.log`, `workspace-types-unit.log`, `workspace-types-check.log`; 35 stipend tests pass |
| PASS | Specification and standards reviews | Both review axes approved after the three recorded findings were fixed |
| BLOCKED | User's existing passkey session / real-wallet test | The already-open Brave Green Goods tab is controlled by another Codex task. Rabby was not used after the user clarified their preference. Anvil injected-provider tests do not satisfy this gate. Owner: Afo / frontend QA |
| BLOCKED | Existing Vercel project workspace access | Automatic preview installation cannot resolve `@cookie-jar/core`. Enable source outside `client/` and run installation from the repository root. Owner: Afo / Vercel project maintainer |
| BLOCKED | Final QA on `dev`, current-head CI and Vercel preview verification | Required after PR #41 and the accepted migration/fixes merge. Owner: release maintainer |
| BLOCKED | Release PR #40 and production deployment | Remain open/held until the final report passes and Afo approves |

## CI follow-up

[PR #45](https://github.com/greenpill-dev-guild/cookie-jar/pull/45) is a draft into `dev`. On its initial published commit `4272a24`, CodeQL analysis, client unit tests, Anvil integration tests, dependency audit and contract size checks passed. The quality check exposed missing React types in the shared workspace under an isolated install. A new regression check failed first, then passed after the shared manifest explicitly declared the existing React types; the lockfile adds only that workspace declaration. Current-head CI remains the final proof of the isolated-install fix; see the PR checks for the latest status.

The existing Vercel project's automatic preview failed during installation with `Workspace dependency "@cookie-jar/core" not found`. This is a **major deployment configuration blocker**, owned by Afo / the Vercel project maintainer. Reproduce by building the migration with the current client-only project source/install settings. The settings above and in `STIPEND-APP.md` must be applied before retrying. No Vercel project settings or production deployments were changed by this task.

Slither's separate advisory job failed because its compiler could not resolve `../lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol`, then had no `results.sarif` to upload ([job log](https://github.com/greenpill-dev-guild/cookie-jar/actions/runs/34014473625/job/101435769320)). This is an out-of-scope contract-analysis/CI note, owned by the CI maintainer, not a CodeQL analysis failure. No workflow or contract changes were made.

## Remaining observations and limitations

- **Minor, external seeded metadata, owner: fixture/data maintainer.** Open `/jars` on local Anvil. Two seeded image URLs (`cookie-monster.jpg` and `airdrop.jpg`) fail at raw.githubusercontent.com. Their failed requests are recorded per page; the app-owned fallback renders. The seed/deployment scripts are outside this task, so no seed changes were made.
- **Minor, static hosting semantics, owner: frontend maintainer.** Request an unknown app route directly. The Vite SPA renders the not-found UI but the fallback HTTP response is 200. This is documented in the Vercel settings; a true HTTP 404 needs a hosting route decision. Do not report server 404 status as tested/passing.
- **Performance note, owner: frontend maintainer.** The Vite production build warns about a large initial wallet/UI chunk (about 348 kB gzip). No dependency upgrades or visual redesign were introduced to address it.
- The existing generic unit suite has 65 skipped tests. The 278 active tests pass; skips are not counted as proof. The stipend suite has no skipped tests.
- The public sample jar was read from the approved factory, not created by this task and not selected for deployment. Its history scan was bounded to the observed latest block for this read-only comparison. Production should use the actual selected jar's creation block. No public writes occurred.
- Temporary Arbitrum simulation settings were process-only; no env files or wallet credentials were read or changed.

The complete Vercel settings are in [STIPEND-APP.md](../../STIPEND-APP.md). Use a separate Vite project rooted at `stipend`, with source outside the root included, Node 24, output `dist`, production domain `cookies.greengoods.app` on `main`, and `beta.cookies.greengoods.app` assigned to the `dev` preview branch.
