# Browser verification

`bun run test:e2e` runs the generic Next client on port 3000 and the standalone stipend Vite client on port 3041 against a seeded local Anvil chain (31337). Start `bun dev` first. Playwright starts Vite automatically. CI deploys the local seed, synchronizes the registry and runs desktop and 375 px mobile Chromium projects sequentially.

`./scripts/test-e2e.sh --skip-setup --ci` propagates Playwright's exit status, refuses an unavailable client or a non-Anvil RPC, and retains the configured HTML, JSON, screenshots, traces and per-page observations. The runner's hermetic regression check is `python3 scripts/tests/test_e2e_runner.py`.

The generic specs cover current landing navigation, seeded jar browsing and search, gated/disconnected actions, creation validation, invalid addresses/networks, mobile layout, accessibility and navigation timings. Historical selectors, external browser-demo tests, hypothetical V1 addresses, arbitrary development-server performance budgets and invented transaction workflows were replaced. V1 detection remains covered by the client unit suite. Unsupported streaming creation is asserted absent in the stipend creation suite.

The stipend specs cover the featured jar, preset and custom factory creation, explicit owner preservation, connection without auto-submission, eligible/ineligible claims, interval refusal, deposits, network switching and owner administration. The injected EIP-1193 fixture forwards transactions exclusively to local Anvil, verifies chain 31337, records actual receipts and reverts a snapshot after each wallet test. No fabricated transaction hashes or application-specific wallet events establish success.

`bun run test:accessibility` runs the accessibility checks. `bun run test:e2e:stipend` selects only the stipend suite and requires an already-running Vite server. Evidence is clean-room CI Playwright, not authenticated real-wallet QA. The user approved performing the real-wallet QA after the production site deploys on 2026-09-30.
