---
name: deploy
description: Deploy a Cookie Jar factory or create and fund a jar on a live network, step by step, with read-back checks.
disable-model-invocation: true
argument-hint: "[factory|jar|client|verify] [network]"
---

# Deploy

Runbook-driven. The full runbook with addresses lives in `docs/DEPLOYMENT.md`; this skill walks
it one stage at a time and stops at every step only a human can perform. Mainnet steps are
irreversible: dry-run first, read the plan, then broadcast.

## Stage 0: pre-flight (agent)

- `git status --short` clean apart from the OpenZeppelin shims; on the intended branch.
- `git submodule update --init --recursive && ./scripts/oz-compat.sh`
- `bun check`, `bun run test:contracts`, `cd contracts && forge build --sizes` (factory under
  24,576 bytes).
- `cast wallet list` shows the keystore named in `KEYSTORE_ACCOUNT` (default `deployer`).
  **Human**: import it with `cast wallet import deployer --interactive` if missing.
- `.env.local` carries the inputs listed in `example.env` (`ETHERSCAN_API_KEY`, the `CreateJar`
  variables including `FACTORY_ADDRESS` and `MIN_DEPOSIT`, and the factory variables only when a
  factory is being deployed). Never echo their values.
- `cast balance <deployer> --ether --rpc-url https://arb1.arbitrum.io/rpc` is above 0.005 ETH.
  **Human**: top up if lower.

## Stage 1: gate (human)

For a Hats-gated jar the hat must exist and be minted before the jar is created. **Human**, as
the hat admin, in the Hats app or with `cast send` on `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137`:
`changeHatMaxSupply(hatId, n)` if the supply is 0, then `mintHat(hatId, wearer)` per member.
Agent check: `cast call <hats> 'isWearerOfHat(address,uint256)(bool)' <wearer> <hatId>` for every
wearer and `hatSupply(uint256)(uint32)`.

## Stage 2: factory (only when the chain has no suitable factory)

Arbitrum has one: the Green Goods factory `0x294d222eDE6DF6625B43544F1C634322467528Da`, already
in the client registry. Do not deploy another there. The minimum deposit is set per jar
(`MIN_DEPOSIT`); the factory's `MIN_ERC20_DEPOSIT` is only the default behind the sentinel.
For a new chain, dry run:
`cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url <rpc> --account deployer -vvvv`.
**Human**: `bun deploy:arbitrum` (adds `--broadcast --verify`; password prompt; funds spent).
Agent check: `cast call <factory> 'MIN_ERC20_DEPOSIT()(uint128)'`, `'DEFAULT_FEE_COLLECTOR()(address)'`,
explorer shows Verified (fallback `forge verify-contract --chain 42161 <factory>
src/CookieJarFactory.sol:CookieJarFactory --constructor-args $(cast abi-encode 'constructor(address,address,uint256,uint128,uint128)' ...) --watch`).
Then `bun sync:deployment -- --chain <id>`, `bun generate` if the ABI changed, commit the registry
and broadcast, `bun check && bun run build:client`.

## Stage 3: jar

Set `FACTORY_ADDRESS` and the jar variables in `.env.local` (`ACCESS_TYPE`, `NFT_CONTRACT`,
`NFT_TOKEN_ID`, `MAX_WITHDRAWAL`, `WITHDRAWAL_INTERVAL`, `MIN_DEPOSIT`, `STRICT_PURPOSE`,
`METADATA_FILE`, ...). A fork rehearsal (`anvil --fork-url`, then the script with an Anvil key
and `--broadcast` against the fork) runs the same read-back checks without spending anything.
`DRY_RUN=true bun create-jar:arbitrum` prints the plan; read every line with the user.
**Human**: `DRY_RUN=false bun create-jar:arbitrum`. The script reverts on any read-back mismatch.
Agent check: `cast call <factory> 'getAllJars()(address[])'` contains the jar;
`cast call <jar> 'hasRole(bytes32,address)(bool)' $(cast keccak JAR_OWNER) <owner>` is true;
verify the jar (fallback `forge verify-contract --chain 42161 <jar> src/CookieJar.sol:CookieJar
--guess-constructor-args --watch`). Record the address and creation block.

## Stage 4: funding (human, multi-sig)

Funds only count through `deposit()`. In the Safe Transaction Builder, batch
`approve(jar, amount)` on the token and `deposit(amount)` on the jar. Agent check:
`cast call <jar> 'currencyHeldByJar()(uint256)'` equals the amount.

## Stage 5: smoke test (agent, no signature)

`cast call <jar> 'withdrawWithErc1155(uint256,string)' <amount> "<27+ char note with a linear.app link>"
--from <eligible member> --rpc-url <rpc>` succeeds (use `withdrawAllowlistMode` or
`withdrawWithErc721` for the other access types); the same from a non-member reverts
(`InsufficientNFTBalance` or `NotAuthorized`).

## Stage 6: client (human for Vercel, agent for code)

Vercel env: `NEXT_PUBLIC_FEATURED_JAR_ADDRESS`, `NEXT_PUBLIC_FEATURED_JAR_BLOCK`,
`NEXT_PUBLIC_DEFAULT_CHAIN_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`,
`NEXT_PUBLIC_ALCHEMY_API_KEY`. Merge `dev` into `main` (production branch). Add the domain in the
Vercel project and its DNS record. Agent check: `curl -sI <site>` shows the security headers; the
page renders the jar; a member's first real claim shows in the history.

## Stage 7: records (agent drafts, human posts)

Playbook config table (jar address), Linear issue comment with factory and jar links,
`docs/RELEASES.md` entry, `docs/DEPLOYMENT.md` addresses.

## Rollback levers

`pause()` and `emergencyWithdraw(token, amount)` by the jar owner; a misconfigured jar is
abandoned and re-created (rules are immutable); the registry commit can be reverted to point the
client back at the previous factory.
