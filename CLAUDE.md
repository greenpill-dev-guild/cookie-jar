# Cookie Jar: Claude Code notes

Read `AGENTS.md` first (the agent-neutral contract), then the rule file for the path you are
editing. This file only lists the Claude-specific entry points and the agreements that are easy
to forget.

## Entry points

- `.claude/rules/*.md` attach by path glob: `frontend.md` (client), `contracts.md`, `testing.md`,
  `deployment.md`.
- `.claude/context/values.md` is the quality contract and criticality matrix every skill points
  at; `.claude/context/architecture.md` is the codebase map.
- `.claude/skills/`: `/review`, `/ship`, `/audit` and `/deploy` are user-invoked; `tdd`, `debug`
  and `research` fire on their own when the task fits.
- `docs/DEPLOYMENT.md` is the runbook for the live stipend jar.
- `.claude/launch.json` starts the dev stack for the browser pane (`cookie-jar` = Anvil + seed
  deploy + Next on port 3000).
- `.claude/settings.json` wires the hooks in `.claude/scripts/`: a Bash guard (blocks `bun test`,
  dotenv reads and shared-branch rewrites, asks before mainnet commands) and Biome formatting on
  every edit.

## Commands that matter

`bun check` (lint + type-check), `bun format:check`, `cd client && bun run test` (never
`bun test`), `bun run test:contracts`, `cd client && bun run build:skip-lint`, `bun dev`,
`bun audit --audit-level high`, `bun sync:deployment -- --chain <id>`.

## Working agreements

- Verify before claiming: quote the command and its last lines. "Should work" is not evidence.
- Stay on the current branch, never rewrite `main` or `dev`, and end commits with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Anything that moves funds, changes who can claim, or touches the multi-sig or the Hats tree
  needs the user's explicit go-ahead in the same turn, after a dry run.
- Keep responses short: outcome first, evidence second, next step last. No em dashes.
