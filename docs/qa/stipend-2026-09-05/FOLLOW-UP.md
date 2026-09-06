# Release follow-up, September 5, 2026

Release remains blocked. The fixes below are in the existing draft PRs; PRs #40 and #41 remain open. This evidence uses the isolated integration worktree at `2812150`, not merged `dev`.

## Defects repaired

| Check | Result | Evidence |
| --- | --- | --- |
| Unsupported streaming controls | PASS in #43 at `e3820b4`; removed controls and accurate "Not configured during creation" review. The factory does not encode an enable/disable flag. | [Failing test](evidence/follow-up/streaming-red.log), [wording regression](evidence/follow-up/streaming-review-red.log), [client suite](evidence/follow-up/streaming-unit.log) |
| Creation review contrast | PASS in #43; solid semantic advanced-settings surface and readable badge/explanation in both themes. | [Failing contrast proof](evidence/follow-up/streaming-contrast-red.log), [failing permanent browser regression](evidence/follow-up/streaming-e2e-red.log), [8 passing creation tests](evidence/follow-up/streaming-e2e.log) |
| CodeQL alert 208 | PASS in #44 at `2ba1ba8`, confirmed by GitHub CodeQL. Parsed Alchemy hosts require exact equality or a dot-delimited subdomain; lookalike hosts remain distinct. | [Failing helper tests](evidence/follow-up/codeql-red.log), [passing helper tests](evidence/follow-up/codeql-green.log) |
| CodeQL alert 209 | PASS in #44 at `2ba1ba8`, confirmed by GitHub CodeQL. Capture output uses `mkdtempSync`, a unique directory with 0700 permissions. Tests verify isolation and independent output files. | [Helper tests](evidence/follow-up/codeql-green.log) |
| Creation branch checks | PASS: lint/types, formatting, 289 client tests passed and 65 skipped. | [Check](evidence/follow-up/streaming-check.log), [format](evidence/follow-up/streaming-format.log), [unit](evidence/follow-up/streaming-unit.log) |
| E2E branch checks | PASS: lint/types, formatting, 251 base-client tests passed and 65 skipped. | [Check](evidence/follow-up/codeql-check.log), [format](evidence/follow-up/codeql-format.log), [unit](evidence/follow-up/codeql-unit.log) |

The browser run passed all eight creation tests, including local receipts, preserved owner edits, explicit submission after connection, and the new review accessibility checks. Both themes passed WCAG A/AA and no-horizontal-overflow assertions. The two review axes found no remaining issue in these changes.

Screenshots: [desktop light](evidence/follow-up/creation-desktop-light.png), [desktop dark](evidence/follow-up/creation-desktop-dark.png), [mobile light](evidence/follow-up/creation-mobile-light.png), [mobile dark](evidence/follow-up/creation-mobile-dark.png).

## CI disposition

The failed CodeQL result on #44 at `8c3fae4` reported two new high-severity alerts in QA capture helpers, not deployed application code. Both are repaired with failing-before regression evidence. GitHub CodeQL analysis passed on `2ba1ba8`; both alert instances are now fixed and the PR has [zero open alerts](evidence/follow-up/codeql-open-alerts.json). The separate [summary check remains neutral](evidence/follow-up/codeql-summary.json) due to the historical configuration warning below. [Passing scan](https://github.com/greenpill-dev-guild/cookie-jar/actions/runs/34008473856/job/101419912767).

The same check reported missing `/language:javascript` and `/language:typescript` configurations from `dev`. Read-only analysis history shows the last baseline scans used these categories on July 26 at `bead02e49`. The current workflow uses `/language:javascript-typescript`. Preserve historical analyses; the release maintainer must establish the current combined scan on accepted `dev`. No CI configuration or historical scan was changed.

The earlier #44 WCAG run had six failures involving unnamed controls, which depend on unmerged #42. The earlier full Playwright job reached its 90-minute timeout while running tests. These remain release blockers until current-head CI on the accepted combined application passes. Slither's advisory failure remains assigned to the CI/contract maintainer; contracts and CI are outside these fixes.

## Vercel setup

Use the existing `cookie-jar` project in team `greenpilldevguild` (`prj_DLEynennUM9sA1XiA9thBRXSdNd2`). Read-only Vercel inspection confirms PR previews build successfully. The requested domains were absent from the project and returned no DNS address records at inspection.

| Domain | Intended assignment | Release condition |
| --- | --- | --- |
| `beta.cookies.greengoods.app` | Preview domain pinned to `dev` | Deploy the accepted merged fixes, then verify the hosted build |
| `cookies.greengoods.app` | Production domain, `main` | Passing final QA report and explicit release approval before merging #40 |

Dashboard configuration is blocked on Vercel sign-in in the opened browser tab. The available connector can inspect projects/deployments but has no domain-management method. No domain, DNS, environment or production deployment has been changed.

After sign-in, attach beta to the `dev` branch and production to the project's production environment. Apply the DNS records Vercel supplies; `greengoods.app` currently uses `ns43.domaincontrol.com` and `ns44.domaincontrol.com`. DNS-provider access may be needed if those records cannot be managed through Vercel. Do not assume a successful preview also verifies either custom domain.

Set the public site URL separately for each environment (`https://beta.cookies.greengoods.app` and `https://cookies.greengoods.app`). Use chain 42161. The launch jar address and creation block must be verified before setting the featured-jar variables; do not substitute a garden/campaign jar. Keep secrets in Vercel and follow the [deployment runbook](../../DEPLOYMENT.md) for provider settings. Confirm the wallet provider accepts both origins. No live jar was created or funded.

After deployment, verify HTTPS, custom-domain routing, metadata/canonical URLs, security headers, featured configuration and read-only Arbitrum behavior on beta. Production promotion remains gated by the report and user approval. The real-wallet Anvil pass still requires a wallet-enabled browser.

Local Modern Web Guidance cache retrieval was unavailable, so this follow-up used repository frontend rules and direct accessibility/browser evidence. No dependency was installed or upgraded.
