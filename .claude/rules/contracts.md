---
paths:
  - "contracts/**"
---
# Contract rules (Foundry, Solidity 0.8.30, OpenZeppelin v5)

1. Run forge through the bun wrappers from the repo root: `bun run test:contracts` (dev profile)
   and `bun run build:contracts` (production profile, size-optimised). Both profiles pin solc
   0.8.30, so tests exercise the compiler the factory ships with.
2. `CookieJarFactory` sits at the EIP-170 limit (about 1 KB of headroom). Any change to
   `CookieJar.sol` or its libraries needs `cd contracts && forge build --sizes` under the default
   profile; the CI contract job fails above 24,576 bytes.
3. Section order: imports, types, state, events, errors, modifiers, constructor, external,
   public, internal, private. Custom errors, never `require` strings. Checks-Effects-Interactions
   with `nonReentrant` on every value transfer.
4. Immutables are the jar's rules: `CURRENCY`, `ACCESS_TYPE`, `WITHDRAWAL_OPTION`,
   `STRICT_PURPOSE`, `ONE_TIME_WITHDRAWAL`, `MIN_DEPOSIT` and `FEE_PERCENTAGE_ON_DEPOSIT` cannot
   change after creation. A jar with the wrong rules is abandoned and re-created, never patched.
5. The factory overrides `minDeposit` with `MIN_ETH_DEPOSIT` / `MIN_ERC20_DEPOSIT` and
   `feeCollector` with `DEFAULT_FEE_COLLECTOR`; `feePercentageOnDeposit = type(uint256).max`
   means "factory default" and `0` means no fee. Keep every `createCookieJar` caller
   (`script/CreateJar.s.sol`, `script/DeployLocal.s.sol`, tests) aligned with
   `CookieJarLib.JarConfig`.
6. Scripts read every input from the environment and never write client files; the client
   registry is updated by `bun sync:deployment`. Broadcast only with `--account <keystore>`.
   The Anvil test key appears only in local scripts and CI workflows.
7. NatSpec on every external function. Emit an event for every state change users care
   about (withdrawals currently emit none, which is why the client reconstructs claims from
   token transfers).
8. Tests: `test_Action_Condition`, `test_RevertWhen_...`, `testFuzz_...`. Fuzz arithmetic on
   amounts. `vm.setEnv` is process-global and tests run in parallel, so parse the environment in
   exactly one test and feed structs everywhere else (see `test/script/CreateJar.t.sol`).
9. Formatting is `bun format:contracts` (prettier-plugin-solidity); `forge lint` stays clean apart
   from the known `block.timestamp` notes.

Deep reference: `.claude/context/architecture.md` (contracts section) and `docs/DEPLOYMENT.md`.
