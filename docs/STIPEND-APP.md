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
| Root Directory | Repository root (clear the existing `stipend` or `client` value once) |
| Framework, install, build and output | Defined in the root `vercel.json` |
| Node.js version | 24.x |
| Production Branch | `main` |
| Production domain | `cookies.greengoods.app` |

There is no beta environment or beta domain. Unassigned PR preview URLs can be used for build and route QA before a production release.

The checked-in root `vercel.json` installs from the workspace lockfile, runs `bun run build:stipend`, serves `stipend/dist`, and supplies the security headers, SPA rewrites and image aliases. Root Directory, production branch, domain, Node version and environment variables are Vercel project settings; set them once, then keep build commands in Git. `stipend/bunfig.toml` makes build tools use Node, as Vite requires. No contracts or deployment scripts run in a Vercel build. Unknown client routes render the app's not-found page; as a static SPA, the HTTP fallback response is 200.

Set these **public build-time** environment variables for Production in the `cookie-jar` project. Vite does not use `NEXT_PUBLIC_*` values. Save changes and rebuild the deployment.

| Variable | Production |
| --- | --- |
| `VITE_DEFAULT_CHAIN_ID` | `42161` |
| `VITE_FEATURED_JAR_ADDRESS` | The created stipend **jar** address; leave unset until creation |
| `VITE_FEATURED_JAR_BLOCK` | Optional jar creation block, to limit history reads |
| `VITE_SITE_URL` | `https://cookies.greengoods.app` |
| `VITE_WALLET_CONNECT_PROJECT_ID` | Your public WalletConnect project ID |
| `VITE_ALCHEMY_API_KEY` | Optional public Arbitrum RPC key restricted to the production origin |

Do not put a private key, mnemonic or server credential into a `VITE_*` variable. The factory address is already in the generated registry: `0x294d222eDE6DF6625B43544F1C634322467528Da`. **Do not use the factory address as `VITE_FEATURED_JAR_ADDRESS`.** If no jar address is set on Arbitrum, the app displays “No featured jar configured” and links to `/jars`.

The Green Goods preset creates a jar directly with that factory. It does not call the Green Goods protocol. The owner must be entered explicitly after the Green Goods Safe address is confirmed. USDC, the Team hat, 800 USDC maximum, 28 days, explicit 0% deposit fee and 1 USDC minimum are documented in [the deployment runbook](DEPLOYMENT.md). These settings remain editable and are reviewed before a wallet signature. The launch amount does not change with the date.

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

Use the installed supported Node runtime on `PATH`. The root Playwright configuration routes stipend specs to Vite and starts that local server when needed, so the existing workflows continue to check both apps without workflow edits. Set `COOKIE_JAR_QA_URL` when the generic app runs somewhere other than localhost:3000. The stipend browser suite uses the existing local-only EIP-1193 fixture, checks actual transaction receipts and restores Anvil snapshots. `STIPEND_QA_URL` can select another local instance. It does not replace the required real-wallet QA pass.

Do not merge the release PR until the migration and accepted fixes are on `dev`, the final report is passing, and the release is approved.
