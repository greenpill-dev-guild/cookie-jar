# Green Goods Stipend Jar QA

**Release decision: BLOCKED. Do not merge release PR #40 on this evidence.**

This is a provisional QA report dated September 5, 2026. PR #41 is still open, so the requested final baseline, `dev` after #41 merges, does not exist yet. The tested checkout is `fix/featured-jar-live-chain-fallback`, commit `f7e23db94c506990b4522938ddadcdd2e27868be`. No wallet-capable browser is connected to this session. No real-wallet claim, deposit, admin action, or wrong-network write check was completed.

No application fixes, commits, pushes, PRs, or merges were made. Every verified product defect below remains open with reproduction steps, severity, and a responsible role. These are ownership roles for follow-up, not claims that a particular person accepted an assignment.

## Baseline and evidence

- [PR #41](https://github.com/greenpill-dev-guild/cookie-jar/pull/41): open, targeting `dev`. [Recorded state](evidence/pr41.json).
- [Release PR #40](https://github.com/greenpill-dev-guild/cookie-jar/pull/40): open, `dev` into `main`. [Recorded state](evidence/pr40.json).
- `bun dev` reached **Development environment is ready**. [Startup output](evidence/dev-startup.log).
- Anvil returned chain ID **31337**, five jars, and the expected fifth jar, **`0x5ef012c81ABC229Df10037b9001937E55671E36E`**. It holds 3 ETH; the cap is 0.5 ETH; the interval is 2,419,200 seconds; strict purpose is enabled; the ERC1155 gate requires badge #1 and a balance of 1. Account #1 holds one badge; account #3 holds none. [Local contract reads](evidence/local-seed.json).
- Screenshots and DOM checks cover 1440 × 900 and 375 × 900 viewports in light and dark themes. The initial browser pass used the in-app browser. Repeatable unauthenticated evidence used installed Playwright Chromium, without a wallet. It is not authenticated Brave or wallet evidence.
- [Page matrix and per-page console/network summary](PAGE-MATRIX.md), [raw page observations](evidence/pages.json), [Deposit and wallet observations](evidence/actions.json), [keyboard observations](evidence/keyboard.json).
- [Item-by-item checklist](CHECKLIST.md) records PASS or FAIL for each requested check, including explicit blocked/unrun entries.

The no-featured production configuration passed after client hydration at both widths in both themes: `NEXT_PUBLIC_DEFAULT_CHAIN_ID=42161` with no featured address displayed **No featured jar configured** and **Browse all jars**, linking to `/jars`. All non-local requests were blocked in the capture browser and none were attempted. [Observations](evidence/no-featured.json), [mobile screenshot](evidence/no-featured-375-light.png). This used temporary process variables on the client server at port 3000, not a package `.env.local` file. The simulation process was stopped and the normal Anvil client restored; no env file was opened for inspection or edited. Next retained its normal root env loading. [Restored local view](evidence/restored-local.json). This proves configuration selection, not a production build or a public RPC read.

The existing server stopped after the first featured-jar test run. Both ports were confirmed free before starting the owned QA stack with `bun dev`. The failed connection attempts are retained as `pages-server-unavailable.json` and `operations-server-unavailable.*`; they are environment evidence, not product defects. The first capture also incorrectly expected the home-only status card on the generic jar route. The corrected jar captures and observations in `actions.json` supersede that assertion timeout.

## Open product defects

### D1. Invalid Deposit text causes an unhandled error

**Major. Owner: Cookie Jar client hooks maintainer.** Open `/`, select **Deposit**, enter `abc` in **Amount to deposit**, and press **Deposit**. The button stays enabled and the browser reports `Value \`abc\` is not a valid decimal number.` No useful validation message appears in the form. Reproduced at both widths in both themes while disconnected, without any transaction. Expected: reject non-decimal input and explain the error before submission.

Evidence: [action observations](evidence/actions.json), [mobile reproduction](evidence/deposit-invalid-375-light.png). Relevant code: `JarDepositSection.tsx` enables the button for `NaN`; `useJarTransactions.ts` calls `parseUnits` before its `try` block. A fix needs a regression test that enters invalid text and verifies a disabled submit or visible error with no write attempt.

### D2. The jar details gradient makes dark-theme text difficult to read

**Major. Owner: Cookie Jar client UI maintainer.** Open `/` or the fifth jar route in dark mode. The Available Balance panel fades to white while status and contract text remain pale. The right side is particularly hard to read at 375 px. Expected: readable text over a theme-compatible surface.

Evidence: [desktop dark](evidence/home-1440-dark.png), [mobile dark](evidence/home-375-dark.png). `client/components/jar/JarDetailsCard.tsx` uses `from-muted to-white`. This is a contrast repair, not a redesign. The automated contrast scan does not fully establish contrast over this gradient, so the screenshot evidence matters.

### D3. Icon controls have no accessible names

**Major. Owner: Cookie Jar client UI maintainer.** Use keyboard navigation or an accessibility inspector on `/` and the jar route. The contract-copy button and the external playbook icon next to the jar title have no accessible name. The create form also has an unnamed owner-address helper control. Expected: each action has a name that describes its purpose.

Evidence: `button-name` and `link-name` findings in [page observations](evidence/pages.json) and [jar observations](evidence/actions.json). Six of the seven accessibility-runner failures concern unnamed controls. Relevant components include `JarDetailsCard.tsx` and the create form's owner-address control. Add role/name regression assertions when fixing them.

### D4. Jar cards lack a keyboard navigation action

**Major. Owner: Cookie Jar client UI maintainer.** Open `/jars` and Tab through the page. Focus visits the header, search, filter, Refresh, and gate-information buttons, but skips the jar navigation cards. Clicking the fifth jar title with a pointer navigates successfully. The card itself is a `DIV` with `tabIndex=-1` and no link/button role. Expected: every jar can be reached through a named keyboard-operable navigation action.

Evidence: [recorded focus sequence and successful pointer navigation](evidence/keyboard.json). `client/components/jars/JarCard.tsx` attaches navigation to a `Card` `onClick`. Some cards contain separate gate-information buttons; those do not establish a named jar-navigation control. A regression test should open a jar using keyboard navigation.

### D5. Many controls miss the requested 44 px minimum

**Minor. Owner: Cookie Jar client UI maintainer.** At 375 px, measure the header Connect button, Claim/Deposit tabs, copy and external-link icons, and Deposit form. Connect is 40 px high, tabs are 32 px high, the jar icons are 20 × 20 px, and the Deposit input and button are 40 px high. Footer links are approximately 17 px high. Expected: at least 44 × 44 px interactive areas under this QA contract.

Evidence: control rectangles in [page observations](evidence/pages.json) and [Deposit observations](evidence/actions.json). The existing mobile accessibility test logs undersized buttons but still passes; it is not proof of this requirement.

### D6. The jar search input has no label

**Minor. Owner: Cookie Jar client UI maintainer.** Open `/jars` and inspect **Search jars...**. The input has no associated label, `aria-label`, or `aria-labelledby`; only its placeholder supplies context. Expected: an explicit, persistent label or accessible name.

Evidence: `dom.inputs` in [page observations](evidence/pages.json). Source: `client/components/jars/JarControls.tsx`. This fails the user's label requirement even where an automated rule accepts a placeholder.

### D7. Muted text misses minimum contrast in light mode

**Minor. Owner: Cookie Jar client UI maintainer.** Open the home page in light mode and run a complete contrast scan. The header subtitle, disconnected status badge, action description, and other muted text include measured ratios of **4.34:1**, below the **4.5:1** threshold for normal text. The desktop home scan reports 14 affected nodes; the mobile scan reports 13.

Evidence: exact colors, ratios, selectors, and failure descriptions in [page observations](evidence/pages.json). Related contrast findings occur on other routes. Resolve all recorded contrast findings and rerun both themes; checking only primary buttons will miss this defect.

### D8. Heading structure is inconsistent

**Minor. Owner: Cookie Jar client UI maintainer.** Inspect the heading outline on the home page, `/jars`, `/create`, invalid-address page, and mobile profile. The home jumps from its jar `h1` to Claim `h3`; `/jars` and the invalid-address page lack an `h1`; other routes have skipped levels. Expected: a coherent page heading and sequential section headings.

Evidence: `heading-order`, `page-has-heading-one`, and recorded headings in [page observations](evidence/pages.json). These are document-structure findings, not requests for visual redesign.

### D9. Dark-theme reloads emit a hydration error

**Minor. Owner: Cookie Jar wallet-provider UI maintainer.** Persist dark theme and reload a route. The console reports that server-rendered attributes differ from the client, pointing to RainbowKit's generated theme style. This reproduces across the dark-mode page matrix. Expected: matching theme initialization without a hydration error.

Evidence: complete sanitized console messages in [page observations](evidence/pages.json). Relevant source: `client/components/wallet/RainbowKitProviderWrapper.tsx`. A production build and system-theme transition still need verification; this report does not claim a production failure from the development warning alone.

## Release blockers and unverified work

| Item | Severity | Owner | Reproduction or missing evidence |
| --- | --- | --- | --- |
| Required `dev` baseline is unavailable | Blocker | Release maintainer | Read PR #41: it is open and has no merge commit. Merge through the normal review process, then rerun final QA on the resulting `dev` SHA. |
| Real-wallet pass cannot run | Blocker | QA operator with a wallet-enabled browser | Only the in-app browser is connected. Connect opens a dialog with no wallet provider choices in this environment. This is not evidence that an installed wallet fails. [Mobile dialog](evidence/wallet-375-light.png). |
| Production jar reads are unverified | Blocker for production simulation sign-off | Release QA owner | Step 7 asks for public Arbitrum RPC calls, while the boundaries forbid touching a live network. Clarification was requested and no exception was received. No public RPC was called. |
| Generic Next error boundary is unverified | Major evidence gap | Client QA owner | Invalid-address and 404 states were rendered. A controlled render failure and recovery through `app/error.tsx` were not exercised. Source inspection alone does not pass this check. |

The wallet blocker covers account #1 connection and eligibility, first-claim availability, a 0.1 ETH claim with a Linear note, updated balance and countdown, a refused second claim, a 1 ETH deposit, account #3's disabled Claim state, account #0's Admin tab, maximum and interval updates, pause/unpause, emergency withdrawal, and wrong-network banner/write disabling. Local badge reads prove the seed prerequisites only. No test transaction was signed or sent by this QA session after the authorized seed deployment.

## Automated checks

The shell's default Node is 18.18.2, which the installed Playwright rejects. Browser tests used the already-bundled Node 24.19.0 by prepending its directory to `PATH`; no dependencies were installed or upgraded. `--no-install` kept `bunx` on installed packages. Reporter and output flags only preserve evidence.

| Command | Result | Output |
| --- | --- | --- |
| `bun check` | PASS: no lint warnings/errors; Next rules and TypeScript passed | [check.log](evidence/check.log) |
| `cd client && bun run test` | PASS: 24 files passed, 5 skipped; 256 tests passed, 65 skipped, 2 todo | [unit.log](evidence/unit.log) |
| `bunx --no-install playwright test e2e/featured-jar.spec.ts` | PASS: 6/6 across Desktop Chrome and Mobile Chrome | [featured.log](evidence/featured.log) |
| `bunx --no-install playwright test e2e/jar-operations.spec.ts e2e/admin-functions.spec.ts` | FAIL: 18/18 before wallet connection or business-flow assertions | [operations.log](evidence/operations.log), [structured results](evidence/operations.json) |
| `bun run test:accessibility` with evidence output flags | FAIL before tests: TypeScript parsing error at `playwright.config.ts:14` under the wrapper runtime | [accessibility.log](evidence/accessibility.log) |
| Installed runner equivalent: `bunx --no-install playwright test --grep accessibility` | FAIL: 21 passed, 7 failed. Six failures concern unnamed controls; one desktop `/create` navigation timed out | [accessibility-node.log](evidence/accessibility-node.log), [structured results](evidence/accessibility-node.json) |

The operations/admin suite's shared selector combines CSS and `text=` syntax and raises `Unexpected token "="`. Beyond that immediate failure, its wallet fixture only writes `window.__TEST_WALLET_STATE__` and dispatches invented events; no matching client consumer was found. `signTransaction()` generates a random hash rather than signing. Those tests cannot substitute for the requested wallet pass. This is a test-harness note, not an authorized scripts/CI task.

The accessibility suite also relaxes contrast, label, and touch-target checks. Its 21 passing tests do not override the direct measurements above. The `/create` navigation timeout is a test-run failure, not proof of a label defect: the independent page matrix reached the form and verified its five visible text-input labels.

## Scope notes

- The seeded NFT jars contain Cookie Monster names and two failing remote image URLs. Those names/URLs come from `DeployLocal.s.sol`, outside the allowed fix surface. The list renders image fallbacks. Record them as seed-content notes, not contract-change tasks.
- Local native-ETH history explicitly says it is only reconstructed for token jars. The history card renders, but no ETH claim rows or production USDC rows were verified.
- Desktop `/profile` redirects disconnected users home; mobile retains a connect prompt. Both were recorded. This difference is not classified as a defect without a route-behavior requirement.
- `bun dev` printed a redundant `cd: client: No such file or directory` warning and then started successfully. Deployment scripts were not edited.
- The pre-existing untracked ERC777 shim content in `lib/openzeppelin-contracts` was preserved. Final tracked application state remained unchanged; only this report/evidence directory was added.
- Modern Web Guidance 0.0.169 accessibility guidance was retrieved from the existing Green Goods installation because Cookie Jar has no local guidance command. No package refresh was performed.

All open defects require regression tests with their fixes and PRs into `dev`. This report is not approval to merge #40. Final sign-off requires the requested baseline, wallet and remaining error/production evidence, and either merged fixes or an explicit owner decision on each recorded defect.
