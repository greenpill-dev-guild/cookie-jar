# Green Goods Stipend Jar app

The repository has two independently built and deployed web apps:

| App | Directory | Framework | Purpose |
| --- | --- | --- | --- |
| Cookie Jar | `client/` | Next.js | Generic jar browsing, creation and management |
| Green Goods Stipend Jar | `stipend/` | React + Vite | The Green Goods stipend, with an explicit editable stipend creation preset |

`shared/src/` owns contract reads, transaction lifecycle, amount conversion and jar configuration. Each app owns its UI, navigation, wallet configuration and branding. The shared core imports only the existing generated ABI and deployment registry from `client/`; the deployment generators and contract ABIs remain unchanged. Neither app imports the other app's components or routes.

## Vercel settings

Create a **separate Vercel project** for the stipend app, importing this same GitHub repository. Keep the existing Cookie Jar project pointed at `client/`.

| Setting | Stipend project value |
| --- | --- |
| Root Directory | `stipend` |
| Include source files outside Root Directory | Enabled (required for `shared/` and generated contract data) |
| Framework Preset | Vite |
| Install Command | `cd .. && bun install --frozen-lockfile --ignore-scripts` |
| Build Command | `bun run build` |
| Output Directory | `dist` |
| Node.js version | 24.x |
| Production Branch | `main` |
| Production domain | `cookies.greengoods.app` |
| Preview domain assigned to Git branch `dev` | `beta.cookies.greengoods.app` |

The checked-in `stipend/vercel.json` supplies the build settings, security headers, SPA rewrites and image aliases. `stipend/bunfig.toml` makes build tools use Node, as Vite requires. No contracts or deployment scripts run in a Vercel build. Unknown client routes render the app's not-found page; as a static SPA, the HTTP fallback response is 200.

Set these **public build-time** environment variables in the stipend project. Vite does not use `NEXT_PUBLIC_*` values. Save changes and rebuild the deployment.

| Variable | Production | Preview for `dev` |
| --- | --- | --- |
| `VITE_DEFAULT_CHAIN_ID` | `42161` | `42161` |
| `VITE_FEATURED_JAR_ADDRESS` | The chosen stipend **jar** address | The chosen beta **jar** address |
| `VITE_FEATURED_JAR_BLOCK` | Optional creation block, to limit history reads | Optional beta jar creation block |
| `VITE_SITE_URL` | `https://cookies.greengoods.app` | `https://beta.cookies.greengoods.app` |
| `VITE_WALLET_CONNECT_PROJECT_ID` | Your public WalletConnect project ID | The same ID, with the beta origin allowed |
| `VITE_ALCHEMY_API_KEY` | Optional public Arbitrum RPC key restricted to these origins | Optional public RPC key |

Do not put a private key, mnemonic or server credential into a `VITE_*` variable. The factory address is already in the generated registry: `0x294d222eDE6DF6625B43544F1C634322467528Da`. **Do not use the factory address as `VITE_FEATURED_JAR_ADDRESS`.** If no jar address is set on Arbitrum, the app displays “No featured jar configured” and links to `/jars`.

The Green Goods preset creates a jar directly with that factory. It does not call the Green Goods protocol. The owner, USDC, Team hat, 800 USDC maximum, 28 days, explicit 0% deposit fee and 1 USDC minimum are documented in [the deployment runbook](DEPLOYMENT.md). They remain editable and are reviewed before a wallet signature. The launch amount does not change with the date.

## Local development and validation

Use the repository's existing `bun dev` environment to start and seed Anvil if it is not already running. Do not restart it while another session is using it. In another terminal, from the repository root:

```sh
VITE_DEFAULT_CHAIN_ID=31337 VITE_SITE_URL=http://127.0.0.1:3041 bun run dev:stipend
```

The Vite app runs on `http://127.0.0.1:3041`. On Anvil, the home page selects seeded jar index 4 by default. `VITE_FEATURED_JAR_INDEX` optionally overrides that local index. Public deployments never select a factory jar automatically. Configuration is supplied through the process environment; the Vite app does not read package-level env files.

```sh
bun check
bun run test:client
bun run test:stipend
bun run build:stipend
bun run --cwd client build:skip-lint
bun run test:e2e:stipend
```

Use the installed supported Node runtime on `PATH`. The stipend browser suite uses the existing local-only EIP-1193 fixture, checks actual transaction receipts and restores Anvil snapshots. `STIPEND_QA_URL` can select another local instance. It does not replace the required real-wallet QA pass.

Do not merge the release PR until the migration and accepted fixes are on `dev`, the final report is passing, and the release is approved.
