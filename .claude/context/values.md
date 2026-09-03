# Values and quality contract

Loaded on demand by the skills. Short, because every skill points here instead of restating it.

## What the guild optimises for

- Contributors get paid for accepted work with as little ceremony as possible. The jar is a
  payment rail, not a product surface: correctness of amounts, gates and records beats polish.
- Work in public, ship small, verify before claiming. A change nobody can verify is not done.
- The repo serves one live jar today and must still serve the next one without a rewrite.

## Implementation quality contract

1. **KISS and YAGNI.** Solve the case in front of you; no abstractions for imagined jars.
2. **Evidence-driven DRY.** Extract only on the third real duplicate; two similar hooks are
   cheaper than one wrong abstraction.
3. **Single level of abstraction** per function: hooks orchestrate, helpers compute, components render.
4. **Clear seams.** Chain reads live in `client/hooks/jar`, pure logic in `client/lib`, UI in
   `client/components`. Contracts never write client files; scripts never hold secrets.
5. **Pattern discipline.** Follow the existing shapes (`useTransactionWithRetry`, batched
   `useReadContracts`, env-driven Foundry scripts) before inventing new ones.
6. **Comments explain why**, never what. Delete commented-out code.
7. **Systemic closure.** A fix to one call site sweeps its siblings (all four withdraw entry points,
   both deposit paths, every chain id map).
8. **Evidence before claims.** Type-check, lint, the relevant test file, and for chain code a read
   from the real contract or Anvil. Quote the command and its output.
9. **Final simplification pass** before shipping: fewer lines, fewer branches, same behaviour.

## Criticality matrix

| Path | Level | Required behaviour |
| --- | --- | --- |
| `contracts/src/**`, `contracts/script/**` | critical | Read every touched line; tests for every branch; size check; dry run before broadcast |
| `client/hooks/jar/**`, `client/lib/jar/**`, `client/config/**` | critical | Wrong chain, wrong function or wrong decimals loses money; verify against Anvil or a live read |
| `client/components/jar/**` | sensitive | Copy tells people what happens to their funds; keep it exact |
| `.github/**`, `scripts/**`, `bunfig.toml`, lockfile | sensitive | Reproducibility and supply chain; explain every version pin |
| everything else | routine | Normal review |

## Escalate to the steward when

- A change alters who can claim, how much, or how often (gates, caps, intervals).
- A dependency upgrade crosses a major version of Next, React, wagmi, viem or Foundry.
- Anything touches the multi-sig, the Hats tree or funds on Arbitrum.
