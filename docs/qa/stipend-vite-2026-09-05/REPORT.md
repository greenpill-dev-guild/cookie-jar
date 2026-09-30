# Standalone Green Goods Stipend Jar QA

The Green Goods UI now builds as a separate React/Vite app in `stipend/`. The generic Cookie Jar UI remains a Next.js app in `client/`. Both use `shared/src/` for contract operations. This report covers the isolated migration branch and supersedes the earlier combined-UI deployment instructions; it is not a release approval or final merged-`dev` report.

The migration includes the earlier UI, factory creation and Anvil fixture fixes. Contracts, deployment scripts, CI workflows and third-party dependency versions were not changed. Workspace manifests, `bun.lock`, formatter configuration and Playwright configuration changed to support the separate app. The agent guide now permits human-signed direct factory creation through the stipend UI after simulation and review; agents still cannot sign or send mainnet transactions. The lockfile was refreshed without installing packages; comparison found no added or removed third-party package/version identities. Existing installed packages were used for local proof. The frozen-lockfile dry run passed. A later current-head dependency audit reported high-severity transitive development-tool advisories; that gate remains open.

Validation used the installed Node 24 runtime. `bun check` and `bun format:check` pass; the generic unit suite has 278 passing tests and 65 skips; the stipend suite has 36 passing tests and no skips. The initial transaction/navigation run passed 36 checks, the final strict UI/route run passed 36, the root accessibility command passed 50, and the public-read simulation passed 2. Both production builds pass. Logs and screenshots are in [evidence/](evidence/). Temporary public simulation servers have been stopped.

## Results

| Result | Checked item | Evidence |
| --- | --- | --- |
| PASS | Generic home displays Cookie Jar and browse/create actions without a featured stipend; creation has no stipend preset | `generic-home-red.log`, `generic-unit.log`, `e2e.log`, generic screenshots |
| PASS | Stipend has its own Vite entry, router, environment, branding, wallet config, assets and repository-owned Vercel configuration | `vite-build.log`, deployment config regression, `docs/STIPEND-APP.md` |
| PASS | Deployment runbook names the Vite app in the existing `cookie-jar` Vercel project, direct factory creation, build-time variables and the production domain | `docs/DEPLOYMENT.md` and `docs/STIPEND-APP.md` source review |
| PASS | Shared transaction logic has no Next dependency; only generated ABI/registry data is imported from the canonical client paths | Boundary tests and independent production builds |
| PASS | Jar-details surface uses a solid semantic background and readable text in both themes | Route screenshots, axe assertions and `stipend-ui.spec.ts` |
| PASS | Preset encodes 800 USDC as 800000000, 1 USDC as 1000000, 28 days as 2419200; explicit zero fee and Team hat match the runbook. Owner entry is required before creation. | `stipend-unit.log`; owner-entry regression; preset/review screenshots |
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
| PASS | Each React workspace declares its own React types for isolated installs | `workspace-types-red.log`, `workspace-types-unit.log`, `workspace-types-check.log`; 36 stipend tests pass on the current branch |
| PASS | Specification and standards reviews | Both review axes approved after the three recorded findings were fixed |
| BLOCKED | User's existing passkey session / real-wallet test | The already-open Brave Green Goods tab is controlled by another Codex task. Rabby was not used after the user clarified their preference. Anvil injected-provider tests do not satisfy this gate. Owner: Afo / frontend QA |
| BLOCKED | Existing Vercel project build and route verification | **Major.** Push PR #45 commit `3d3b74d` and inspect its Vercel preview: installation exits 1 with `ENOENT`. The Vercel GitHub status metadata reports `rootDirectory: "client"`, so the project is still isolated from the root `bun.lock`, `shared/` workspace and root `vercel.json`. Clear Root Directory once, redeploy, then check routes and headers. Owner: Afo / Vercel project admin |
| BLOCKED | Mainnet jar owner | The preset no longer preselects the Working Capital Safe. Confirm the Green Goods Safe address on Arbitrum One and enter it explicitly before human-signed creation. Owner: Afo / Safe owners |
| BLOCKED | Final QA on `dev`, current-head CI and Vercel preview verification | Required after PR #41 and the accepted migration/fixes merge. The current-head accessibility rerun is pending. Owner: release maintainer |
| BLOCKED | Release PR #40 and production deployment | Remain open/held until the final report passes and Afo approves |

## CI follow-up

[PR #45](https://github.com/greenpill-dev-guild/cookie-jar/pull/45) is a draft into `dev`. On commit `a16fe98`, CodeQL analysis, client unit tests, Anvil integration tests, dependency audit, contract size checks and quality checks passed. The shared workspace now declares the existing React types required by an isolated install. The accessibility job failed four desktop/mobile retries in two generic keyboard specs: Next.js development tools add a focused shadow-root button, so the global `:focus` locator resolves to two elements and Playwright rejects `isVisible()` in strict mode ([accessibility run](https://github.com/greenpill-dev-guild/cookie-jar/actions/runs/34014722169)). Both specs now locate focus inside the app's header, main or footer. The failing CI run is the regression evidence; current-head CI must confirm the fix. The E2E workflow on `a16fe98` was cancelled and also needs a completed current-head run.

The local `bun check` and `bun format:check` passed after the keyboard-spec fix. A fresh generic production build could not finish in this environment because the sandbox blocked Next.js from fetching the configured Inter font from `fonts.googleapis.com`; the pre-fix migration build passed and no application build files changed in this follow-up. The browser runner also could not launch local Chromium because macOS denied its bootstrap service. Neither local attempt is counted as passing proof.

The existing Vercel project's previous automatic preview failed during installation with `Workspace dependency "@cookie-jar/core" not found`. Reproduce with the prior client-only project source/install settings. A successful new build is still needed to close this **major deployment blocker**. No Vercel project settings or production deployments were changed by this task.

## 2026-09-30 follow-up

The user chose one production deployment at `cookies.greengoods.app`, using the existing `cookie-jar` Vercel project, and indicated that the jar should probably be owned by the Green Goods Safe. The production owner address remains unconfirmed, so the stipend preset now requires an explicit owner entry and does not fill it from the connected wallet. The existing factory and jar parameters are unchanged. No mainnet jar was created or funded.

The owner-entry regression failed first, then passed. `bun check`, `bun format:check`, `bun run test:stipend` (35 passing), `bun run test:client` (278 passing, 65 skipped), and `bun run build:stipend` passed locally on Node 24. The root test wrappers were adjusted to invoke Vitest under Node instead of Bun's temporary `node` shim; this affects test execution only. Vercel preview, current-head CI, the real-wallet pass and final QA on merged `dev` remain pending. Production release PR #40 remains held.

Slither's separate advisory job failed because its compiler could not resolve `../lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol`, then had no `results.sarif` to upload ([job log](https://github.com/greenpill-dev-guild/cookie-jar/actions/runs/34014473625/job/101435769320)). This is an out-of-scope contract-analysis/CI note, owned by the CI maintainer, not a CodeQL analysis failure. No workflow or contract changes were made.

The root `vercel.json` now owns the Vite framework, frozen Bun install, `bun run build:stipend`, `stipend/dist` output, headers and routes; the duplicate `stipend/vercel.json` was removed. A configuration regression, frozen offline install, 36 stipend tests, `bun check`, `bun format:check` and the local stipend build pass. The new preview still fails during installation. Decoding the Vercel bot's status metadata on PR #45 confirms the project Root Directory is **`client`**. This project-level setting cannot be specified in `vercel.json`; the Vercel admin must clear it once so future deploy commands remain in Git. Re-run a preview after that change before closing the blocker. The Vercel connector did not expose the build log's first error line, so the `ENOENT` summary alone does not prove the exact missing path.

## Remaining observations and limitations

- **Minor, external seeded metadata, owner: fixture/data maintainer.** Open `/jars` on local Anvil. Two seeded image URLs (`cookie-monster.jpg` and `airdrop.jpg`) fail at raw.githubusercontent.com. Their failed requests are recorded per page; the app-owned fallback renders. The seed/deployment scripts are outside this task, so no seed changes were made.
- **Minor, static hosting semantics, owner: frontend maintainer.** Request an unknown app route directly. The Vite SPA renders the not-found UI but the fallback HTTP response is 200. This is documented in the Vercel settings; a true HTTP 404 needs a hosting route decision. Do not report server 404 status as tested/passing.
- **Performance note, owner: frontend maintainer.** The Vite production build warns about a large initial wallet/UI chunk (about 348 kB gzip). No dependency upgrades or visual redesign were introduced to address it.
- The existing generic unit suite has 65 skipped tests. The 278 active tests pass; skips are not counted as proof. The stipend suite has no skipped tests.
- The public sample jar was read from the approved factory, not created by this task and not selected for deployment. Its history scan was bounded to the observed latest block for this read-only comparison. Production should use the actual selected jar's creation block. No public writes occurred.
- Temporary Arbitrum simulation settings were process-only; no env files or wallet credentials were read or changed.

The complete Vercel settings are in [STIPEND-APP.md](../../STIPEND-APP.md). Keep the existing `cookie-jar` project, clear Root Directory to use the repository root, set Node 24 and production domain `cookies.greengoods.app` on `main`. There is no beta domain. The root `vercel.json` owns build commands and output.
