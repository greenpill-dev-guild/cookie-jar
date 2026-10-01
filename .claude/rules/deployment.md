---
paths:
  - "contracts/script/**"
  - "scripts/**"
  - "docs/DEPLOYMENT.md"
---
# Deployment rules

1. Mainnet transactions are sent by a human from a Foundry keystore (`--account deployer`).
   Never put a private key in a file, a workflow or a chat. The well-known Anvil key appears
   only in local scripts and CI.
2. Every broadcast has a dry run first: `forge script ... -vvvv` without `--broadcast`, or
   `DRY_RUN=true bun create-jar:arbitrum`. Read the printed plan before sending.
3. After a factory deploy: `bun sync:deployment -- --chain <id>`, commit
   `client/config/deployments.json`, `deployments.auto.ts` and the broadcast, then `bun generate`
   only if the ABI changed. Solidity never writes client files.
4. After a jar creation: let the script's read-back assertions pass, verify the jar on the
   explorer, record the address in the playbook table and Linear, and set
   `NEXT_PUBLIC_FEATURED_JAR_ADDRESS` on Vercel.
5. Fund jars only through `deposit()` (approve first for tokens). A plain token transfer is
   invisible to members.
6. Never rerun a failed broadcast blindly: read the trace, fix, dry-run again.
7. Mark mainnet operations in scripts and PRs with `// I ACKNOWLEDGE MAINNET` next to the command.

Runbook: `docs/DEPLOYMENT.md`. Skill: `/deploy`.
