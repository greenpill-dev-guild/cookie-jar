# QA checklist

[Report](REPORT.md). PASS refers to the stated automated or provisional integration evidence. FAIL marked blocked/unrun is an evidence gap, not proof that the feature is broken. Real-wallet rows remain separate.

| Checked item | Result | Evidence or owner |
| --- | --- | --- |
| dev after PR #41 and accepted fixes merge | FAIL: blocked | Release maintainer; PR #41 and fixes remain open |
| bun dev reaches Development environment is ready | PASS | evidence/dev-startup.log |
| Anvil chain 31337, five seeds and account badge prerequisites | PASS | evidence/local-seed.json |
| Featured jar 5, Variable, 0.5 ETH, 28 days, strict note | PASS | Featured suite and local seed reads |
| Home status, jar details, Claim and Deposit tabs, history and footer | PASS | Page matrix and featured suite |
| /jars, jar 5 address, /create and /profile | PASS | Page matrix |
| Bad jar address, invalid chainId and unknown route | PASS | Page matrix |
| Footer public link targets | PASS | evidence/footer-links.json; baseline HTTP checks retained |
| Keyboard jar navigation and independent gate information | PASS | UI regression suite |
| Invalid Deposit text, negatives and excess decimal precision | PASS | Creation/transaction unit tests; no write attempts |
| Solid jar details surface and both themes | PASS | Page screenshots and strict contrast scan |
| Accessible icon names and explicit input labels | PASS | UI regression assertions; claim-type follow-up |
| 44 px sampled action and input targets, including checkboxes | PASS | UI browser measurements |
| Visible keyboard focus on sampled controls | PASS | UI keyboard assertions and screenshots |
| 375 px layout without horizontal document scroll | PASS | Route matrix width assertions |
| Heading order on original failing routes | PASS | UI accessibility suite |
| Wallet theme hydration, persisted themes and system resolution | PASS | WalletTheme unit test and route console checks |
| Console errors and uncaught exceptions checked on each route | PASS | Page matrix; strict unexpected-error assertions |
| Failed requests and HTTP errors checked on each route | PASS | Page observations; expected 404 and seed image failures retained |
| All seeded remote images load | FAIL: scope note | Two broken seed URLs; seed maintainer; scripts unchanged |
| CSP report-only header | PASS | Header/metadata suite |
| X-Content-Type-Options, Referrer-Policy and Permissions-Policy | PASS | Header/metadata suite |
| og:title, og:image and twitter:card | PASS | Header/metadata suite |
| /opengraph-image, /icon and /apple-icon return images | PASS | Header/metadata suite |
| Controlled jar render failure and browser recovery | PASS | Error boundary browser test and screenshots |
| app/error.tsx message and reset callback | PASS | ErrorRecovery component test |
| Next route-level error boundary invoked by a route failure | FAIL: unrun | Minor evidence gap; client QA owner |
| Explicit editable Green Goods stipend preset | PASS | Preset unit and browser tests |
| Arbitrum 42161 and documented direct factory | PASS | Creation args/network tests and public factory read |
| Documented Working Capital Safe owner retained | PASS | Owner-preservation unit and connection browser tests |
| Native USDC and verified six decimals | PASS | Token metadata and public read evidence |
| Variable maximum 800 USDC encoded as 800000000 | PASS | Independent creation-args assertion |
| 28 whole days encoded as 2419200 seconds | PASS | Args assertion and created local contract state |
| Hats contract, Team hat ID and minimum balance 1 | PASS | Preset and creation-args tests |
| Explicit 0% fee and 1 USDC minimum encoded as 1000000 | PASS | Creation-args tests; local custom fee/minimum reads |
| Strict note and emergency withdrawal enabled | PASS | Preset tests |
| One-time claims, streaming and auto-swap disabled in preset | PASS | Preset tests |
| Custom minimum deposit defaults to zero | PASS | Defaults and creation flow tests |
| Effective deposit fee visible in final review | PASS | Browser review shows 0% preset / 1% factory default |
| Deliberate owner edits survive wallet changes | PASS | Hook regression test and browser review |
| Modified preset marked customized without date-based amount changes | PASS | Preset browser and unit tests |
| Six- and eighteen-decimal amount precision | PASS | Strict parser and args tests |
| Metadata unavailable blocks creation with no fallback to 18 decimals | PASS | Hook and parser tests |
| Factory, reads, simulation, writes and receipt pinned to selected chain | PASS | Hook assertions and chain-aware local creation URL |
| Connection returns to review without automatic submit on matching chain | PASS | Same-network browser test; explicit Create then yields one receipt |
| Wallet rejection, revert and pending receipt failure visible | PASS | Transaction lifecycle tests |
| Duplicate submission prevented and submitted configuration retained | PASS | Creation hook tests and receipt failure tests |
| Created address decoded from factory event, list refreshed and jar opened | PASS | Hook assertions and local browser creation |
| Optional chainId validated; bare jar links use configured default | PASS | jarLocation tests and invalid-chain route |
| Created jar reads stay on its chain after wallet network change | PASS | Creation browser test |
| Custom streaming choice agrees with submitted configuration | FAIL | Major: enabled setting is not encoded; client creation maintainer; see report |
| EIP-1193 test wallet restricted to local Anvil | PASS | Fixture guards, fixed localhost RPC and review |
| Receipts and contract state replace invented wallet events/random hashes | PASS | Operations, Admin and creation artifacts |
| Snapshot cleanup restores test state even if receipt evidence fails | PASS | Nested finally, asserted evm_revert; reviewed fixture |
| Automated eligible account #1 claim with Linear-linked note | PASS | Operations suite; real local receipt |
| Automated 0.1 ETH claim updates 3 ETH to 2.9 ETH | PASS | Operations balance and state assertions |
| Automated cooldown updates and disables a second claim | PASS | Operations cooldown assertion |
| Automated interval refuses a bypassed second onchain claim | PASS | Operations local revert assertion |
| Automated 1 ETH Deposit updates jar balance to 3.9 ETH | PASS | Operations receipt and contract balance |
| Automated account #3 ineligible with Claim disabled | PASS | Operations suite |
| Automated owner Admin tab and maximum update to 0.6 ETH | PASS | Admin receipt/state assertions |
| Automated interval update to 14 days / 1209600 seconds | PASS | Admin receipt/state assertions |
| Automated pause, unpause and 0.1 ETH emergency withdrawal | PASS | Admin receipts and contract state |
| Automated wrong-network banner and disabled writes | PASS | Operations mismatch and no additional hashes |
| Real wallet installed, account #1 imported and Anvil configured | FAIL: blocked | Wallet QA operator; no wallet-capable browser connected |
| Real-wallet eligible state and pre-claim next-claim display | FAIL: blocked | Wallet QA operator |
| Real-wallet claim 0.1 ETH and updated balance/countdown | FAIL: blocked | Wallet QA operator |
| Real-wallet second claim refused by interval | FAIL: blocked | Wallet QA operator |
| Real-wallet deposit 1 ETH | FAIL: blocked | Wallet QA operator |
| Real-wallet switch to ineligible account #3 | FAIL: blocked | Wallet QA operator |
| Real-wallet owner maximum and interval updates | FAIL: blocked | Wallet QA operator |
| Real-wallet pause/unpause and emergency withdrawal | FAIL: blocked | Wallet QA operator |
| Real-wallet wrong-network check | FAIL: blocked | Wallet QA operator |
| Connected profile with real wallet | FAIL: blocked | Wallet QA operator |
| bun check and formatting | PASS | Final command logs |
| Full combined client bun run test | PASS | 295 passed, 65 skipped; final unit log |
| Combined client production build under supported Node | PASS | Production build log |
| Featured, creation, operations and admin browser suites | PASS | 18-test full pass; logs explain the superseded navigation timeout |
| bun run test:accessibility under installed supported Node | PASS | Accessibility wrapper log |
| No featured address with default chain 42161 | PASS | Production build simulation; four theme/width captures |
| No-featured page links to /jars | PASS | Production simulation link assertion |
| Public Arbitrum factory getAllJars and bytecode | PASS | evidence/final/public-read.json |
| Public USDC decimals and example jar rules | PASS | evidence/final/public-read.json |
| Public configured jar rendered without a wallet | PASS | Public simulation observations and four screenshots |
| Temporary simulation configuration removed and local server restored | PASS | Final local route evidence at chain 31337, featured index 4; no env files edited |
| Contracts, scripts, CI, dependency versions and keystores untouched | PASS | Changed-path audit; only client, E2E and QA documentation |
| Every unresolved defect has reproduction, severity and owner | PASS | Report disposition tables |
| All accepted fixes merged into dev | FAIL: blocked | Review/release maintainer |
| Final QA on dev and release PR #40 acceptance | FAIL: blocked | Release maintainer; keep #40 open |
