# Green Goods Stipend Jar app

The repository has two independently built and deployed web apps:

| App | Directory | Framework | Purpose |
| --- | --- | --- | --- |
| Cookie Jar | `client/` | Next.js | Generic jar browsing, creation and management |
| Green Goods Stipend Jar | `stipend/` | React + Vite | The Green Goods stipend, with an explicit editable stipend creation preset |

`shared/src/` owns contract reads, transaction lifecycle, amount conversion and jar configuration. Each app owns its UI, navigation, wallet configuration and branding. The shared core imports only the existing generated ABI and deployment registry from `client/`; the deployment generators and contract ABIs remain unchanged. Neither app imports the other app's components or routes.

## Vercel settings

Use the existing `cookie-jar` Vercel project for the stipend app. The generic Next.js app remains in `client/` in this repository, but `cookies.greengoods.app` serves `stipend/`.

| Setting | Existing `cookie-jar` project value |
| --- | --- |
| Root Directory | `stipend` |
| Include source files outside Root Directory | Enabled; required for the root lockfile, `shared/` and generated client contract data |
| Framework, install, build and output | Defined in `stipend/vercel.json` |
| Node.js version | 24.x |
| Production Branch | `main` |
| Production domain | `cookies.greengoods.app` |

There is no beta environment or beta domain. Unassigned PR preview URLs can be used for build and route QA before a production release.

The checked-in `stipend/vercel.json` installs the workspace with `bun install --cwd .. --frozen-lockfile --ignore-scripts`, builds the app with `bun run build`, serves `dist`, and supplies the security headers, SPA rewrites and image aliases. Root Directory, production branch, domain, Node version and environment variables are Vercel project settings; set them once, then keep build commands in Git. `stipend/bunfig.toml` makes build tools use Node, as Vite requires. No contracts or deployment scripts run in a Vercel build. Unknown client routes render the app's not-found page; as a static SPA, the HTTP fallback response is 200.

Set these **public build-time** environment variables for Production in the `cookie-jar` project. Vite does not use `NEXT_PUBLIC_*` values. Save changes and rebuild the deployment.

| Variable | Production |
| --- | --- |
| `VITE_DEFAULT_CHAIN_ID` | `42161` |
| `VITE_FEATURED_JAR_ADDRESS` | Optional override; defaults to `0xfCA00fC7E287419F200840364fd9b7DC84E83e01` |
| `VITE_FEATURED_JAR_BLOCK` | Optional jar creation block, to limit history reads |
| `VITE_SITE_URL` | `https://cookies.greengoods.app` |
| `VITE_WALLET_CONNECT_PROJECT_ID` | Your public WalletConnect project ID |
| `VITE_ALCHEMY_API_KEY` | Optional public Arbitrum RPC key restricted to the production origin |

Do not put a private key, mnemonic or server credential into a `VITE_*` variable. The factory address is already in the generated registry: `0x294d222eDE6DF6625B43544F1C634322467528Da`. **Do not use the factory address as `VITE_FEATURED_JAR_ADDRESS`.** Arbitrum defaults to the configured Green Goods stipend jar, `0xfCA00fC7E287419F200840364fd9b7DC84E83e01`. An explicit address overrides this default.

The Green Goods preset creates a jar directly with that factory. It does not call the Green Goods protocol. The owner defaults to the connected wallet, including when applying the preset. It remains editable; enter the intended Safe address when another account will administer the jar. USDC, the Team hat, 800 USDC maximum, 28 days, explicit 0% deposit fee and 1 USDC minimum are documented in [the deployment runbook](DEPLOYMENT.md). These settings remain editable and are reviewed before a wallet signature. The launch amount does not change with the date.

## Local development and validation

Use the repository's existing `bun dev` environment to start and seed Anvil if it is not already running. Do not restart it while another session is using it. In another terminal, from the repository root:

```sh
VITE_DEFAULT_CHAIN_ID=31337 VITE_SITE_URL=http://127.0.0.1:3041 bun run dev:stipend
```

The Vite app runs on `http://127.0.0.1:3041`. On Anvil, the home page selects seeded jar index 4 by default. `VITE_FEATURED_JAR_INDEX` optionally overrides that local index. Public deployments use the configured stipend address rather than selecting a factory jar by index. Configuration is supplied through the process environment; the Vite app does not read package-level env files.

```sh
bun check
bun run test:client
bun run test:stipend
bun run build:stipend
bun run --cwd client build:skip-lint
bun run test:e2e:stipend
```

Use the installed supported Node runtime on `PATH`. The root Playwright configuration routes stipend specs to Vite and starts that local server when needed, so the existing workflows continue to check both apps without workflow edits. Set `COOKIE_JAR_QA_URL` when the generic app runs somewhere other than localhost:3000. The stipend browser suite uses the existing local-only EIP-1193 fixture, checks actual transaction receipts and restores Anvil snapshots. `STIPEND_QA_URL` can select another local instance. It does not replace the required real-wallet QA pass.

Do not merge the release PR until the migration and accepted fixes are on `dev`, the final report is passing, and the release is approved.

## Creation and deposit controls

Arbitrum currency choices match Green Goods' promoted USDC, DAI and WETH addresses, with native ETH and a custom ERC-20 option. Token metadata is read on the selected chain. Hats validation uses that chain's RPC and the entered Hats contract, with full uint256 decimal or hexadecimal IDs; it does not require the optional subgraph.

Jar images can be PNG, JPEG or WebP files up to 10 MB. The app requests a short-lived signed upload URL from `https://agent.greengoods.app/api/uploads/sign`, then uploads directly to Pinata and saves the resulting IPFS gateway URL in jar metadata. Credentials stay on the server. Pending or failed uploads block advancing until the user retries or removes them. `VITE_UPLOAD_SIGN_URL` is an optional public endpoint override for a local upload signer. The Green Goods Agent upload route must include the Cookie Jar origin; its companion change allows exactly `https://cookies.greengoods.app` for that route, with localhost port 3041 in development. Deploy that Agent change before enabling production uploads.

ERC-20 deposits read `allowance(depositingAccount, jar)` on the jar chain before asking for approval. Sufficient allowance proceeds directly to deposit. After an approval receipt, allowance is checked again. For multisigs, a proposed approval remains pending until execution; **Check approval** checks the executed allowance and unlocks the deposit action. Failed reads never become zero allowance, and pending requests cannot submit duplicate approvals. Mainnet wallet and Safe execution require separate real-wallet verification; local mocks are not proof of those signatures.
