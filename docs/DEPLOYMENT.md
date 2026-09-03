# Deployment runbook: the stipend jar on Arbitrum One

The procedure for putting the Greenpill Dev Guild contributor stipend jar live at
https://cookies.greengoods.app, written so the next jar can follow the same path. Steps marked
**(human)** need a person with keys, funds or dashboard access. An agent prepares, dry-runs and
checks; it never signs a mainnet transaction.

## Roles and addresses

| Role | Value |
| --- | --- |
| Chain | Arbitrum One, chain id 42161, RPC `https://arb1.arbitrum.io/rpc` |
| Currency | USDC `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (6 decimals) |
| Jar owner | Working Capital multi-sig (Safe) `0xe09315A86ED0A39862158f5631b928145987fE05` |
| Deployer keystore `deployer` | `0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6` (also wears the Green Goods top hat) |
| Factory owner | `0x49fa954B6C2Cd14B4b3604EF1Cc17cED20a9E42C` (only gates `setAdmin`) |
| Hats Protocol | `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137` |
| Team hat (tree 92, hat 92.1) | `0x0000005c00010000000000000000000000000000000000000000000000000000` |
| Earlier factories | `0xfe367D31d181D305dcF5AAaa345a70A65c345153` and `0x294d222eDE6DF6625B43544F1C634322467528Da`. Both have `MIN_ERC20_DEPOSIT = 1e18`, so a USDC jar on them can never be funded. They stay in service for their existing jars. |

## Jar parameters

| Field | Value | Why |
| --- | --- | --- |
| `accessType` | ERC1155 with `nftContract` = Hats, `tokenId` = Team hat, `minBalance` = 1 | Membership is managed by minting or toggling the hat, never on the jar |
| `withdrawalOption` | Variable, `maxWithdrawal` = 800 USDC (`800000000`) | The launch window covers July and August; the multi-sig lowers it to 400 USDC afterwards |
| `withdrawalInterval` | 28 days (`2419200` seconds) | Counted per wearer from their last claim |
| `strictPurpose` | true | Every claim carries a Linear link; the contract enforces 27+ characters |
| `emergencyWithdrawalEnabled` | true | Lets the multi-sig pull funds back |
| `oneTimeWithdrawal`, `maxWithdrawalPerPeriod` | false, 0 | Not used |
| `feePercentageOnDeposit` | 0 | Fee-free. The factory default of 1% only applies when the sentinel `type(uint256).max` is passed |
| `minDeposit` | Forced by the factory to 1 USDC (`MIN_ERC20_DEPOSIT = 1000000`) | Immutable on the factory, which is why a new factory is deployed |
| `metadata` | `contracts/config/jars/arbitrum-stipend.json` | Name, description, image and playbook link shown in the client |
| Funding | 4,800 USDC (6 members, 2 months, 400 each) | Only through `deposit()`; a plain transfer is invisible to members |

## Tooling

- `contracts/script/Deploy.s.sol` deploys the factory from `FEE_COLLECTOR`, `FACTORY_OWNER`,
  `FEE_PERCENTAGE`, `MIN_ETH_DEPOSIT` and `MIN_ERC20_DEPOSIT`.
- `contracts/script/CreateJar.s.sol` creates a jar from the `CreateJar` variables listed in
  `example.env`. `DRY_RUN=true` prints the resolved plan and sends nothing. After a broadcast the
  script reads the jar back and reverts with `ConfigMismatch(field)` on any drift.
- `scripts/deploy.sh <network> [Script.s.sol:Contract]` loads `.env.local` (values in the file win
  over the shell environment), signs with the keystore named by `KEYSTORE_ACCOUNT` (default
  `deployer`), adds `--broadcast --verify`, and runs the registry sync after a factory deploy.
- `scripts/sync-deployments.ts` merges a broadcast into `client/config/deployments.json` and
  regenerates `client/config/deployments.auto.ts`.
- Package scripts: `bun deploy:arbitrum`, `bun create-jar:arbitrum`,
  `bun sync:deployment -- --chain 42161`. The `arbitrum-sepolia` variants exist for rehearsals.
- Contract tests for the script: `contracts/test/script/CreateJar.t.sol`.

## Steps

### 1. Pre-flight

```bash
git submodule update --init --recursive && ./scripts/oz-compat.sh
bun check && (cd client && bun run test) && bun run test:contracts
(cd contracts && forge build --sizes | grep CookieJarFactory)   # under 24,576 bytes
cast wallet list                                                 # shows "deployer"
cast balance 0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6 --ether --rpc-url https://arb1.arbitrum.io/rpc
```

**(human)** `.env.local` carries `KEYSTORE_ACCOUNT=deployer`, `ETHERSCAN_API_KEY` (an
etherscan.io V2 key covers Arbiscan) and the factory and `CreateJar` values from `example.env`.
Top up the deployer above 0.005 ETH if needed.

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

### 3. Factory: simulate, then deploy **(human, signer: deployer, funds spent)**

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum --account deployer -vvvv   # no broadcast
cd .. && bun deploy:arbitrum                                                          # I ACKNOWLEDGE MAINNET
```

Check on the new factory `<F>`:

```bash
cast call <F> "MIN_ERC20_DEPOSIT()(uint128)" --rpc-url $RPC        # 1000000
cast call <F> "DEFAULT_FEE_COLLECTOR()(address)" --rpc-url $RPC    # the multi-sig
```

Arbiscan shows the contract as verified. Fallback:
`forge verify-contract --chain 42161 <F> src/CookieJarFactory.sol:CookieJarFactory --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint128,uint128)" <feeCollector> <owner> 100 100000000000000 1000000) --watch`.

### 4. Sync the client registry

```bash
bun sync:deployment -- --chain 42161
bun check && (cd client && bun run build:skip-lint)
```

Commit `client/config/deployments.json`, `client/config/deployments.auto.ts` and the new
`contracts/broadcast/Deploy.s.sol/42161/run-*.json`. The 42220 and 44787 entries must be
untouched and 42161 must point at `<F>`.

### 5. Create the jar **(human, signer: deployer)**

Set `FACTORY_ADDRESS=<F>` in `.env.local`, keep `DRY_RUN=true`, and review the plan:

```bash
bun create-jar:arbitrum
```

Then set `DRY_RUN=false` in `.env.local` and run it again (`// I ACKNOWLEDGE MAINNET`). The script's
read-back assertions must pass. Record the jar address `<J>` and its creation block `<B>`.

Checks: `cast call <F> "getAllJars()(address[])" --rpc-url $RPC` contains `<J>`;
`cast call <J> "hasRole(bytes32,address)(bool)" $(cast keccak "JAR_OWNER") 0xe09315A86ED0A39862158f5631b928145987fE05 --rpc-url $RPC`
is true; the jar is verified on Arbiscan (fallback:
`forge verify-contract --chain 42161 <J> src/CookieJar.sol:CookieJar --guess-constructor-args --watch`).

### 6. Fund **(human, signers: the multi-sig owners)**

The multi-sig holds no USDC on Arbitrum at the time of writing, so 4,800 USDC has to reach it
first. Then one Safe Transaction Builder batch:

1. `USDC.approve(<J>, 4800000000)`
2. `<J>.deposit(4800000000)`

Check: `cast call <J> "currencyHeldByJar()(uint256)" --rpc-url $RPC` returns 4800000000, and the
fee collector's USDC balance did not change.

### 7. Non-consuming smoke test (no signature)

```bash
cast call <J> "withdrawWithErc1155(uint256,string)" 1000000 "Smoke test https://linear.app/greenpill/issue/PRD-718" --from <hat wearer> --rpc-url $RPC
cast call <J> "withdrawWithErc1155(uint256,string)" 1000000 "Smoke test https://linear.app/greenpill/issue/PRD-718" --from <non-wearer> --rpc-url $RPC
```

The first call succeeds, the second reverts with `InsufficientNFTBalance`. Nothing is sent, so
no wearer burns their 28-day interval before launch.

### 8. Client release **(human: Vercel)**

Project `cookie-jar` (team `greenpilldevguild`), production branch `main`. Environment:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FEATURED_JAR_ADDRESS` | `<J>` |
| `NEXT_PUBLIC_FEATURED_JAR_BLOCK` | `<B>` |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | `42161` |
| `NEXT_PUBLIC_SITE_URL` | `https://cookies.greengoods.app` |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `NEXT_PUBLIC_ALCHEMY_API_KEY` | from the provider dashboards |
| `CSP_ENFORCE` | empty until the report-only policy has been reviewed, then `true` |

Merge `dev` into `main`. Check that the production URL renders the jar, that a wallet on Arbitrum
can open the Claim tab, and that the response carries the security headers.

### 9. Domain **(human: Vercel and DNS)**

Add `cookies.greengoods.app` to the project and create the CNAME `cname.vercel-dns.com` on the
`greengoods.app` zone. Keep `cookies.greenpill.app` as a redirect. WalletConnect Verify should
show the new domain as verified.

### 10. First real claim **(human: one hat wearer)**

Claim with a Linear link in the note. The row appears in the history card with an Arbiscan link.
A wallet without the hat sees "You don't wear the Team hat".

### 11. Records

Add `<F>`, `<J>`, the transaction hashes and the parameter table to the stipend playbook
(`greenpill-dev-guild/.github`, `routines/scoped-work-compensation.md`), comment on Linear
PRD-718 with the Arbiscan links, and add a `docs/RELEASES.md` entry.

### 12. After the launch window **(human: multi-sig)**

`updateMaxWithdrawalAmount(400000000)` on `<J>`. Roster changes happen in Hats (`mintHat`,
`setHatWearerStatus`), never on the jar.

## Rollback levers

- `pause()` stops claims; `emergencyWithdraw(USDC, currencyHeldByJar())` returns the funds to
  the multi-sig.
- Currency, access type and the withdrawal option are immutable. A misconfigured jar is abandoned
  and re-created; nothing else depends on it.
- The earlier factories and the Green Goods jars are unaffected by any of this.
- Reverting the registry commit restores the previous client configuration.

## Rehearsal on Anvil

`bun dev` seeds a factory with `MIN_ERC20_DEPOSIT = 1e6` and five jars; jar 5 is ERC1155-gated
(badge #1, held by the Cookie Monster account) and mirrors the stipend jar. With
`NEXT_PUBLIC_FEATURED_JAR_INDEX=4` the home page shows it, the Cookie Monster account sees the
eligible state and can claim, and the Test User account sees the ineligible state.
