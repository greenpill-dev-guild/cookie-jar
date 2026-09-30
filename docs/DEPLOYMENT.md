# Deployment runbook: the Green Goods stipend jar on Arbitrum One

The Green Goods stipend uses the separate `stipend/` React/Vite app. Follow [STIPEND-APP.md](STIPEND-APP.md) for its Vercel project, domains and `VITE_*` configuration. The `client/` Next.js app remains the generic Cookie Jar UI.

The procedure for putting the Green Goods contributor stipend jar live at
https://cookies.greengoods.app, written so the next jar can follow the same path. Steps marked
**(human)** need a person with keys, funds or dashboard access. An agent prepares, dry-runs and
checks; it never signs a mainnet transaction.

No factory is deployed for this jar. Arbitrum already has the Green Goods cookie jar factory,
which honours the minimum deposit a caller passes, so the USDC jar is created there.

## Roles and addresses

| Role | Value |
| --- | --- |
| Chain | Arbitrum One, chain id 42161, RPC `https://arb1.arbitrum.io/rpc` |
| Currency | USDC `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (6 decimals) |
| Factory | Green Goods cookie jar factory `0x294d222eDE6DF6625B43544F1C634322467528Da`. Verified on Sourcify; this repo's code plus the minimum-deposit sentinel. Fee collector is the multi-sig, default fee 1% (not applied to this jar), owner `0x49fa954B6C2Cd14B4b3604EF1Cc17cED20a9E42C` (only gates `setAdmin`). Hosts the 33 Green Goods garden and campaign jars and is indexed by the Green Goods indexer. |
| Retired factory | `0xfe367D31d181D305dcF5AAaa345a70A65c345153`. Forces a 1e18 minimum on every ERC20 jar, so it can never host USDC. Its two jars keep working; it is no longer in the client registry. |
| Jar owner | Green Goods Safe on Arbitrum One; exact address must be confirmed by the Safe owners before creation |
| Deployer keystore `deployer` | `0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6` (also wears the Green Goods top hat and owns the Green Goods `CookieJarModule`) |
| Hats Protocol | `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137` |
| Team hat (tree 92, hat 92.1) | `0x0000005c00010000000000000000000000000000000000000000000000000000` |

## Jar parameters

| Field | Value | Why |
| --- | --- | --- |
| `accessType` | ERC1155 with `nftContract` = Hats, `tokenId` = Team hat, `minBalance` = 1 | Membership is managed by minting or toggling the hat, never on the jar |
| `withdrawalOption` | Variable, `maxWithdrawal` = 800 USDC (`800000000`) | Launch maximum; the multi-sig can lower it to 400 USDC after the launch window |
| `withdrawalInterval` | 28 days (`2419200` seconds) | Counted per wearer from their last claim |
| `strictPurpose` | true | Every claim carries a Linear link; the contract enforces 27+ characters |
| `emergencyWithdrawalEnabled` | true | Lets the multi-sig pull funds back |
| `oneTimeWithdrawal`, `maxWithdrawalPerPeriod` | false, 0 | Not used |
| `feePercentageOnDeposit` | 0 | Fee-free. The factory default of 1% only applies when the sentinel `type(uint256).max` is passed |
| `minDeposit` | 1 USDC (`MIN_DEPOSIT=1000000`) | Passed explicitly. The factory default (`MIN_ERC20_DEPOSIT = 1e18`) only applies when the sentinel `type(uint256).max` is passed |
| `metadata` | Editable Green Goods stipend preset in the Vite app | Name, description, image and playbook link shown in the stipend app; the script-only JSON is separate |
| Funding | 4,800 USDC (6 members, 2 months, 400 each) | Only through `deposit()`; a plain transfer is invisible to members |

## Tooling

- `contracts/script/CreateJar.s.sol` creates a jar from the `CreateJar` variables listed in
  `example.env` (including `MIN_DEPOSIT`). `DRY_RUN=true` prints the resolved plan and sends
  nothing. After a broadcast the script reads the jar back and reverts with
  `ConfigMismatch(field)` on any drift.
- `scripts/deploy.sh <network> [Script.s.sol:Contract]` loads `.env.local` (values in the file win
  over the shell environment), signs with the keystore named by `KEYSTORE_ACCOUNT` (default
  `deployer`) and adds `--broadcast --verify`. `bun create-jar:arbitrum` wraps it for this jar.
- `contracts/script/Deploy.s.sol` and `bun deploy:<network>` deploy a factory. Only needed on a
  chain without a usable factory; not on Arbitrum.
- `client/config/deployments.json` already records the Green Goods factory for 42161 at its
  creation block 435607756; `scripts/sync-deployments.ts` regenerates `deployments.auto.ts` from
  it.
- Contract tests for the script: `contracts/test/script/CreateJar.t.sol`.

## Steps

### 1. Pre-flight

```bash
git submodule update --init --recursive && ./scripts/oz-compat.sh
bun check && (cd client && bun run test) && bun run test:stipend && bun run build:stipend && bun run test:contracts
```

For the keystore script path only, confirm the account and gas balance:

```bash
cast wallet list                                                 # shows "deployer"
cast balance 0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6 --ether --rpc-url https://arb1.arbitrum.io/rpc
```

**(human, script path only)** `.env.local` carries `KEYSTORE_ACCOUNT=deployer`, `ETHERSCAN_API_KEY` (an
etherscan.io V2 key covers Arbiscan) and the `CreateJar` values from `example.env`. Top up the
deployer above 0.002 ETH if needed. For the UI path, the human-controlled wallet needs Arbitrum
gas and must review the app's simulation before signing.

### 2. Team hat **(human, signer: the top-hat wearer)**

Collect the six contributor wallets. In the Hats app or with cast, raise the supply and mint:

```bash
HATS=0x3bc1A0Ad72417f2d411118085256fC53CBdDd137
TEAM_HAT=0x0000005c00010000000000000000000000000000000000000000000000000000
RPC=https://arb1.arbitrum.io/rpc
cast send $HATS "changeHatMaxSupply(uint256,uint32)" $TEAM_HAT 10 --account deployer --rpc-url $RPC
cast send $HATS "mintHat(uint256,address)" $TEAM_HAT <wearer> --account deployer --rpc-url $RPC   # once per member
```

Check: `cast call $HATS "isWearerOfHat(address,uint256)(bool)" <wearer> $TEAM_HAT --rpc-url $RPC`
is true for all six and `cast call $HATS "hatSupply(uint256)(uint32)" $TEAM_HAT --rpc-url $RPC`
returns 6.

### 3. Factory check (agent, read-only)

```bash
F=0x294d222eDE6DF6625B43544F1C634322467528Da
cast call $F "DEFAULT_FEE_COLLECTOR()(address)" --rpc-url $RPC   # the multi-sig
cast call $F "getJarCount()(uint256)" --rpc-url $RPC             # 33 before the stipend jar
```

Optional rehearsal on a fork before spending anything:

```bash
anvil --fork-url $RPC --port 8546 --chain-id 42161 &
set -a && source .env.local && set +a && export DRY_RUN=false
cd contracts && forge script script/CreateJar.s.sol:CreateJar --rpc-url http://127.0.0.1:8546 \
  --broadcast --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This fork rehearsal verifies the script path only. The direct UI path uses the form's reviewed
values and its own no-broadcast contract simulation; compare every field to the table above
before the human signs.

### 4. Create the jar **(human, signer: authorized wallet)**

The stipend app's `/create` page offers a Green Goods stipend preset. Select it, enter the
confirmed Green Goods Safe owner address, review USDC amounts, Team hat gate, interval, zero
deposit fee and 1 USDC minimum, then
connect an authorized wallet on Arbitrum One and submit. The app calls the existing factory at
`0x294d222eDE6DF6625B43544F1C634322467528Da` directly. It does not use a Green Goods
protocol workflow or deploy another factory. Record the created jar address `<J>` and its
creation block `<B>` from the transaction receipt.

The script below is an alternative for a human signer who prefers the keystore workflow. It uses
`contracts/config/jars/arbitrum-stipend.json`, whose current metadata differs from the Vite preset;
align that metadata before using the script for this release. Do not create the jar twice.

`.env.local` has `FACTORY_ADDRESS=0x294d222eDE6DF6625B43544F1C634322467528Da`,
`MIN_DEPOSIT=1000000`, the confirmed Green Goods Safe as `JAR_OWNER`, and the other values from
`example.env`. Keep `DRY_RUN=true` and review
the plan:

```bash
bun create-jar:arbitrum
```

Then set `DRY_RUN=false` in `.env.local` and run it again (`// I ACKNOWLEDGE MAINNET`). The
script's read-back assertions must pass. Record the jar address `<J>` and its creation block
`<B>`.

Checks: `cast call $F "getAllJars()(address[])" --rpc-url $RPC` ends with `<J>`;
`cast call <J> "MIN_DEPOSIT()(uint256)" --rpc-url $RPC` returns 1000000;
`cast call <J> "FEE_PERCENTAGE_ON_DEPOSIT()(uint256)" --rpc-url $RPC` returns 0;
`cast call <J> "hasRole(bytes32,address)(bool)" $(cast keccak "JAR_OWNER") <GREEN_GOODS_SAFE> --rpc-url $RPC`
is true; the jar is verified on Arbiscan (fallback:
`forge verify-contract --chain 42161 <J> src/CookieJar.sol:CookieJar --guess-constructor-args --watch`).

### 5. Fund **(human, signers: the multi-sig owners)**

The multi-sig holds no USDC on Arbitrum at the time of writing, so 4,800 USDC has to reach it
first. Then one Safe Transaction Builder batch:

1. `USDC.approve(<J>, 4800000000)`
2. `<J>.deposit(4800000000)`

Check: `cast call <J> "currencyHeldByJar()(uint256)" --rpc-url $RPC` returns 4800000000, and the
fee collector's USDC balance did not change.

### 6. Non-consuming smoke test (no signature)

```bash
cast call <J> "withdrawWithErc1155(uint256,string)" 1000000 "Smoke test https://linear.app/greenpill/issue/PRD-718" --from <hat wearer> --rpc-url $RPC
cast call <J> "withdrawWithErc1155(uint256,string)" 1000000 "Smoke test https://linear.app/greenpill/issue/PRD-718" --from <non-wearer> --rpc-url $RPC
```

The first call succeeds, the second reverts with `InsufficientNFTBalance`. Nothing is sent, so
no wearer burns their 28-day interval before launch.

### 7. Stipend app release **(human: Vercel)**

Use the existing `cookie-jar` Vercel project in team `greenpilldevguild`. Set Root
Directory to `stipend`, enable source files outside that directory, use the Vite framework,
install with `cd .. && bun install --frozen-lockfile --ignore-scripts`, build with
`bun run build`, output `dist`, and use Node 24. The generic `client/` remains in the repository.
[STIPEND-APP.md](STIPEND-APP.md) has the full project settings.

Set these public build-time variables on the **cookie-jar** project for the `main` production branch:

| Variable | Value |
| --- | --- |
| `VITE_FEATURED_JAR_ADDRESS` | `<J>` (the created jar, never the factory) |
| `VITE_FEATURED_JAR_BLOCK` | `<B>` (optional history scan start) |
| `VITE_DEFAULT_CHAIN_ID` | `42161` |
| `VITE_SITE_URL` | `https://cookies.greengoods.app` |
| `VITE_WALLET_CONNECT_PROJECT_ID` | Public WalletConnect project ID from its dashboard |
| `VITE_ALCHEMY_API_KEY` | Optional public Arbitrum RPC key restricted to the site origin |

There is no beta environment or beta domain. These Vite variables are bundled at build time, so rebuild after changing them.
Without a featured jar address, the page intentionally shows “No featured jar configured.”

After the accepted fixes are merged into `dev`, the final QA report passes, and the release is
approved, merge release PR #40 into `main`. Check that the production URL renders `<J>`, that a
wallet on Arbitrum can open Claim, and that the response carries the security headers.

### 8. Domain **(human: Vercel and DNS)**

Assign `cookies.greengoods.app` to the existing `cookie-jar` project's `main` production branch.
Follow the DNS records Vercel shows and verify the assignment before launch. Keep
`cookies.greenpill.app` as a redirect. WalletConnect Verify should show the production origin as allowed.

### 9. First real claim **(human: one hat wearer)**

Claim with a Linear link in the note. The row appears in the history card with an Arbiscan link.
A wallet without the hat sees "You don't wear the Team hat".

### 10. Records

Add `<J>`, the transaction hash and the parameter table to the stipend playbook
(`greenpill-dev-guild/.github`, `routines/scoped-work-compensation.md`), comment on Linear
PRD-718 with the Arbiscan links, and add a `docs/RELEASES.md` entry.

### 11. After the launch window **(human: multi-sig)**

`updateMaxWithdrawalAmount(400000000)` on `<J>`. Roster changes happen in Hats (`mintHat`,
`setHatWearerStatus`), never on the jar.

## Rollback levers

- `pause()` stops claims; `emergencyWithdraw(USDC, currencyHeldByJar())` returns the funds to
  the multi-sig.
- Currency, access type and the withdrawal option are immutable. A misconfigured jar is abandoned
  and re-created; nothing else depends on it.
- The factory only creates jars. The Green Goods garden jars on the same factory are unaffected
  by anything done to the stipend jar.
- Restore the previous `VITE_FEATURED_JAR_ADDRESS` and optional block in the stipend Vercel
  project, then rebuild. This changes which jar the app features; it does not change any jar's
  immutable rules or reverse a transaction.

## Rehearsal on Anvil

`bun dev` seeds a local factory and five jars; jar 5 is ERC1155-gated (badge #1, held by the
Cookie Monster account) and mirrors the stipend jar. The home page shows it by default, the
Cookie Monster account sees the eligible state and can claim, and the Test User account sees the
ineligible state.
