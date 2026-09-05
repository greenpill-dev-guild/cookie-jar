# 🍪 Cookie Jar

Funding pools with on-chain access control. A factory creates jars; allowlisted or token-gated
members (ERC721, ERC1155, POAP, Unlock, Hats Protocol) withdraw under fixed rules: fixed or
variable amounts, cooldown intervals, purpose strings and emergency controls.

The Greenpill Dev Guild runs one live jar for the Green Goods contributor stipend on Arbitrum One,
created on the Green Goods cookie jar factory, and serves it at https://cookies.greengoods.app.
The runbook for that jar is [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Prerequisites

- Node.js 20 (`.nvmrc`), bun 1.3.10 (`.bun-version`), Git
- Foundry v1.7 (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- The Solidity dependencies are git submodules: `git submodule update --init --recursive`

## Quick start

```bash
git clone https://github.com/greenpill-dev-guild/cookie-jar.git
cd cookie-jar
bun install --frozen-lockfile
bun dev
```

`bun dev` starts Anvil on port 8545, deploys the factory, seeds five demo jars, syncs the client
registry, generates ABI types and starts Next.js on http://localhost:3000. The home page shows
the jar at `NEXT_PUBLIC_FEATURED_JAR_INDEX` (4 = the ERC1155-gated demo jar, the closest
analogue to the Hats-gated stipend jar).

## Development

| Command | What it does |
| --- | --- |
| `bun dev` | Full stack: Anvil + seed deploy + registry sync + Next dev |
| `bun dev:client` | Next dev only |
| `bun dev:stop` | Stop Anvil and the dev server |
| `bun check` | oxlint + Next rules + TypeScript |
| `bun format` / `bun format:check` | Biome (tabs, double quotes) and prettier-plugin-solidity |
| `cd client && bun run test` | Vitest. Never `bun test`: that runs Bun's own runner and ignores the config |
| `bun run test:contracts` | Foundry tests (dev profile, solc 0.8.30) |
| `bun run test:e2e` | Playwright against a running `bun dev` |
| `bun run build:client` | Production build |
| `bun generate` | Regenerate `client/generated.ts` from the compiled ABIs |
| `bun audit --audit-level high` | Dependency advisories, the same gate CI runs |
| `bun sync:deployment -- --chain <id>` | Merge a Foundry broadcast into `client/config/deployments.json` |

Editor: install the Biome extension for formatting and a Solidity extension. ESLint and Prettier
are not used for TypeScript.

Agent guidance lives in [AGENTS.md](AGENTS.md) (the repo contract), [CLAUDE.md](CLAUDE.md) and
`.claude/` (path rules, context, skills and hooks).

## Configuration

Local development needs no configuration. For anything else, copy [example.env](example.env) to
`.env.local` and fill in what you need:

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` and `NEXT_PUBLIC_ALCHEMY_API_KEY` for wallets and RPC
- `NEXT_PUBLIC_FEATURED_JAR_ADDRESS`, `NEXT_PUBLIC_FEATURED_JAR_BLOCK`,
  `NEXT_PUBLIC_DEFAULT_CHAIN_ID` and `NEXT_PUBLIC_SITE_URL` for the jar shown on the home page
- the factory and `CreateJar` inputs used by the deployment commands (see the runbook)

`.env.local` is ignored by git. Mainnet keys never go in it: deployments sign with a Foundry
keystore (`cast wallet import deployer --interactive`).

## Demo jars on Anvil

`contracts/script/DeployLocal.s.sol` seeds five jars that cover every access pattern:

1. Community Stipend: allowlist, ETH, fixed amount, periodic
2. Grants Program: allowlist, ERC20, variable amount, purpose required
3. Cookie Monster Benefits: ERC721-gated, ETH, variable amount
4. Cookie Monster Airdrop: ERC721-gated, ERC20, one-time claim
5. Badge jar: ERC1155-gated (badge #1), variable amount, 28-day interval, purpose required.
   This is the local stand-in for the Hats-gated stipend jar.

### Test accounts

Anvil's well-known accounts, each funded with 1000 ETH. Never use them on a real network.

| Account | Address |
| --- | --- |
| #0 Deployer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| #1 Cookie Monster (holds the NFTs and badge #1) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| #2 Cookie Fan | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| #3 Test User (holds nothing) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

The private keys are the standard Anvil keys (`anvil` prints them on start). Add the network to
your wallet as `http://127.0.0.1:8545`, chain id `31337`.

## Project structure

```
cookie-jar/
├── client/      Next.js 15 App Router (React 18, wagmi 2, viem 2, RainbowKit, shadcn/ui, Tailwind 3)
├── contracts/   Foundry: factory, jar, libraries, scripts, tests, jar metadata (config/jars)
├── e2e/         Playwright specs
├── scripts/     deploy.sh, sync-deployments.ts, dev-start.sh, oz-compat.sh
├── docs/        DEPLOYMENT.md runbook, RELEASES.md
├── lib/         Git submodules (forge-std, openzeppelin-contracts, permit2, ...)
└── .claude/     Agent rules, context, skills and hooks
```

Component notes: [contracts/README.md](contracts/README.md), [client/README.md](client/README.md),
[e2e/README.md](e2e/README.md).

## Deployment

Everything on a real network goes through a Foundry keystore and a dry run first. The full
procedure, parameters and checks for the stipend jar are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In short:

```bash
cast wallet import deployer --interactive     # once, on the machine that signs
bun deploy:arbitrum                           # factory: Deploy.s.sol, verify, sync the registry
DRY_RUN=true bun create-jar:arbitrum          # print the resolved jar config, send nothing
bun create-jar:arbitrum                       # create the jar and assert its config on-chain
```

The client deploys to Vercel from `main`; pull requests target `dev`.

## Troubleshooting

- Ports: the client uses 3000 and Anvil 8545. `bun dev:stop` frees both.
- Contract changes not showing: check `contracts/anvil.log`, rerun `bun dev`, then `bun generate`.
- Registry out of date on Anvil: `bun sync:deployment -- --chain 31337 --script DeployLocal.s.sol`.
- Submodule SSH errors on install: either configure a GitHub SSH key or run
  `git config --global url."https://github.com/".insteadOf git@github.com:` and reinstall.
- `lib/openzeppelin-contracts` shows untracked files after `bun install`: expected, the
  `scripts/oz-compat.sh` shims live there.

## Contributing

1. Branch from `dev` (`git checkout -b feat/short-name`).
2. Make the change with tests: `bun check`, `cd client && bun run test`, `bun run test:contracts`.
3. Use conventional commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`).
4. Open a pull request against `dev`. CI runs quality, unit, contract, e2e, accessibility and
   security checks.

## License

MIT, see [LICENSE](LICENSE).
